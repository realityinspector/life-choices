// A script to run Jest tests with coverage reporting
import { execSync } from 'child_process';

try {
  console.log('Running tests with coverage reporting...');
  // Use node with experimental modules flag to support ESM and suppress warnings
  execSync('NODE_OPTIONS="--experimental-vm-modules --no-warnings" npx jest --coverage', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}