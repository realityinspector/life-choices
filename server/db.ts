import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

// Create a PostgreSQL pool using CommonJS-style import
const { Pool } = pkg;

// Configure the PostgreSQL pool with enhanced connection settings
// Configure the PostgreSQL pool with enhanced settings for Neon's pooler
const databaseUrl = process.env.DATABASE_URL;
const poolUrl = databaseUrl?.replace('.us-east-2', '-pooler.us-east-2');

export const pool = new Pool({
  connectionString: poolUrl,
  max: 5, // Reduce max connections to prevent overwhelming the pooler
  idleTimeoutMillis: 30000, // Lower idle timeout for serverless environment
  connectionTimeoutMillis: 8000, // Shorter connection timeout
  maxUses: 1000, // Recycle connections more frequently
  keepAlive: true,
  keepAliveInitialDelayMillis: 8000,
  ssl: {
    rejectUnauthorized: false
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