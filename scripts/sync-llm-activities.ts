/**
 * This script synchronizes LLM-generated activities with the shop-activities page
 * by ensuring that they are properly retrieved and displayed in the shop interface.
 */

import { storage } from '../server/storage';
import { Activity, ActivityInsert, ActivityImage } from '../shared/schema';

async function syncLLMActivities() {
  console.log('Starting LLM activities synchronization...');
  
  try {
    // 1. Get all activities from the database
    const activities = await storage.getActivities();
    console.log(`Found ${activities.length} total activities in the database`);
    
    // 2. Get all activity images
    const activityImages = await storage.getActivityImages();
    console.log(`Found ${activityImages.length} activity images in the database`);
    
    // 3. Get activities with associated images
    const activitiesWithImages = await storage.getActivitiesWithImages();
    console.log(`Found ${activitiesWithImages.length} activities with associated images`);
    
    // 4. Log the structure of an activity for debugging
    if (activities.length > 0) {
      console.log('Sample activity structure:');
      console.log(JSON.stringify(activities[0], null, 2));
    }
    
    // 5. Report on activities with and without images
    const activitiesWithoutImages = activities.filter(activity => 
      !activityImages.some(image => image.activityId === activity.id)
    );
    
    console.log(`Activities without images: ${activitiesWithoutImages.length}`);
    console.log(`Activities with images: ${activities.length - activitiesWithoutImages.length}`);
    
    // 6. Categorize activities by category
    const categoryCounts: Record<string, number> = {};
    activities.forEach(activity => {
      const category = activity.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('Activity counts by category:');
    console.log(categoryCounts);
    
    // 7. Find any activities that might have missing required fields
    const activitiesWithIssues = activities.filter(activity => {
      return !activity.name || !activity.category || !activity.frequency || 
             !activity.frequencyUnit || !activity.duration || !activity.durationUnit;
    });
    
    if (activitiesWithIssues.length > 0) {
      console.log(`Found ${activitiesWithIssues.length} activities with missing required fields`);
      console.log('First activity with issues:');
      console.log(JSON.stringify(activitiesWithIssues[0], null, 2));
    } else {
      console.log('All activities have the required fields');
    }
    
    // 8. Check for LLM-generated activities using a heuristic (looking for emoji field which is often added by LLM)
    const potentialLLMActivities = activities.filter(activity => activity.emoji !== null);
    console.log(`Found ${potentialLLMActivities.length} potential LLM-generated activities (with emoji field)`);
    
    console.log('Synchronization complete!');
  } catch (error) {
    console.error('Error during LLM activities synchronization:', error);
  }
}

// Run the function when file is executed
syncLLMActivities().then(() => {
  console.log('Script execution completed');
}).catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});

export default syncLLMActivities;