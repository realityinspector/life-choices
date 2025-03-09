// A simple script to run Jest tests
import { execSync } from 'child_process';

try {
  console.log('Running tests...');
  execSync('npx jest', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
}