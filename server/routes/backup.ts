import { Router } from "express";
import { db } from "../db";
import { activities, activityImages, books, bookActivities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import fs from "fs";
import path from "path";

const backupRouter = Router();

// Create backup
backupRouter.post("/", auth, async (req, res) => {
  try {
    // Get user's activities
    const userActivities = await db.query.activities.findMany({
      where: eq(activities.userId, req.user!.id),
    });

    // Get user's books
    const userBooks = await db.query.books.findMany({
      where: eq(books.userId, req.user!.id),
    });

    // Get book activities
    const bookActivitiesList = await db.query.bookActivities.findMany({
      where: eq(bookActivities.bookId, userBooks.map(b => b.id)),
    });

    // Get activity images
    const activityImagesList = await db.query.activityImages.findMany({
      where: eq(activityImages.activityId, userActivities.map(a => a.id)),
    });

    // Create backup object
    const backup = {
      activities: userActivities,
      books: userBooks,
      bookActivities: bookActivitiesList,
      activityImages: activityImagesList,
      timestamp: new Date().toISOString(),
    };

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup to file
    const filename = `backup_${req.user!.id}_${Date.now()}.json`;
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

    res.json({
      message: "Backup created successfully",
      filename,
      timestamp: backup.timestamp,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ message: "Failed to create backup" });
  }
});

// Restore backup
backupRouter.post("/restore", auth, async (req, res) => {
  try {
    const { filename } = z.object({
      filename: z.string(),
    }).parse(req.body);

    const filePath = path.join(process.cwd(), "backups", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Read and parse backup file
    const backup = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Start a transaction
    await db.transaction(async (tx) => {
      // Restore activities
      for (const activity of backup.activities) {
        await tx.insert(activities).values({
          ...activity,
          userId: req.user!.id,
        });
      }

      // Restore books
      for (const book of backup.books) {
        await tx.insert(books).values({
          ...book,
          userId: req.user!.id,
        });
      }

      // Restore book activities
      for (const bookActivity of backup.bookActivities) {
        await tx.insert(bookActivities).values(bookActivity);
      }

      // Restore activity images
      for (const image of backup.activityImages) {
        await tx.insert(activityImages).values(image);
      }
    });

    res.json({ message: "Backup restored successfully" });
  } catch (error) {
    console.error("Error restoring backup:", error);
    res.status(500).json({ message: "Failed to restore backup" });
  }
});

// List backups
backupRouter.get("/", auth, async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith(`backup_${req.user!.id}_`))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return {
          filename: file,
          timestamp: content.timestamp,
          size: stats.size,
          activities: content.activities.length,
          books: content.books.length,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(files);
  } catch (error) {
    console.error("Error listing backups:", error);
    res.status(500).json({ message: "Failed to list backups" });
  }
});

// Delete backup
backupRouter.delete("/:filename", auth, async (req, res) => {
  try {
    const { filename } = z.object({
      filename: z.string(),
    }).parse(req.params);

    const filePath = path.join(process.cwd(), "backups", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Verify the backup belongs to the user
    if (!filename.startsWith(`backup_${req.user!.id}_`)) {
      return res.status(403).json({ message: "Not authorized to delete this backup" });
    }

    fs.unlinkSync(filePath);
    res.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Error deleting backup:", error);
    res.status(500).json({ message: "Failed to delete backup" });
  }
});

export default backupRouter; 