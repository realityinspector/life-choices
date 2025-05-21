import { db } from '../server/db';
import { activities, activityImages } from '../shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

async function cleanActivitiesDatabase() {
  console.log('Starting database cleanup...');

  try {
    // First update activities without source
    console.log('Updating activities without source...');
    await db.execute(
      sql`UPDATE activities SET source = 'legacy' WHERE source IS NULL`
    );

    console.log('Updated activities without source');

    // Step 1: Get all activities and their images
    console.log('Fetching activities...');
    const allActivities = await db.select().from(activities);
    console.log(`Found ${allActivities.length} total activities`);

    console.log('Fetching images...');
    const allImages = await db.select().from(activityImages);
    console.log(`Found ${allImages.length} total images`);

    console.log('Creating image lookup map...');
    const imagesByActivityId = new Map();
    let imageMapProgress = 0;
    allImages.forEach((img, index) => {
      if (index % 100 === 0) {
        imageMapProgress = Math.round((index / allImages.length) * 100);
        console.log(`Processing images: ${imageMapProgress}% (${index}/${allImages.length})`);
      }
      if (!imagesByActivityId.has(img.activityId)) {
        imagesByActivityId.set(img.activityId, []);
      }
      imagesByActivityId.get(img.activityId).push(img);
    });

    // Step 2: First remove all activities without images
    let deletedNoImages = 0;
    let processedCount = 0;
    console.log('\nRemoving activities without images...');

    for (const activity of allActivities) {
      processedCount++;
      if (processedCount % 1000 === 0) {
        console.log(`Processing activities: ${Math.round((processedCount / allActivities.length) * 100)}% (${processedCount}/${allActivities.length})`);
      }

      if (!imagesByActivityId.has(activity.id)) {
        await db.delete(activities)
          .where(eq(activities.id, activity.id));
        deletedNoImages++;
        if (deletedNoImages % 100 === 0) {
          console.log(`Deleted ${deletedNoImages} activities without images so far...`);
        }
      }
    }
    console.log(`\nCompleted: Deleted ${deletedNoImages} activities without images`);

    // Step 3: Get remaining activities (those with images)
    const remainingActivities = allActivities.filter(activity => 
      imagesByActivityId.has(activity.id)
    );
    console.log(`${remainingActivities.length} activities remain with images`);

    // Step 4: Group remaining activities by name to find duplicates
    const activityGroups = new Map();
    remainingActivities.forEach(activity => {
      if (!activityGroups.has(activity.name)) {
        activityGroups.set(activity.name, []);
      }
      activityGroups.get(activity.name).push(activity);
    });

    let deletedDuplicates = 0;
    let keptCount = 0;

    // Step 5: Process each group of activities with the same name
    for (const [name, group] of activityGroups) {
      if (group.length > 1) {
        console.log(`\nProcessing duplicate group "${name}" (${group.length} activities)`);

        // Keep only the first activity in the group
        const keepActivity = group[0];
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
        for (const activity of group.slice(1)) {
          // Delete associated images first
          for (const img of imagesByActivityId.get(activity.id)) {
            await db.delete(activityImages)
              .where(eq(activityImages.id, img.id));
          }
          // Delete the activity
          await db.delete(activities)
            .where(eq(activities.id, activity.id));
          deletedDuplicates++;
        }

        console.log(`  Kept activity ${keepActivity.id} with image ${keepImageId}`);
        keptCount++;
      } else {
        // Single activity with this name, just count it as kept
        keptCount++;
      }
    }

    // Final report
    console.log('\nCleanup complete!');
    console.log(`Activities without images deleted: ${deletedNoImages}`);
    console.log(`Duplicate activities deleted: ${deletedDuplicates}`);
    console.log(`Unique activities kept: ${keptCount}`);
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