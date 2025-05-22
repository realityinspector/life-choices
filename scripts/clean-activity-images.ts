import { db } from "../server/db";
import { activityImages } from "../shared/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

async function cleanActivityImages() {
  // Get all images from the database
  const images = await db.select().from(activityImages);
  console.log(`Found ${images.length} total images in the database`);
  
  // Group images by activity ID
  const imagesByActivity: Record<number, typeof images> = {};
  
  for (const image of images) {
    if (image.activityId) {
      if (!imagesByActivity[image.activityId]) {
        imagesByActivity[image.activityId] = [];
      }
      imagesByActivity[image.activityId].push(image);
    }
  }
  
  // For each activity with multiple images, keep only the most recent one
  let deletedCount = 0;
  let activityCount = 0;
  
  for (const activityId in imagesByActivity) {
    const imagesForActivity = imagesByActivity[activityId];
    
    if (imagesForActivity.length > 1) {
      activityCount++;
      console.log(`Activity ${activityId} has ${imagesForActivity.length} images`);
      
      // Sort images by ID in descending order (assuming higher ID = more recent)
      const sortedImages = [...imagesForActivity].sort((a, b) => b.id - a.id);
      
      // Keep the first one (most recent) and delete the rest
      const [keepImage, ...deleteImages] = sortedImages;
      
      console.log(`Keeping image ${keepImage.id} (${keepImage.filename}) and deleting ${deleteImages.length} older images`);
      
      // Delete older images
      for (const image of deleteImages) {
        try {
          // Delete file from filesystem
          const filePath = path.join(process.cwd(), "uploads", image.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
          
          // Delete from database
          await db.delete(activityImages).where(eq(activityImages.id, image.id));
          console.log(`Deleted image record ID: ${image.id}`);
          
          deletedCount++;
        } catch (deleteError) {
          console.error(`Error deleting image ${image.id}: ${deleteError}`);
        }
      }
    }
  }
  
  console.log(`Cleaned up ${activityCount} activities with multiple images`);
  console.log(`Deleted ${deletedCount} duplicate images`);
}

// Run the script
cleanActivityImages()
  .then(() => {
    console.log("Image cleanup completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error cleaning up images:", error);
    process.exit(1);
  }); 