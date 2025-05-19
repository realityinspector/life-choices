
import { storage } from "../server/storage";
import { db } from "../server/db";
import { activities } from "../shared/schema";
import { eq } from "drizzle-orm";

async function deleteSampleActivities() {
  console.log('Starting sample activities deletion...');
  
  try {
    // Delete all activities with userId 999 (sample activities)
    await db.delete(activities)
      .where(eq(activities.userId, 999));
      
    console.log('Successfully deleted all sample activities');
  } catch (error) {
    console.error('Error deleting sample activities:', error);
    throw error;
  }
}

// Run the script
deleteSampleActivities()
  .then(() => {
    console.log('Deletion complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
