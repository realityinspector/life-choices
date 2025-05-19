
import { togetherAIService } from "../server/services/together-ai";
import { storage } from "../server/storage";
import { ActivityInsert } from "../shared/schema";

interface ActivityToProcess {
  id: number;
  name: string;
  category: string;
  frequency: number;
  frequencyUnit: string;
  duration: number;
  durationUnit: string;
  lifeImpact: number;
  color: string;
  priority: number;
  emoji: string;
  exportToCalendar: boolean;
  clusterId: number | null;
}

async function checkAndListActivitiesNeedingImages(): Promise<ActivityToProcess[]> {
  console.log("=== STEP 1: Checking all activities for missing images ===");

  // Get all activities
  const activities = await storage.getActivities();
  console.log(`Found ${activities.length} total activities`);

  // Get all activity images
  const activityImages = await storage.getActivityImages();
  console.log(`${activityImages.length} activity images found`);

  // Group activity images by activityId
  const imagesByActivityId = activityImages.reduce((acc, img) => {
    if (img.activityId) {
      if (!acc[img.activityId]) {
        acc[img.activityId] = [];
      }
      acc[img.activityId].push(img);
    }
    return acc;
  }, {} as Record<number, any[]>);

  // Filter activities without images
  const activitiesNeedingImages = activities.filter(activity => {
    // Check if activity has any associated images
    return !imagesByActivityId[activity.id] || imagesByActivityId[activity.id].length === 0;
  });

  console.log(`${activitiesNeedingImages.length} activities need images`);

  if (activitiesNeedingImages.length > 0) {
    console.log("\nActivities needing images:");
    activitiesNeedingImages.forEach((activity, index) => {
      console.log(`  ${index + 1}. ID: ${activity.id} - "${activity.name}"`);
    });
  }

  return activitiesNeedingImages;
}

async function generateImageForActivity(activity: ActivityToProcess): Promise<boolean> {
  try {
    console.log(`\n--- Processing Activity ID: ${activity.id} ---`);
    console.log(`Activity name: "${activity.name}"`);

    // Convert to ActivityInsert format
    const activityInsert: ActivityInsert = {
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit as "day" | "week" | "month" | "year",
      duration: activity.duration,
      durationUnit: activity.durationUnit as "minute" | "hour",
      lifeImpact: activity.lifeImpact,
      color: activity.color,
      priority: activity.priority,
      emoji: activity.emoji,
      exportToCalendar: activity.exportToCalendar,
      clusterId: activity.clusterId
    };

    // Generate image
    console.log(`Generating image for "${activity.name}"...`);
    const imageData = await togetherAIService.generateImageForActivity(activityInsert);

    if (!imageData) {
      console.error(`Failed to generate image for activity ${activity.id}`);
      return false;
    }

    console.log(`Generated image: ${imageData.filename}`);

    // Associate image with activity (update activity with image)
    const savedImage = await storage.createActivityImage({
      activityId: activity.id,
      filename: imageData.filename,
      originalFilename: imageData.originalFilename,
      path: imageData.path,
      mimeType: imageData.mimeType,
    });

    console.log(`Successfully updated activity ${activity.id} with image`);
    return true;
  } catch (error) {
    console.error(`Error processing activity ${activity.id}:`, error);
    return false;
  }
}

async function generateImagesForMissingActivities() {
  try {
    // Find all activities without images
    const activitiesNeedingImages = await checkAndListActivitiesNeedingImages();
    
    console.log(
      `Starting image generation for ${activitiesNeedingImages.length} activities missing images...`,
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: { id: number; name: string; error: string }[] = [];

    // Process activities one at a time
    for (const activity of activitiesNeedingImages) {
      console.log(
        `\n=== Processing activity ${successCount + errorCount + 1}/${activitiesNeedingImages.length} ===`,
      );
      
      const success = await generateImageForActivity(activity);
      if (success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({ 
          id: activity.id, 
          name: activity.name, 
          error: "Failed to generate image" 
        });
      }

      // Add delay between activities to be respectful to the API
      if (successCount + errorCount < activitiesNeedingImages.length) {
        console.log("Waiting 2 seconds before next activity...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log("\n=== SUMMARY ===");
    console.log(`Total activities processed: ${activitiesNeedingImages.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\nActivities with errors:");
      errors.forEach(({ id, name, error }) => {
        console.log(`  - Activity ${id} ("${name}"): ${error}`);
      });
    }

    console.log("\nImage generation complete!");
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
generateImagesForMissingActivities();
