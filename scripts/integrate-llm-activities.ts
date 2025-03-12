/**
 * Main script to fully integrate LLM-generated activities with the shop interface.
 * This runs all the necessary scripts in sequence to ensure proper integration.
 */

import { spawn } from 'child_process';

// Path to the scripts for integrating LLM activities
const scripts = [
  'scripts/fix-llm-activities.ts',
  'scripts/sync-search-keywords.ts'
];

// Function to run a script using tsx
function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${scriptPath} ===\n`);
    
    const child = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== Successfully completed ${scriptPath} ===\n`);
        resolve();
      } else {
        console.error(`\n=== Script ${scriptPath} failed with code ${code} ===\n`);
        reject(new Error(`Script ${scriptPath} failed with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      console.error(`\n=== Error executing ${scriptPath}: ${err.message} ===\n`);
      reject(err);
    });
  });
}

// Main function to run all scripts in sequence
async function integrateAllLLMActivities() {
  console.log('Starting integration of LLM-generated activities with shop interface...');
  
  try {
    // Run each script in sequence
    for (const script of scripts) {
      await runScript(script);
    }
    
    console.log('\n✅ Successfully completed all LLM activity integration scripts!');
    console.log('LLM-generated activities should now be properly searchable in the shop interface.');
  } catch (error) {
    console.error('\n❌ Integration process failed:', error);
  }
}

// Run the integration
integrateAllLLMActivities()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error during integration:', error);
    process.exit(1);
  });