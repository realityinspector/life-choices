// A simple script to run Jest tests in watch mode
import { execSync } from 'child_process';

try {
  console.log('Running tests in watch mode...');
  execSync('npx jest --watch', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}