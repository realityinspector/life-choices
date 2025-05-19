import { Router } from "express";
import { db } from "../db";
import { activities } from "@shared/schema";
import { z } from "zod";
import { auth } from "../auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";

const csvImportRouter = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "csv");
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
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Import activities from CSV
csvImportRouter.post("/activities", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read and parse CSV file
    const fileContent = fs.readFileSync(req.file.path, "utf-8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Validate CSV structure
    const requiredFields = ["name", "category", "frequency", "frequencyUnit", "duration", "durationUnit", "lifeImpact", "color"];
    const firstRecord = records[0];
    if (!firstRecord) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    const missingFields = requiredFields.filter(field => !(field in firstRecord));
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "CSV file is missing required fields",
        missingFields,
      });
    }

    // Validate and transform records
    const activitiesToInsert = records.map((record: any) => ({
      userId: req.user!.id,
      name: record.name,
      category: record.category,
      frequency: parseInt(record.frequency),
      frequencyUnit: record.frequencyUnit,
      duration: parseInt(record.duration),
      durationUnit: record.durationUnit,
      lifeImpact: parseFloat(record.lifeImpact),
      color: record.color,
      priority: parseInt(record.priority) || 1,
      emoji: record.emoji,
    }));

    // Insert activities
    const insertedActivities = await db.insert(activities)
      .values(activitiesToInsert)
      .returning();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Activities imported successfully",
      count: insertedActivities.length,
      activities: insertedActivities,
    });
  } catch (error) {
    console.error("Error importing activities:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to import activities" });
  }
});

// Get CSV template
csvImportRouter.get("/template", auth, (req, res) => {
  try {
    const template = [
      "name,category,frequency,frequencyUnit,duration,durationUnit,lifeImpact,color,priority,emoji",
      "Morning Run,Exercise,1,day,30,minute,0.8,#4CAF50,1,🏃",
      "Meditation,Wellness,1,day,15,minute,0.9,#9C27B0,2,🧘",
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=activities_template.csv");
    res.send(template);
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ message: "Failed to generate template" });
  }
});

export default csvImportRouter; 