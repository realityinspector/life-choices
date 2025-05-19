import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

// Create a PostgreSQL pool using CommonJS-style import
const { Pool } = pkg;

// Configure the PostgreSQL pool with enhanced connection settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduce max connections to avoid overwhelming the database
  idleTimeoutMillis: 60000, // Keep idle clients for longer
  connectionTimeoutMillis: 20000, // Give more time to establish connection
  maxUses: 5000, // Lower max uses to recycle connections more frequently
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // Increase initial delay
  ssl: {
    rejectUnauthorized: false // Required for some PostgreSQL providers
  }
});

// Setup error handling for the connection pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the process, but log the error
});

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema });

// Function to check if database connection is alive
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}