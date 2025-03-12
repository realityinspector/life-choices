import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { Activity, ActivityInsert, InsertActivityImage } from "../../shared/schema";

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
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const adminLLMRouter = Router();

// Middleware to require authentication
const requireAuth = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (isAuthenticated(req)) {
    // Check if the user is an admin
    if (req.user?.isAdmin) {
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
  } catch (error) {
    console.error("Error fetching activity images:", error);
    res.status(500).json({ error: "Failed to fetch activity images" });
  }
});

// Upload image file(s)
adminLLMRouter.post("/upload", upload.array("images", 50), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFiles = req.files.map((file: any) => ({
      filename: file.filename,
      originalFilename: file.originalname,
      path: file.path,
      mimeType: file.mimetype
    }));

    res.json({ 
      message: "Files uploaded successfully", 
      files: uploadedFiles 
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// Generate activity from image filename
adminLLMRouter.post("/generate-activity", async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, originalFilename } = req.body;
    
    if (!originalFilename) {
      return res.status(400).json({ error: "Original filename is required" });
    }

    // Generate activity using Together AI
    const activityData = await togetherAIService.generateActivityFromFilename(originalFilename);
    
    if (!activityData) {
      return res.status(500).json({ error: "Failed to generate activity data" });
    }

    res.json({ 
      message: "Activity generated successfully", 
      activity: activityData
    });
  } catch (error) {
    console.error("Error generating activity:", error);
    res.status(500).json({ error: "Failed to generate activity" });
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
    const activityWithUser: ActivityInsert & { userId: number, nextDue: Date } = {
      ...activity,
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
  } catch (error) {
    console.error("Error creating activity with image:", error);
    res.status(500).json({ error: "Failed to create activity with image" });
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
        const activityWithUser: ActivityInsert & { userId: number, nextDue: Date } = {
          ...activityData,
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
      } catch (error) {
        console.error(`Error processing image ${images[i].originalFilename}:`, error);
        results.push({
          originalFilename: images[i].originalFilename,
          status: "failed",
          error: "Failed to create activity or associate image"
        });
      }
    }

    res.json({ 
      message: `Batch processing completed. ${results.filter(r => r.status === "success").length}/${results.length} successful.`, 
      results 
    });
  } catch (error) {
    console.error("Error in batch processing:", error);
    res.status(500).json({ error: "Failed to complete batch processing" });
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
  } catch (error) {
    console.error("Error fetching unprocessed images:", error);
    res.status(500).json({ error: "Failed to fetch unprocessed images" });
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
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});