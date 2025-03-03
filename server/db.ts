import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "@shared/schema";

// Create a PostgreSQL pool using CommonJS-style import
const { Pool } = pkg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema });