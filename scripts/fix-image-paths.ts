import { db } from "../server/db";
import { activityImages } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixImagePaths() {
  // Get all images from the database
  const images = await db.select().from(activityImages);
  console.log(`Found ${images.length} images in the database`);
  
  let fixedCount = 0;
  
  // Fix paths that don't start with a slash
  for (const image of images) {
    if (image.path && !image.path.startsWith('/')) {
      const newPath = `/${image.path}`;
      console.log(`Fixing path: ${image.path} -> ${newPath}`);
      
      // Update the path in the database
      await db.update(activityImages)
        .set({ path: newPath })
        .where(eq(activityImages.id, image.id));
      
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} image paths`);
}

// Run the script
fixImagePaths()
  .then(() => {
    console.log("Image path fixing completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error fixing image paths:", error);
    process.exit(1);
  }); 