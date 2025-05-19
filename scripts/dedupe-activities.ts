
import { storage } from '../server/storage';
import { db } from '../server/db';
import { activities } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function dedupeActivities() {
  console.log('Starting activity deduplication...');
  
  try {
    // Get all activities
    const allActivities = await storage.getActivities();
    console.log(`Found ${allActivities.length} total activities`);
    
    // Group activities by name
    const activityGroups = allActivities.reduce((groups: Record<string, typeof allActivities>, activity) => {
      const name = activity.name;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(activity);
      return groups;
    }, {});
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(activityGroups)
      .filter(([_, group]) => group.length > 1);
      
    console.log(`Found ${duplicateGroups.length} groups with duplicate names`);
    
    let deletedCount = 0;
    
    // Process each group of duplicates
    for (const [name, group] of duplicateGroups) {
      console.log(`Processing duplicates for "${name}" (${group.length} entries)`);
      
      // Sort by ID to keep the first one created
      const sorted = [...group].sort((a, b) => a.id - b.id);
      const keep = sorted[0];
      const remove = sorted.slice(1);
      
      // Delete duplicates
      for (const activity of remove) {
        await db.delete(activities)
          .where(eq(activities.id, activity.id));
        deletedCount++;
      }
      
      console.log(`  Kept ID ${keep.id}, removed ${remove.length} duplicates`);
    }
    
    console.log(`Deduplication complete. Removed ${deletedCount} duplicate activities.`);
    
  } catch (error) {
    console.error('Error during deduplication:', error);
  }
}

// Run the deduplication
dedupeActivities().then(() => {
  console.log('Deduplication script finished');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
