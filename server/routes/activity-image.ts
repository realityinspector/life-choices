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
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { activityId } = z.object({
      activityId: z.number(),
    }).parse(req.body);

    // Check if activity exists and belongs to user
    const [activity] = await db.select().from(activities).where(
      and(
        eq(activities.id, activityId),
        eq(activities.userId, req.user!.id)
      )
    );

    if (!activity) {
      // Delete uploaded file if activity not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Activity not found" });
    }

    const [newImage] = await db.insert(activityImages).values({
      activityId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
    }).returning();

    res.status(201).json(newImage);
  } catch (error) {
    console.error("Error uploading image:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
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
    const filePath = path.join(process.cwd(), image.path.replace("/uploads/", "uploads/"));
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