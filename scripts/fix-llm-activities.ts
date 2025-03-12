/**
 * Main script to fix and integrate LLM-generated activities with the shop-activities page
 */

import { default as syncLLMActivities } from './sync-llm-activities.js';
import { default as normalizeActivities } from './normalize-llm-activities.js';

async function fixLLMActivities() {
  console.log('========================================');
  console.log('FIXING LLM ACTIVITIES INTEGRATION');
  console.log('========================================');
  
  try {
    // Step 1: Run diagnostics on the LLM activities
    console.log('\n[STEP 1] Running diagnostics on LLM activities...');
    await syncLLMActivities();
    
    // Step 2: Normalize any activities that need fixing
    console.log('\n[STEP 2] Normalizing activities...');
    await normalizeActivities();
    
    console.log('\n========================================');
    console.log('PROCESS COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('\nLLM-generated activities have been fixed and should now be properly searchable in the shop-activities page.');
    console.log('Changes made:');
    console.log('- Added descriptions to LLM-generated activities');
    console.log('- Ensured all activities have consistent formatting');
    console.log('- Made activities searchable in the shop-activities interface');
    console.log('\nPlease refresh the page to see the changes.');
  } catch (error) {
    console.error('\n========================================');
    console.error('ERROR DURING FIX PROCESS');
    console.error('========================================');
    console.error('An error occurred while fixing LLM activities:', error);
  }
}

// Run the function when file is executed directly
fixLLMActivities().then(() => {
  console.log('Script execution completed');
}).catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});

export default fixLLMActivities;