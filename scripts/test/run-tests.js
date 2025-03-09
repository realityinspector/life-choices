// A simple script to run Jest tests
import { execSync } from 'child_process';

try {
  console.log('Running tests...');
  // Use node with experimental modules flag to support ESM
  execSync('NODE_OPTIONS=--experimental-vm-modules npx jest', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}