
import { db } from '../server/db';
import { activities, activityImages } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { storage } from '../server/storage';

async function cleanActivitiesDatabase() {
  console.log('Starting database cleanup...');

  try {
    // Step 1: Get all activities and their images
    const allActivities = await storage.getActivities();
    const allImages = await storage.getActivityImages();
    console.log(`Found ${allActivities.length} total activities`);
    console.log(`Found ${allImages.length} total images`);

    // Create image lookup map
    const imagesByActivityId = new Map();
    allImages.forEach(img => {
      if (!imagesByActivityId.has(img.activityId)) {
        imagesByActivityId.set(img.activityId, []);
      }
      imagesByActivityId.get(img.activityId).push(img);
    });

    // Step 2: Group activities by name to find duplicates
    const activityGroups = new Map();
    allActivities.forEach(activity => {
      if (!activityGroups.has(activity.name)) {
        activityGroups.set(activity.name, []);
      }
      activityGroups.get(activity.name).push(activity);
    });

    let deletedCount = 0;
    let keptCount = 0;

    // Step 3: Process each group
    for (const [name, group] of activityGroups) {
      console.log(`\nProcessing group "${name}" (${group.length} activities)`);

      // Find activities with images in this group
      const activitiesWithImages = group.filter(activity => 
        imagesByActivityId.has(activity.id)
      );

      // If no activities have images, delete the whole group
      if (activitiesWithImages.length === 0) {
        console.log(`  No activities with images found - deleting entire group`);
        for (const activity of group) {
          await db.delete(activities)
            .where(eq(activities.id, activity.id));
          deletedCount++;
        }
        continue;
      }

      // Keep only the first activity with an image, delete others
      const keepActivity = activitiesWithImages[0];
      const keepImageId = imagesByActivityId.get(keepActivity.id)[0].id;

      // Delete extra images for the kept activity
      if (imagesByActivityId.get(keepActivity.id).length > 1) {
        const extraImages = imagesByActivityId.get(keepActivity.id).slice(1);
        for (const img of extraImages) {
          await db.delete(activityImages)
            .where(eq(activityImages.id, img.id));
        }
      }

      // Delete all other activities in the group
      for (const activity of group) {
        if (activity.id !== keepActivity.id) {
          // Delete associated images first
          if (imagesByActivityId.has(activity.id)) {
            for (const img of imagesByActivityId.get(activity.id)) {
              await db.delete(activityImages)
                .where(eq(activityImages.id, img.id));
            }
          }
          // Delete the activity
          await db.delete(activities)
            .where(eq(activities.id, activity.id));
          deletedCount++;
        }
      }

      keptCount++;
      console.log(`  Kept activity ${keepActivity.id} with image ${keepImageId}`);
    }

    // Final report
    console.log('\nCleanup complete!');
    console.log(`Activities deleted: ${deletedCount}`);
    console.log(`Activities kept: ${keptCount}`);
    console.log('Each remaining activity has exactly one image');

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanActivitiesDatabase()
  .then(() => {
    console.log('Database cleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  });
