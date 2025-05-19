
import { togetherAIService } from "../server/services/together-ai";
import { storage } from "../server/storage";
import { ActivityInsert } from "../shared/schema";

async function generateImageForActivity(activityId: number): Promise<boolean> {
  try {
    console.log(`\n--- Processing Activity ID: ${activityId} ---`);

    // Get the activity
    const activity = await storage.getActivity(activityId);
    if (!activity) {
      console.error(`Activity ${activityId} not found`);
      return false;
    }

    console.log(`Found activity: ${activity.name}`);

    // Check if image already exists
    const existingImages = await storage.getActivityImages(activityId);
    if (existingImages && existingImages.length > 0) {
      console.log(
        `Activity ${activityId} already has ${existingImages.length} image(s), skipping...`,
      );
      return true;
    }

    // Convert to ActivityInsert format
    const activityInsert: ActivityInsert = {
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit,
      duration: activity.duration,
      durationUnit: activity.durationUnit,
      lifeImpact: activity.lifeImpact,
      color: activity.color,
      priority: activity.priority,
      emoji: activity.emoji,
      exportToCalendar: activity.exportToCalendar,
      clusterId: activity.clusterId,
    };

    // Generate image
    console.log(`Generating image for "${activity.name}"...`);
    const imageData =
      await togetherAIService.generateImageForActivity(activityInsert);

    if (!imageData) {
      console.error(`Failed to generate image for activity ${activityId}`);
      return false;
    }

    console.log(`Generated image: ${imageData.filename}`);

    // Associate image with activity
    const savedImage = await storage.createActivityImage({
      activityId: activity.id,
      filename: imageData.filename,
      originalFilename: imageData.originalFilename,
      path: imageData.path,
      mimeType: imageData.mimeType,
    });

    console.log(`Successfully associated image with activity ${activityId}`);
    return true;
  } catch (error) {
    console.error(`Error processing activity ${activityId}:`, error);
    return false;
  }
}

async function findActivitiesWithoutImages(): Promise<number[]> {
  // Get all activities
  const activities = await storage.getActivities();
  
  // Get all activities that have images
  const activitiesWithImages = await storage.getActivitiesWithImages();
  const activitiesWithImagesIds = new Set(activitiesWithImages.map(img => img.activityId));
  
  // Filter activities without images
  const activitiesWithoutImages = activities
    .filter(activity => !activitiesWithImagesIds.has(activity.id))
    .map(activity => activity.id);
    
  return activitiesWithoutImages;
}

async function generateImagesForMissingActivities() {
  try {
    // Find all activities without images
    const missingActivityIds = await findActivitiesWithoutImages();
    
    console.log(
      `Starting image generation for ${missingActivityIds.length} activities missing images...`,
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: { id: number; error: string }[] = [];

    // Process activities one at a time
    for (const activityId of missingActivityIds) {
      console.log(
        `\n=== Processing activity ${successCount + errorCount + 1}/${missingActivityIds.length} ===`,
      );
      
      const success = await generateImageForActivity(activityId);
      if (success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({ id: activityId, error: "Failed to generate image" });
      }

      // Add delay between activities to be respectful to the API
      if (successCount + errorCount < missingActivityIds.length) {
        console.log("Waiting 2 seconds before next activity...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log("\n=== SUMMARY ===");
    console.log(`Total activities processed: ${missingActivityIds.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\nActivities with errors:");
      errors.forEach(({ id, error }) => {
        console.log(`  - Activity ${id}: ${error}`);
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
