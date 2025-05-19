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

  // Get all activities that have images
  const activitiesWithImages = await storage.getActivitiesWithImages();
  const activitiesWithImagesIds = new Set(
    activitiesWithImages.map((img) => img.activityId),
  );
  console.log(`${activitiesWithImages.length} activities already have images`);

  // Filter activities without images
  const activitiesNeedingImages = activities.filter(
    (activity) => !activitiesWithImagesIds.has(activity.id)
  );

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

async function processActivitiesWithImages(activitiesToProcess: ActivityToProcess[]) {
  console.log("\n=== STEP 2: Generating images for activities ===");

  if (activitiesToProcess.length === 0) {
    console.log("No activities need images. All done!");
    return;
  }

  console.log(`Starting image generation for ${activitiesToProcess.length} activities...`);

  let successCount = 0;
  let errorCount = 0;
  const errors: { id: number; name: string; error: string }[] = [];

  // Process activities one at a time
  for (let i = 0; i < activitiesToProcess.length; i++) {
    const activity = activitiesToProcess[i];

    console.log(
      `\n=== Processing activity ${i + 1}/${activitiesToProcess.length} ===`,
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
    if (i < activitiesToProcess.length - 1) {
      console.log("Waiting 2 seconds before next activity...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total activities processed: ${activitiesToProcess.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log("\nActivities with errors:");
    errors.forEach(({ id, name, error }) => {
      console.log(`  - Activity ${id} ("${name}"): ${error}`);
    });
  }

  console.log("\nImage generation complete!");
}

async function generateImagesForMissingActivities() {
  try {
    // Step 1: Check all activities and create list of those needing images
    const activitiesNeedingImages = await checkAndListActivitiesNeedingImages();

    // Step 2: Process each activity to generate and associate images
    await processActivitiesWithImages(activitiesNeedingImages);

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
generateImagesForMissingActivities();