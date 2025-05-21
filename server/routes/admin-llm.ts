import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { Activity, ActivityInsert, InsertActivityImage } from "../../shared/schema";
import { parse } from 'csv-parse';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    name: string;
    age: number;
    lifeExpectancy: number;
    sleepHours: number;
    [key: string]: any;
  };
}

function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated && req.isAuthenticated() && !!req.user;
}

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const dir = "./uploads";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate a more robust unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.") as any);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // Increased to 20MB per file
    fieldSize: 20 * 1024 * 1024, // Also increase field size limit
  },
});

// Configure multer for CSV upload
const csvUpload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export const adminLLMRouter = Router();

// Middleware to require authentication
const requireAuth = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (isAuthenticated(req)) {
    // Get username from request user object
    const username = req.user && typeof req.user === 'object' ? 
                    (req.user as {username?: string}).username || '' : '';

    // List of admin usernames - this should match the list in routes.ts
    const adminUsers = [
  'realityinspector',
  'admin1',
  'admin2',
  'superadmin'
];

    if (adminUsers.includes(username)) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Apply the auth middleware to all routes
adminLLMRouter.use(requireAuth);

// Get list of all images
adminLLMRouter.get("/images", async (req: AuthenticatedRequest, res) => {
  try {
    const images = await storage.getActivityImages();
    res.json(images);
  } catch (err: unknown) {
    console.error("Error fetching activity images:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to fetch activity images",
      details: errorMessage
    });
  }
});

// Upload image file(s) - support for large batches of images
adminLLMRouter.post("/upload", upload.array("images", 500), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    console.log(`Successfully uploaded ${req.files.length} files`);

    const uploadedFiles = req.files.map((file: any) => ({
      filename: file.filename,
      originalFilename: file.originalname,
      path: file.path,
      mimeType: file.mimetype
    }));

    res.json({ 
      message: `Files uploaded successfully (${req.files.length} files)`, 
      files: uploadedFiles 
    });
  } catch (err: unknown) {
    console.error("Error uploading files:", err);

    // Handle specific Multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: "One or more files exceed the maximum file size (20MB per file)"
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({ 
          error: "Too many files uploaded at once. Maximum file count is 500."
        });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: "Unexpected field name. Make sure the field name is 'images'."
        });
      }
    }

    // Default error handling
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: "Failed to upload files", 
      details: errorMessage 
    });
  }
});

// Generate activity from image filename
adminLLMRouter.post("/generate-activity", async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, originalFilename } = req.body;
    console.log("LLM Activity Generation Request:", { filename, originalFilename });

    if (!originalFilename) {
      console.log("LLM Generation Error: Original filename missing");
      return res.status(400).json({ error: "Original filename is required" });
    }

    // Generate activity using Together AI
    const activityData = await togetherAIService.generateActivityFromFilename(originalFilename);

    console.log("LLM Response for", filename + ":", activityData);

      // Validate required fields
      if (!activityData || !activityData.name || !activityData.category) {
        return res.status(400).json({
          error: "Invalid activity data from LLM",
          details: "Missing required fields in LLM response",
          received: activityData
        });
      }

      // Add imageData to response for saving later
      // Create activity with all required fields
      const activity = {
        ...activityData,
        frequency: activityData.frequency || 1,
        frequencyUnit: activityData.frequencyUnit || "week",
        duration: activityData.duration || 30,
        durationUnit: activityData.durationUnit || "minute",
        lifeImpact: activityData.lifeImpact || 5,
        priority: activityData.priority || 3,
        exportToCalendar: false,
        clusterId: null,
        userId: req.user!.id,
      };

      // Create the activity in the database
      const createdActivity = await storage.createActivity(activity);

      // Associate image with new activity
      const imageData = {
        activityId: createdActivity.id,
        filename,
        originalFilename,
        path: `uploads/${filename}`,
        mimeType: 'image/jpeg'
      };

      const savedImage = await storage.createActivityImage(imageData);

      res.json({ 
        message: "Activity generated and image associated successfully", 
        activity: createdActivity,
        image: savedImage
      });
  } catch (err: unknown) {
    console.error("Error generating activity:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to generate activity",
      details: errorMessage 
    });
  }
});

// Create activity from generated data and associate image
adminLLMRouter.post("/create-activity-with-image", async (req: AuthenticatedRequest, res) => {
  try {
    const { activity, imageData } = req.body;

    if (!activity || !imageData) {
      return res.status(400).json({ error: "Activity and image data are required" });
    }

    // Add user ID and current date as next due date
    // Remove any ID property if it exists to avoid primary key conflicts
    const { id, ...activityWithoutId } = activity as any;

    const activityWithUser: ActivityInsert & { userId: number, nextDue: Date } = {
      ...activityWithoutId,
      userId: req.user!.id,
      nextDue: new Date(),
    };

    // Create the activity
    const createdActivity = await storage.createActivity(activityWithUser);
    console.log("Created activity:", createdActivity);

    // Associate image with the new activity
    const { filename, originalFilename, path, mimeType } = imageData;

    if (filename && originalFilename && path && mimeType) {
      const imageAssociation: InsertActivityImage = {
        activityId: createdActivity.id,
        filename,
        originalFilename,
        path,
        mimeType
      };

      const savedImage = await storage.createActivityImage(imageAssociation);
      console.log("Saved image association:", savedImage);
    }

    res.json({ 
      message: "Activity created and image associated successfully", 
      activity: createdActivity
    });
  } catch (err: unknown) {
    console.error("Error creating activity with image:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to create activity with image",
      details: errorMessage
    });
  }
});

// Process multiple images in batch
adminLLMRouter.post("/batch-process", async (req: AuthenticatedRequest, res) => {
  try {
    const { images, batchSize = 1 } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided for batch processing" });
    }

    const results = [];
    const filenames = images.map(img => img.originalFilename);

    // Generate activities in batches
    const generatedActivities = await togetherAIService.generateActivitiesFromFilenames(filenames, batchSize);

    // Create activities and associate images
    for (let i = 0; i < images.length; i++) {
      const activityData = generatedActivities[i];
      if (!activityData) {
        results.push({
          originalFilename: images[i].originalFilename,
          status: "failed",
          error: "Failed to generate activity data"
        });
        continue;
      }

      try {
        // Add user ID and current date as next due date
        // Remove any ID property if it exists to avoid primary key conflicts
        const { id, ...activityWithoutId } = activityData as any;

        const activityWithUser: ActivityInsert & { userId: number, nextDue: Date } = {
          ...activityWithoutId,
          userId: req.user!.id,
          nextDue: new Date(),
        };

        // Create the activity
        const createdActivity = await storage.createActivity(activityWithUser);

        // Associate image with the new activity
        const { filename, originalFilename, path, mimeType } = images[i];

        if (filename && originalFilename && path && mimeType) {
          const imageAssociation: InsertActivityImage = {
            activityId: createdActivity.id,
            filename,
            originalFilename,
            path,
            mimeType
          };

          await storage.createActivityImage(imageAssociation);
        }

        results.push({
          originalFilename: images[i].originalFilename,
          status: "success",
          activity: createdActivity
        });
      } catch (err: unknown) {
        console.error(`Error processing image ${images[i].originalFilename}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          originalFilename: images[i].originalFilename,
          status: "failed",
          error: `Failed to create activity or associate image: ${errorMessage}`
        });
      }
    }

    res.json({ 
      message: `Batch processing completed. ${results.filter(r => r.status === "success").length}/${results.length} successful.`, 
      results 
    });
  } catch (err: unknown) {
    console.error("Error in batch processing:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to complete batch processing",
      details: errorMessage
    });
  }
});

// Get a list of all files in the uploads directory that aren't associated with activities
adminLLMRouter.get("/unprocessed-images", async (req: AuthenticatedRequest, res) => {
  try {
    // Get all images from the database
    const associatedImages = await storage.getActivityImages();
    const associatedFilenames = new Set(associatedImages.map(img => img.filename));

    // This is a placeholder since we're not reading the filesystem directly
    // A real implementation would check the uploads directory and filter out associated images

    res.json({ 
      message: "Unprocessed images fetched successfully", 
      unprocessedImages: [] // This would be populated with actual data
    });
  } catch (err: unknown) {
    console.error("Error fetching unprocessed images:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to fetch unprocessed images",
      details: errorMessage
    });
  }
});

// Generate an image for an activity that doesn't have one
adminLLMRouter.post("/generate-image", async (req: AuthenticatedRequest, res) => {
  try {
    const { activityId } = req.body;
    console.log("\n=== LLM Image Generation Request ===");
    console.log("Request Body:", req.body);
    console.log("Activity ID:", activityId);
    console.log("Activity ID Type:", typeof activityId);

    if (!activityId) {
      console.log("ERROR: No activity ID provided in request");
      return res.status(400).json({ error: "Activity ID is required" });
    }

    // Ensure activityId is a number and handle potential string input
    const parsedId = typeof activityId === 'string' ? parseInt(activityId, 10) : activityId;

    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid activity ID format" });
    }

    // Get all activities from storage
    console.log("Attempting to find activity...");
    const allActivities = await storage.getActivities();
    console.log("Total activities in database:", allActivities.length);
    
    // Try exact ID match first
    let activity = allActivities.find(a => a.id === parsedId);
    
    if (!activity) {
      console.log("Activity not found by ID, checking all activities...");
      
      // Log the first few activities for debugging
      console.log("First few activities:", allActivities.slice(0, 3).map(a => ({id: a.id, name: a.name})));
      
      // Log the requested ID for comparison
      console.log("Requested ID:", parsedId);
    }
    
    console.log("Lookup result:", activity ? `Found: ${activity.name} (ID: ${activity.id})` : "Not found");
    
    if (!activity) {
      console.log("ERROR: Activity not found in lookup attempt");
      return res.status(404).json({ error: "Activity not found" });
    }

    // Check if the activity already has images
    const existingImages = await storage.getActivityImages(activity.id);
    if (existingImages.length > 0) {
      return res.status(400).json({ 
        error: "Activity already has images", 
        imageCount: existingImages.length 
      });
    }

    // Convert Activity to ActivityInsert format
    const activityInsert: ActivityInsert = {
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit as "day" | "week" | "month" | "year",
      duration: activity.duration,
      durationUnit: activity.durationUnit as "minute" | "hour",
      lifeImpact: activity.lifeImpact,
      color: activity.color,
      priority: activity.priority,
      emoji: activity.emoji,
      exportToCalendar: activity.exportToCalendar,
      clusterId: activity.clusterId
    };

    // Generate an image for the activity
    const imageData = await togetherAIService.generateImageForActivity(activityInsert);
    if (!imageData) {
      return res.status(500).json({ error: "Failed to generate image for activity" });
    }

    // Associate the image with the activity
    const imageAssociation: InsertActivityImage = {
      activityId: activity.id,
      filename: imageData.filename,
      originalFilename: imageData.originalFilename,
      path: imageData.path,
      mimeType: imageData.mimeType
    };

    const savedImage = await storage.createActivityImage(imageAssociation);
    console.log("Saved generated image association:", savedImage);

    res.json({
      message: "Image generated and associated successfully",
      activity,
      image: savedImage
    });
  } catch (err: unknown) {
    console.error("Error generating image for activity:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to generate image for activity",
      details: errorMessage
    });
  }
});

// Generate images for activities without images - one at a time
adminLLMRouter.post("/generate-missing-images", async (req: AuthenticatedRequest, res) => {
  try {
    // Get all activities with images
    const activitiesWithImages = await storage.getActivitiesWithImages();
    const activitiesWithImagesIds = new Set(activitiesWithImages.map(img => img.activityId));

    // Get all activities
    const allActivities = await storage.getActivities();

    // Find activities without images
    const activitiesWithoutImages = allActivities.filter(activity => 
      !activitiesWithImagesIds.has(activity.id)
    );

    if (activitiesWithoutImages.length === 0) {
      return res.json({ 
        message: "No activities without images found",
        count: 0
      });
    }

    const results = [];

    for (const activity of activitiesWithoutImages) {
      try {
        console.log(`Generating image for activity: ${activity.name} (ID: ${activity.id})`);

        // Convert Activity to ActivityInsert format
        const activityInsert: ActivityInsert = {
          name: activity.name,
          category: activity.category,
          frequency: activity.frequency,
          frequencyUnit: activity.frequencyUnit as "day" | "week" | "month" | "year",
          duration: activity.duration,
          durationUnit: activity.durationUnit as "minute" | "hour",
          lifeImpact: activity.lifeImpact,
          color: activity.color,
          priority: activity.priority,
          emoji: activity.emoji,
          exportToCalendar: activity.exportToCalendar,
          clusterId: activity.clusterId
        };

        // Generate an image for the activity
        const imageData = await togetherAIService.generateImageForActivity(activityInsert);
        if (!imageData) {
          results.push({
            success: false,
            activity: activity.name,
            error: "Failed to generate image"
          });
          continue;
        }

        // Associate the image with the activity
        const imageAssociation: InsertActivityImage = {
          activityId: activity.id,
          filename: imageData.filename,
          originalFilename: imageData.originalFilename,
          path: imageData.path,
          mimeType: imageData.mimeType
        };

        const savedImage = await storage.createActivityImage(imageAssociation);
        console.log(`Image generated and associated with activity: ${activity.name} (ID: ${activity.id})`);

        results.push({
          success: true,
          activity: activity.name,
          image: savedImage.filename
        });

      } catch (error) {
        console.error(`Error processing activity ${activity.name}:`, error);
        results.push({
          success: false,
          activity: activity.name,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    res.json({
      message: `Processed ${results.length} activities`,
      results,
      completed: results.length,
      total: activitiesWithoutImages.length
    });
  } catch (err: unknown) {
    console.error("Error generating image:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to generate image",
      details: errorMessage
    });
  }
});

// Delete an image association (and optionally the activity)
adminLLMRouter.delete("/image/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const deleteActivity = req.query.deleteActivity === "true";

    if (isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    const image = await storage.getActivityImage(imageId);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // If requested, delete the associated activity first
    if (deleteActivity && image.activityId) {
      await storage.deleteActivity(image.activityId);
    }

    // Delete the image association
    await storage.deleteActivityImage(imageId);

    res.json({ 
      message: "Image deleted successfully",
      activityDeleted: deleteActivity && !!image.activityId
    });
  } catch (err: unknown) {
    console.error("Error deleting image:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to delete image",
      details: errorMessage
    });
  }
});

// Import activities from CSV
adminLLMRouter.post("/import-csv", csvUpload.single('csv'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  const results: { activityName: string; status: 'success' | 'failed'; error?: string; activity?: any }[] = [];
  const parser = parse({ columns: true, skip_empty_lines: true });

  try {
    // Read and parse CSV file
    const records: { activity_name: string; activity_description: string }[] = [];
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
      parser.write(fileContent);
      parser.end();
    });

    console.log(`Starting to process ${records.length} records`);

    // Process each record with retries
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`Processing record ${i + 1}/${records.length}: ${record.activity_name}`);

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Generate activity for ${record.activity_name} - Attempt ${attempt}/3`);

          // Generate activity details using Together AI
          const activityResponse = await togetherAIService.generateActivityFromFilename(record.activity_name);

          if (!activityResponse) {
            throw new Error("Failed to generate activity details");
          }

          console.log(`Generate image for ${record.activity_name} - Attempt ${attempt}/3`);

          // Generate image using Together AI with timeout
          const imagePromise = togetherAIService.generateImageForActivity(activityResponse);
          const imageResponse = await Promise.race([
            imagePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Image generation timeout")), 60000))
          ]);

          if (!imageResponse) {
            throw new Error("Failed to generate activity image");
          }

          // Create activity with user ID
          const activityWithUser: ActivityInsert & { userId: number, nextDue: Date } = {
            ...activityResponse,
            userId: req.user!.id,
            nextDue: new Date(),
          };

          // Save activity
          const createdActivity = await storage.createActivity(activityWithUser);
          console.log(`Activity created: ${createdActivity.name} (ID: ${createdActivity.id})`);

          // Associate image
          const imageAssociation: InsertActivityImage = {
            activityId: createdActivity.id,
            filename: imageResponse.filename,
            originalFilename: imageResponse.originalFilename,
            path: imageResponse.path,
            mimeType: imageResponse.mimeType
          };

          await storage.createActivityImage(imageAssociation);
          console.log(`Image associated with activity: ${imageResponse.filename}`);

          results.push({
            activityName: record.activity_name,
            status: 'success',
            activity: createdActivity
          });

          // Success - break retry loop
          break;
        } catch (error) {
          console.error(`Error processing record ${record.activity_name} (Attempt ${attempt}/3):`, error);
          if (attempt === 3) {
            results.push({
              activityName: record.activity_name,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 8000));
          }
        }
      }

      // Send progress update
      if ((i + 1) % 5 === 0 || i === records.length - 1) {
        console.log(`Progress: ${i + 1}/${records.length} records processed`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: `Processed ${results.length} records`,
      results 
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ 
      error: "Failed to process CSV file",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});