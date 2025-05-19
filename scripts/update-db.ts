import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function updateDb() {
  try {
    console.log("Creating activity_images table if it doesn't exist...");
    
    // Create activity_images table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activity_images (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log("Making userId nullable in activities table...");
    
    // Make userId nullable in activities table
    await db.execute(sql`
      ALTER TABLE activities 
      ALTER COLUMN user_id DROP NOT NULL;
    `);
    
    console.log("Database updated successfully");
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating database:", error);
    process.exit(1);
  }
}

updateDb();