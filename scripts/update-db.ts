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
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "../server/db";
import * as schema from "../shared/schema";

// Initialize drizzle
const db = drizzle(pool, { schema });

async function main() {
  console.log("Starting database migration...");
  
  try {
    // Create books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Created books table");

    // Create book_activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_activities (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(book_id, activity_id)
      );
    `);
    console.log("Created book_activities table");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  await pool.end();
}

main();
