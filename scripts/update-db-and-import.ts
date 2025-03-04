import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

async function updateDbAndImport() {
  console.log('Starting database schema update...');
  
  try {
    // Run drizzle-kit push to update the schema
    const { stdout: pushStdout, stderr: pushStderr } = await execPromise('npx drizzle-kit push');
    console.log('Database schema update output:', pushStdout);
    if (pushStderr) {
      console.error('Database schema update errors:', pushStderr);
    }
    
    console.log('Database schema updated successfully.');
    
    // Run the import script
    console.log('Starting life events import...');
    
    // We need to use require here because we're using TypeScript with ESM
    const importScriptPath = path.join(process.cwd(), 'scripts', 'import-life-events.ts');
    
    const { stdout: importStdout, stderr: importStderr } = await execPromise(`npx tsx ${importScriptPath}`);
    console.log('Import script output:', importStdout);
    if (importStderr) {
      console.error('Import script errors:', importStderr);
    }
    
    console.log('Life events imported successfully.');
  } catch (error) {
    console.error('Error during database update and import:', error);
    process.exit(1);
  }
}

// Run the script
updateDbAndImport()
  .then(() => {
    console.log('Database update and import completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update database and import life events:', error);
    process.exit(1);
  });