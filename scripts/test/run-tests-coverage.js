// A simple script to run Jest tests with coverage
import { execSync } from 'child_process';

try {
  console.log('Running tests with coverage...');
  execSync('npx jest --coverage', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}