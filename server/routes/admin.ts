import { Router, Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Together } from "together-ai";
import { ActivityImage, InsertActivityImage } from "../../shared/schema";

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
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 50, // Increase maximum number of files per upload
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

// Apply auth middleware to all admin routes
adminRouter.use(requireAuth);

// Get all activities for dropdown selection - separate from user's activities
adminRouter.get("/activities", async (req: AuthenticatedRequest, res) => {
  try {
    // Get all activities for all users
    const activities = await storage.getActivities();
    console.log("Admin activities fetch:", activities.length, "activities found");
    res.json(activities);
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

    // Get all activities for context
    const activities = await storage.getActivities();
    const activityNames = activities.map(a => a.name);
    
    if (activityNames.length === 0) {
      console.log("Warning: No activities found to match against");
      return res.json({
        filename,
        suggestedMatch: "No match",
        activityId: null
      });
    }
    
    console.log(`Found ${activityNames.length} activities for matching`);

    // Extract likely words from filename
    // Remove extension, convert camelCase/PascalCase to spaces, replace underscores and dashes
    const processedFilename = filename
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Convert camelCase to spaces
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Convert PascalCase to spaces
      .replace(/[_-]/g, " "); // Replace underscores and dashes with spaces
      
    console.log("Processed filename for matching:", processedFilename);

    // Use Together AI to suggest matching
    try {
      console.log("Sending request to Together AI...");
      
      const response = await together.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert assistant that matches image filenames to activity names. You understand naming conventions and can find meaningful connections between descriptive filenames and activity names, even when they're not exact matches. Use semantic meaning to find the best activity for each image."
          },
          {
            role: "user",
            content: `I need to match this image filename to one of our existing activities.
            
Filename: ${processedFilename}

Available activities:
${JSON.stringify(activityNames, null, 2)}

Which activity does this image filename best match? Consider word variations, synonyms, and related concepts when making your match. If multiple matches are possible, select the one with the highest confidence. If no good match exists (below 50% confidence), respond with exactly "No match".

IMPORTANT: Return ONLY the exact activity name from the list or "No match". Do not include any explanations or additional text.`
          }
        ],
        model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
        temperature: 0.2, // Slightly higher to allow for more creative matching
        max_tokens: 100, // Limit response length to ensure we just get the activity name
      });

      console.log("Together AI response received:", response.choices?.[0]?.message?.content);

      // Extract the suggested match
      const suggestedMatch = response.choices && 
                            response.choices.length > 0 && 
                            response.choices[0].message && 
                            response.choices[0].message.content 
                              ? response.choices[0].message.content.trim() 
                              : "No match";
      
      // Check if suggested match exactly matches one of our activities
      const exactMatchActivity = activities.find(a => a.name === suggestedMatch);
      
      // If not exact match, try to find the best partial match
      let matchedActivity = exactMatchActivity;
      if (!matchedActivity && suggestedMatch !== "No match") {
        console.log("No exact match found. Trying to find a partial match for:", suggestedMatch);
        
        // If the model returned something that's not "No match" but doesn't match exactly,
        // try to find the closest activity by simple string similarity
        const closestActivity = activities.reduce((closest, activity) => {
          // Simple string containment check
          const activityNameLower = activity.name.toLowerCase();
          const suggestedMatchLower = suggestedMatch.toLowerCase();
          
          if (
            activityNameLower.includes(suggestedMatchLower) || 
            suggestedMatchLower.includes(activityNameLower)
          ) {
            return activity;
          }
          
          return closest;
        }, null);
        
        matchedActivity = closestActivity;
      }
      
      const result = {
        filename,
        suggestedMatch,
        activityId: matchedActivity?.id || null
      };
      
      console.log("Match result:", result);
      res.json(result);
      
    } catch (togetherError) {
      console.error("Together AI API error:", togetherError);
      
      // Fallback to simple partial matching if API fails
      const words = processedFilename.toLowerCase().split(/\s+/);
      let bestMatch = null;
      let bestMatchScore = 0;
      
      for (const activity of activities) {
        const activityName = activity.name.toLowerCase();
        // Count how many words from the filename appear in the activity name
        const matchingWords = words.filter(word => 
          word.length > 2 && activityName.includes(word)
        );
        
        if (matchingWords.length > bestMatchScore) {
          bestMatchScore = matchingWords.length;
          bestMatch = activity;
        }
      }
      
      // Return the result with the best match if we have one
      if (bestMatch && bestMatchScore > 0) {
        console.log("Using fallback matching, found:", bestMatch.name);
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
  } catch (error) {
    console.error("Error suggesting match:", error);
    res.status(500).json({ error: "Failed to suggest match", details: error.message });
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
    for (const assoc of associations) {
      const { activityId, filename, originalFilename, path, mimeType } = assoc;
      
      if (!activityId || !filename || !originalFilename || !path || !mimeType) {
        continue; // Skip invalid entries
      }

      const imageData: InsertActivityImage = {
        activityId,
        filename,
        originalFilename,
        path,
        mimeType
      };

      const savedImage = await storage.createActivityImage(imageData);
      results.push(savedImage);
    }

    res.json({ 
      message: `Successfully associated ${results.length} images with activities`,
      results
    });
  } catch (error) {
    console.error("Error in batch association:", error);
    res.status(500).json({ error: "Failed to associate images with activities" });
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