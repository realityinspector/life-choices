import { Router, Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Together } from "together-ai";
import { ActivityImage, InsertActivityImage, Activity } from "../../shared/schema";
import { importActivities } from "../../scripts/import-activities";
import { db } from "../db";
import { activities } from "../../shared/schema";

// Set up storage for uploaded files
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 50, // Maximum number of files per upload
    fieldSize: 50 * 1024 * 1024 // Max field size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Setup Together AI client
const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY
});

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
  return req.isAuthenticated();
}

export const adminRouter = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Generate activity description using LLM
adminRouter.post("/generate-description", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const prompt = `Generate activity details for the image filename: "${filename}"\n\nRespond with a JSON object that matches this schema exactly.`;

    const response = await client.chat.completions.create({
      model: "mistral/mixtral-8x7b-instruct",
      messages: [
        {
          role: "system",
          content: "You are an AI that generates structured activity data. Output only valid JSON matching the required schema."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            frequency: { type: "number" },
            frequencyUnit: { type: "string", enum: ["day", "week", "month", "year"] },
            duration: { type: "number" },
            durationUnit: { type: "string", enum: ["minute", "hour"] },
            lifeImpact: { type: "number" },
            exportToCalendar: { type: "boolean" },
            emoji: { type: "string" },
            motivator: { type: "string" }
          },
          required: ["name", "category", "frequency", "frequencyUnit", "duration", "durationUnit", "lifeImpact"]
        }
      }
    });

    const activityData = JSON.parse(response.choices[0].message.content);

    // Create the activity
    const activity = await storage.createActivity({
      ...activityData,
      userId: req.user!.id,
      nextDue: new Date(),
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    });

    res.json({ activity });
  } catch (error) {
    console.error("Error generating description:", error);
    res.status(500).json({ error: "Failed to generate description" });
  }
});

// Apply auth middleware to all admin routes
adminRouter.use(requireAuth);

// Get all activities for dropdown selection - separate from user's activities
adminRouter.get("/activities", async (req: AuthenticatedRequest, res) => {
  try {
    // Get all activities from database, ordered by ID
    const dbActivities = await db.select()
      .from(activities)
      .orderBy(activities.id);

    console.log("Admin activities fetch:", dbActivities.length, "activities found (samples excluded)");

    res.json(dbActivities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// Get all activity images
adminRouter.get("/activity-images", async (req: AuthenticatedRequest, res) => {
  try {
    const images = await storage.getActivityImages();
    res.json(images);
  } catch (error) {
    console.error("Error fetching activity images:", error);
    res.status(500).json({ error: "Failed to fetch activity images" });
  }
});

// Process a filename with Together AI to suggest matching activities
adminRouter.post("/suggest-match", async (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    console.log("Starting AI matching for filename:", filename);

    // Get all activities from database
    const dbActivities = await storage.getActivities();

    // Combine both sets of activities
    const activities = [...dbActivities];
    const activityNames = activities.map(a => a.name);

    if (activityNames.length === 0) {
      console.log("Warning: No activities found to match against");
      return res.json({
        filename,
        suggestedMatch: "No match",
        activityId: null
      });
    }

    console.log(`Found ${activityNames.length} activities for matching (${dbActivities.length} from DB)`);

    // Extract likely words from filename
    // Remove extension, convert camelCase/PascalCase to spaces, replace underscores and dashes
    const processedFilename = filename
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Convert camelCase to spaces
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Convert PascalCase to spaces
      .replace(/[_-]/g, " "); // Replace underscores and dashes with spaces

    console.log("Processed filename for matching:", processedFilename);

    // Simplified approach - just one API call with clear instructions
    try {
      console.log("Sending request to Together AI...");

      const response = await together.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an AI that matches image filenames to activity names. Your task is to determine the most appropriate activity match based on the filename. The filenames typically describe images of people performing various activities. You should return ONLY the exact activity name that matches best, or 'No match'. Do not add explanations or any other text."
          },
          {
            role: "user",
            content: `Match this image filename to ONE of these activities:

Image filename: ${processedFilename}

Available activities:
${activityNames.join("\n")}

The image likely depicts someone performing the activity. Consider what the filename might be describing visually.

IMPORTANT RULES:
1. Return ONLY the exact activity name from the list
2. If no good match exists (below 50% confidence), respond with exactly: No match
3. Do not modify or abbreviate the activity name
4. Do not add any explanations or additional text`
          }
        ],
        model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
        temperature: 0.1, // Lower temperature for more predictable outputs
        max_tokens: 50, // Limit response length
      });

      // Get the raw response
      const rawSuggestion = response.choices?.[0]?.message?.content?.trim() || "No match";
      console.log("Raw Together AI response:", rawSuggestion);

      // Clean up the response to handle cases where the model adds extra text
      let suggestedMatch = "No match";

      // Try to find an exact match first
      for (const activityName of activityNames) {
        if (rawSuggestion === activityName) {
          suggestedMatch = activityName;
          break;
        }
      }

      // If no exact match, check if any activity name is contained in the response
      if (suggestedMatch === "No match" && rawSuggestion !== "No match") {
        for (const activityName of activityNames) {
          if (rawSuggestion.includes(activityName)) {
            suggestedMatch = activityName;
            break;
          }
        }
      }

      // Find the activity that matches
      const matchedActivity = activities.find(a => a.name === suggestedMatch);

      const result = {
        filename,
        suggestedMatch,
        activityId: matchedActivity?.id || null
      };

      console.log("Final match result:", result);
      res.json(result);

    } catch (togetherError) {
      console.error("Together AI API error:", togetherError);

      // Fallback to simple keyword matching if API fails
      console.log("Using fallback keyword matching...");
      const words = processedFilename.toLowerCase().split(/\s+/);
      let bestMatch = null;
      let bestMatchScore = 0;

      for (const activity of activities) {
        const activityName = activity.name.toLowerCase();
        // Count how many words from the filename appear in the activity name
        const matchingWords = words.filter((word: string) => 
          word.length > 2 && activityName.includes(word)
        );

        if (matchingWords.length > bestMatchScore) {
          bestMatchScore = matchingWords.length;
          bestMatch = activity;
        }
      }

      // Return the result with the best match if we have one
      if (bestMatch && bestMatchScore > 0) {
        console.log("Fallback match found:", bestMatch.name, "with score", bestMatchScore);
        res.json({
          filename,
          suggestedMatch: bestMatch.name,
          activityId: bestMatch.id
        });
      } else {
        console.log("No match found using fallback matching");
        res.json({
          filename,
          suggestedMatch: "No match",
          activityId: null
        });
      }
    }
  } catch (error: any) {
    console.error("Error suggesting match:", error);
    res.status(500).json({ error: "Failed to suggest match", details: error?.message || "Unknown error" });
  }
});

// Upload image file(s)
adminRouter.post("/upload", upload.array("images", 50), async (req: AuthenticatedRequest, res) => {
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

// Associate image with activity
adminRouter.post("/associate-image", async (req: AuthenticatedRequest, res) => {
  try {
    const { activityId, filename, originalFilename, path, mimeType } = req.body;

    if (!activityId || !filename || !originalFilename || !path || !mimeType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const imageData: InsertActivityImage = {
      activityId,
      filename,
      originalFilename,
      path,
      mimeType
    };

    const savedImage = await storage.createActivityImage(imageData);
    res.json(savedImage);
  } catch (error) {
    console.error("Error associating image:", error);
    res.status(500).json({ error: "Failed to associate image with activity" });
  }
});

// Batch associate multiple images with activities
adminRouter.post("/batch-associate", async (req: AuthenticatedRequest, res) => {
  try {
    const { associations } = req.body;

    if (!associations || !Array.isArray(associations)) {
      return res.status(400).json({ error: "No associations provided" });
    }

    const results = [];
    const errors = [];

    for (const assoc of associations) {
      const { activityId, filename, originalFilename, path, mimeType } = assoc;

      if (!activityId || !filename || !originalFilename || !path || !mimeType) {
        errors.push({ filename, error: "Missing required fields" });
        continue;
      }

      // Verify activity exists before creating association
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        errors.push({ filename, error: `Activity ID ${activityId} not found` });
        continue;
      }

      try {
        const imageData: InsertActivityImage = {
          activityId,
          filename,
          originalFilename,
          path,
          mimeType
        };

        const savedImage = await storage.createActivityImage(imageData);
        results.push(savedImage);
      } catch (err) {
        errors.push({ filename, error: "Failed to save image association" });
      }
    }

    res.json({ 
      message: `Successfully associated ${results.length} images with activities`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error in batch association:", error);
    res.status(500).json({ 
      error: "Failed to associate images with activities",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete activity image
adminRouter.delete("/activity-image/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }

    await storage.deleteActivityImage(imageId);
    res.json({ message: "Activity image deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity image:", error);
    res.status(500).json({ error: "Failed to delete activity image" });
  }
});

// Import activities from CSV file
adminRouter.post("/import-activities", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.id;
    console.log(`Starting import of activities from CSV for user ${userId}...`);

    const importCount = await importActivities(userId);

    console.log(`Successfully imported ${importCount} activities for user ${userId}`);
    res.json({ 
      message: `Successfully imported ${importCount} activities`,
      count: importCount
    });
  } catch (error) {
    console.error("Error importing activities from CSV:", error);
    res.status(500).json({ error: "Failed to import activities from CSV", details: error });
  }
});

// Get single activity
adminRouter.get('/activities/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    // Get both activity and its images
    const activity = await storage.getActivity(id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const images = await storage.getActivityImages(id);
    
    // Return combined data
    res.json({
      activity,
      images
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: "Failed to fetch activity" });
  }
});

// Delete activity  
adminRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    // Handle regular database activity
    const activity = await storage.getActivity(id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    await storage.deleteActivity(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ message: "Failed to delete activity" });
  }
});