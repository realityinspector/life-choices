// A script to run Jest tests in watch mode
import { execSync } from 'child_process';

try {
  console.log('Running tests in watch mode...');
  // Use node with experimental modules flag to support ESM
  execSync('NODE_OPTIONS=--experimental-vm-modules npx jest --watch', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}