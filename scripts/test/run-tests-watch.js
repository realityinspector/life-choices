// A script to run Jest tests in watch mode
import { execSync } from 'child_process';

try {
  console.log('Running tests in watch mode...');
  // Use node with experimental modules flag to support ESM and suppress warnings
  execSync('NODE_OPTIONS="--experimental-vm-modules --no-warnings" npx jest --watch', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}