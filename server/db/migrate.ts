import { pool } from '../db';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('Starting migrations...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations(); 