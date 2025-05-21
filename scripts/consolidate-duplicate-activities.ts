
import { db } from '../server/db';
import { activities, activityImages } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function consolidateDuplicateActivities() {
  console.log('Starting activity consolidation...');

  try {
    // Get all activities
    console.log('Fetching all activities...');
    const allActivities = await db.select().from(activities);
    console.log(`Found ${allActivities.length} total activities`);

    // Get all activity images
    console.log('Fetching activity images...');
    const allImages = await db.select().from(activityImages);
    console.log(`Found ${allImages.length} total images`);

    // Create image lookup map
    const imagesByActivityId = new Map();
    allImages.forEach(img => {
      if (!imagesByActivityId.has(img.activityId)) {
        imagesByActivityId.set(img.activityId, []);
      }
      imagesByActivityId.get(img.activityId).push(img);
    });

    // Group activities by name
    const activityGroups = new Map();
    allActivities.forEach(activity => {
      const name = activity.name.trim();
      if (!activityGroups.has(name)) {
        activityGroups.set(name, []);
      }
      activityGroups.get(name).push(activity);
    });

    let deletedActivities = 0;
    let preservedActivities = 0;

    // Process each group of activities with the same name
    for (const [name, group] of activityGroups) {
      if (group.length > 1) {
        console.log(`\nProcessing duplicate group "${name}" (${group.length} activities)`);

        // Find activities with images
        const activitiesWithImages = group.filter(activity => 
          imagesByActivityId.has(activity.id) && imagesByActivityId.get(activity.id).length > 0
        );

        let keepActivity;
        if (activitiesWithImages.length > 0) {
          // If there are activities with images, keep the first one with an image
          keepActivity = activitiesWithImages[0];
        } else {
          // If no activities have images, keep the one with lowest ID
          keepActivity = group.reduce((min, current) => 
            current.id < min.id ? current : min
          );
        }

        // Delete all other activities in the group
        for (const activity of group) {
          if (activity.id !== keepActivity.id) {
            // Delete the activity
            await db.delete(activities)
              .where(eq(activities.id, activity.id));
            deletedActivities++;
          } else {
            preservedActivities++;
          }
        }

        console.log(`  Kept activity ${keepActivity.id} (${keepActivity.name})`);
        if (imagesByActivityId.has(keepActivity.id)) {
          console.log(`  Associated images: ${imagesByActivityId.get(keepActivity.id).length}`);
        }
      } else {
        preservedActivities++;
      }
    }

    // Final report
    console.log('\nConsolidation complete!');
    console.log(`Duplicate activities deleted: ${deletedActivities}`);
    console.log(`Unique activities preserved: ${preservedActivities}`);

  } catch (error) {
    console.error('Error during consolidation:', error);
    throw error;
  }
}

// Run the consolidation
consolidateDuplicateActivities()
  .then(() => {
    console.log('Activity consolidation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Activity consolidation failed:', error);
    process.exit(1);
  });
