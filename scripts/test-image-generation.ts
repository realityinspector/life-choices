import { togetherAIService } from "../server/services/together-ai";
import { storage } from "../server/storage";
import { ActivityInsert } from "../shared/schema";

// List of all missing activity IDs
const missingActivityIds = [
  87, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144,
  145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159,
  160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174,
  175, 176, 177, 178, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190,
  191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205,
  206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220,
  221, 222, 223, 224, 225, 226, 227, 228, 229,
];

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

async function generateImagesForMissingActivities() {
  console.log(
    `Starting image generation for ${missingActivityIds.length} missing activities...`,
  );

  let successCount = 0;
  let errorCount = 0;
  const errors: { id: number; error: string }[] = [];

  // Process activities in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < missingActivityIds.length; i += batchSize) {
    const batch = missingActivityIds.slice(i, i + batchSize);
    console.log(
      `\n=== Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingActivityIds.length / batchSize)} ===`,
    );
    console.log(`Activities: ${batch.join(", ")}`);

    // Process batch in parallel
    const batchPromises = batch.map(async (activityId) => {
      const success = await generateImageForActivity(activityId);
      if (success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({ id: activityId, error: "Failed to generate image" });
      }
      return { activityId, success };
    });

    await Promise.all(batchPromises);

    // Add delay between batches to be respectful to the API
    if (i + batchSize < missingActivityIds.length) {
      console.log("Waiting 2 seconds before next batch...");
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
}

// Add error handling for the main execution
async function main() {
  try {
    await generateImagesForMissingActivities();
  } catch (error) {
    console.error("Fatal error in main:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();
