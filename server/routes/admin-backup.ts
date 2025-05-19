import { Router, Request, Response } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { DB_SCHEMAS } from "@shared/db-schemas";
import { pool } from "../db";

// Types
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
  return req.isAuthenticated?.() || false;
}

// Setup temporary directory for backups
const backupDir = path.join(process.cwd(), "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Setup for restore uploads
const restoreStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backupDir);
  },
  filename: (req, file, cb) => {
    // Use a timestamp to avoid overwrites, but keep the original extension
    const timestamp = Date.now();
    cb(null, `restore_${timestamp}${path.extname(file.originalname)}`);
  },
});

// Configure multer for handling backup file uploads
const upload = multer({
  storage: restoreStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size for backups
  },
});

export const adminBackupRouter = Router();

// Middleware to check if user is authenticated and is admin
const requireAdminAuth = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (!isAuthenticated(req) || !req.user) {
    console.log('Auth failed - not authenticated:', { 
      isAuthenticated: isAuthenticated(req),
      user: req.user 
    });
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Check if user is admin (all users with ID 1 are considered admins in this app)
  if (req.user.id !== 1) {
    console.log('Auth failed - not admin:', { userId: req.user.id });
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

// Apply admin auth middleware to all backup routes
adminBackupRouter.use(requireAdminAuth);

// Create a database backup
adminBackupRouter.get("/backup", async (req: AuthenticatedRequest, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `backup_${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Get database connection info
    const dbUrl = process.env.DATABASE_URL || '';
    const dbPort = process.env.PGPORT || '5432';
    const dbHost = process.env.PGHOST || 'localhost';
    const dbName = process.env.PGDATABASE || 'postgres';
    const dbUser = process.env.PGUSER || 'postgres';
    
    // Create temporary SQL dump file
    const dumpFilename = `dump_${timestamp}.sql`;
    const dumpPath = path.join(backupDir, dumpFilename);
    
    console.log(`Creating database dump at ${dumpPath}...`);
    
    // Generate SQL dump with pg_dump
    execSync(`pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${dumpPath}`);
    
    console.log(`Database dump created successfully. Creating tarball with images...`);
    
    // Get uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads");
    
    // Create a tarball with the SQL dump and uploads directory
    if (fs.existsSync(uploadsDir)) {
      execSync(`tar -czf ${backupPath} -C ${backupDir} ${dumpFilename} -C ${process.cwd()} uploads`);
    } else {
      execSync(`tar -czf ${backupPath} -C ${backupDir} ${dumpFilename}`);
      console.log("Warning: uploads directory not found, backup only includes database dump");
    }
    
    // Remove the temporary SQL dump
    fs.unlinkSync(dumpPath);
    
    console.log(`Backup created at ${backupPath}`);
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${backupFilename}`);
    res.setHeader('Content-Type', 'application/gzip');
    
    // Stream the file to the client
    const fileStream = fs.createReadStream(backupPath);
    fileStream.pipe(res);
    
    // Delete the backup file after sending
    fileStream.on('close', () => {
      try {
        fs.unlinkSync(backupPath);
        console.log(`Temporary backup file ${backupPath} deleted`);
      } catch (error) {
        console.error("Failed to delete temporary backup file:", error);
      }
    });
    
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ 
      error: "Failed to create backup",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Restore from backup
adminBackupRouter.post("/restore", upload.single('backupFile'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No backup file uploaded" });
    }
    
    const backupFilePath = req.file.path;
    let sqlDumpPath: string;
    let extractDir: string | null = null;
    
    // Check if this is a SQL file or tar.gz backup
    if (backupFilePath.endsWith('.sql')) {
      console.log('Processing SQL file restore...');
      sqlDumpPath = backupFilePath;
    } else {
      console.log(`Extracting backup from ${backupFilePath}...`);
      extractDir = path.join(backupDir, `restore_${Date.now()}`);
      
      // Create extraction directory
      fs.mkdirSync(extractDir, { recursive: true });
      
      // Extract the tarball
      execSync(`tar -xzf ${backupFilePath} -C ${extractDir}`);
      
      // Find the SQL dump file
      const files = fs.readdirSync(extractDir);
      const sqlDumpFile = files.find(file => file.startsWith('dump_') && file.endsWith('.sql'));
      
      if (!sqlDumpFile) {
        throw new Error("SQL dump file not found in backup");
      }
      
      sqlDumpPath = path.join(extractDir, sqlDumpFile);
    }
    
    // Get database connection info
    const dbPort = process.env.PGPORT || '5432';
    const dbHost = process.env.PGHOST || 'localhost';
    const dbName = process.env.PGDATABASE || 'postgres';
    const dbUser = process.env.PGUSER || 'postgres';
    
    console.log(`Restoring database from ${sqlDumpPath}...`);
    
    // Drop all existing tables (if they exist)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Disable triggers temporarily to avoid foreign key constraint issues
      await client.query('SET session_replication_role = replica');
      
      // Drop all existing tables in the database
      for (const table of DB_SCHEMAS) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
          console.log(`Dropped table: ${table}`);
        } catch (err) {
          console.error(`Error dropping table ${table}:`, err);
          // Continue even if there are errors dropping tables
        }
      }
      
      // Restore the database from the SQL dump
      const restoreCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${sqlDumpPath}`;
      execSync(restoreCmd);
      
      // Re-enable triggers
      await client.query('SET session_replication_role = DEFAULT');
      
      await client.query('COMMIT');
      console.log("Database restored successfully");
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
    // Restore uploads directory if it exists in the backup
    const uploadsSrc = path.join(extractDir, 'uploads');
    const uploadsDest = path.join(process.cwd(), 'uploads');
    
    if (fs.existsSync(uploadsSrc)) {
      console.log(`Restoring uploaded files from ${uploadsSrc} to ${uploadsDest}...`);
      
      // Remove existing uploads directory
      if (fs.existsSync(uploadsDest)) {
        execSync(`rm -rf ${uploadsDest}`);
      }
      
      // Move the uploads directory from the extracted backup to the correct location
      execSync(`mv ${uploadsSrc} ${uploadsDest}`);
      console.log("Uploaded files restored successfully");
    } else {
      console.log("No uploads directory found in backup");
    }
    
    // Clean up temporary files
    if (extractDir) {
      execSync(`rm -rf ${extractDir}`);
    }
    fs.unlinkSync(backupFilePath);
    
    res.json({ message: "Backup restored successfully" });
  } catch (error) {
    console.error("Error restoring backup:", error);
    res.status(500).json({ 
      error: "Failed to restore backup",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get list of available backups (not downloadable backups, but info about previous backups)
adminBackupRouter.get("/backup-history", async (req: AuthenticatedRequest, res) => {
  try {
    // This is a placeholder - in a production system, you'd likely store backup history in the database
    // Since we don't store backup history, return empty array or create a mock history
    res.json({ 
      message: "Backup history",
      history: [],
      note: "Backups are not stored on the server. When you create a backup, it is immediately downloaded to your device."
    });
  } catch (error) {
    console.error("Error fetching backup history:", error);
    res.status(500).json({ error: "Failed to fetch backup history" });
  }
});

// Delete a specific backup (admin feature)
adminBackupRouter.delete("/backup/:filename", async (req: AuthenticatedRequest, res) => {
  try {
    // This is a placeholder - in the current implementation backups aren't stored
    res.status(404).json({ 
      error: "Backup not found",
      message: "Backups are not stored on the server. They are immediately downloaded to your device when created."
    });
  } catch (error) {
    console.error("Error deleting backup:", error);
    res.status(500).json({ error: "Failed to delete backup" });
  }
});