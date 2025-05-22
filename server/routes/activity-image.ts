import { Router } from "express";
import { db } from "../db";
import { activityImages, activities } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const activityImageRouter = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the uploads directory exists
    const uploadDir = path.join(process.cwd(), "uploads");
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Created uploads directory at ${uploadDir}`);
      }
      
      // Log upload attempt
      console.log(`Attempting to upload file to ${uploadDir}`);
      
      // Ensure directory is writable
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log(`Upload directory ${uploadDir} is writable`);
      
      cb(null, uploadDir);
    } catch (error) {
      console.error(`Error accessing uploads directory: ${error}`);
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload activity image
activityImageRouter.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    console.log("Activity image upload request received");
    
    if (!req.file) {
      console.error("No file uploaded in request");
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    console.log(`File uploaded: ${req.file.filename}`);
    console.log(`Request body:`, req.body);

    // Parse activityId as number
    const parsedBody = z.object({
      activityId: z.coerce.number(),
    }).safeParse(req.body);

    if (!parsedBody.success) {
      console.error("Invalid request body:", parsedBody.error);
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    const { activityId } = parsedBody.data;
    console.log(`Validated activityId: ${activityId}`);

    // Check if activity exists and belongs to user
    console.log(`Checking if activity ${activityId} belongs to user ${req.user!.id}`);
    const [activity] = await db.select().from(activities).where(
      and(
        eq(activities.id, activityId),
        eq(activities.userId, req.user!.id)
      )
    );

    if (!activity) {
      console.error(`Activity not found or doesn't belong to user: ${activityId}`);
      // Delete uploaded file if activity not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Activity not found" });
    }

    // Get the base URL from the request
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const imagePath = `/uploads/${req.file.filename}`;
    const fullImageUrl = `${baseUrl}${imagePath}`;

    console.log(`Activity found, inserting image record for ${req.file.filename}`);
    console.log(`Image URL will be: ${fullImageUrl}`);
    
    // Get existing images for this activity
    const existingImages = await db.select().from(activityImages).where(eq(activityImages.activityId, activityId));
    console.log(`Found ${existingImages.length} existing images for activity ${activityId}`);
    
    // Delete all existing images from filesystem and database
    for (const image of existingImages) {
      try {
        // Delete file from filesystem
        const filePath = path.join(process.cwd(), "uploads", image.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted existing image file: ${filePath}`);
        }
        
        // Delete from database
        await db.delete(activityImages).where(eq(activityImages.id, image.id));
        console.log(`Deleted image record ID: ${image.id}`);
      } catch (deleteError) {
        console.error(`Error deleting existing image: ${deleteError}`);
        // Continue with other deletions even if one fails
      }
    }
    
    // Insert the new image
    const [newImage] = await db.insert(activityImages).values({
      activityId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      path: imagePath,
      mimeType: req.file.mimetype,
    }).returning();

    // Add the full URL to the response
    const response = {
      ...newImage,
      fullUrl: fullImageUrl
    };

    console.log(`Image record created: ${newImage.id}`);
    res.status(201).json(response);
  } catch (error) {
    console.error("Error uploading image:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Deleted file ${req.file.path} after error`);
      } catch (deleteError) {
        console.error(`Error deleting file after upload error: ${deleteError}`);
      }
    }
    res.status(500).json({ message: "Failed to upload image" });
  }
});

// Get activity images
activityImageRouter.get("/activity/:activityId", auth, async (req, res) => {
  try {
    const { activityId } = z.object({
      activityId: z.string(),
    }).parse(req.params);

    const images = await db.query.activityImages.findMany({
      where: eq(activityImages.activityId, parseInt(activityId)),
    });

    res.json(images);
  } catch (error) {
    console.error("Error fetching activity images:", error);
    res.status(500).json({ message: "Failed to fetch activity images" });
  }
});

// Delete activity image
activityImageRouter.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = z.object({
      id: z.string(),
    }).parse(req.params);

    // Get image details
    const [image] = await db.select().from(activityImages).where(eq(activityImages.id, parseInt(id)));

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Check if activity belongs to user
    const [activity] = await db.select().from(activities).where(
      and(
        eq(activities.id, image.activityId),
        eq(activities.userId, req.user!.id)
      )
    );

    if (!activity) {
      return res.status(403).json({ message: "Not authorized to delete this image" });
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), "uploads", image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await db.delete(activityImages).where(eq(activityImages.id, parseInt(id)));

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
});

export default activityImageRouter; 