import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function updateDbSchema() {
  console.log('Starting database schema update...');

  try {
    // Run drizzle-kit push to update the schema
    const { stdout, stderr } = await execPromise('npx drizzle-kit push');
    console.log('Database schema update output:', stdout);

    if (stderr) {
      console.error('Database schema update errors:', stderr);
    }

    console.log('Database schema updated successfully.');
  } catch (error) {
    console.error('Error during database schema update:', error);
    process.exit(1);
  }
}

// Run the script
updateDbSchema()
  .then(() => {
    console.log('Database schema update completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update database schema:', error);
    process.exit(1);
  });