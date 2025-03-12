import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

// Create a PostgreSQL pool using CommonJS-style import
const { Pool } = pkg;

// Configure the PostgreSQL pool with enhanced connection settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  maxUses: 7500, // Recycle connections after 7500 queries
  keepAlive: true, // Keep-alive connection to prevent network issues
  keepAliveInitialDelayMillis: 1000 // Initial delay for keep-alive 
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