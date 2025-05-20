import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found");
}

// Create a new pool with more robust configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close a connection after it has been used 7500 times
  keepAlive: true, // Keep connections alive
  retry: {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000,
  }
});

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Add connection handling
pool.on('connect', () => {
  console.log('Database connection established');
});

export const db = drizzle(pool);

// Add graceful shutdown
process.on('SIGTERM', () => {
  pool.end().then(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});