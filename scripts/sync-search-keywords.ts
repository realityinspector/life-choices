/**
 * This script specifically addresses the search issue with LLM-generated activities.
 * It adds search keywords to ensure activities like "Rafting Adventure" can be found
 * when searching for terms like "raft".
 */

import { db } from '../server/db';
import { activities } from '../shared/schema';
import { eq, like } from 'drizzle-orm';

// Additional keywords to associate with specific activities
// This maps activity names or partial matches to additional search terms
const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  "rafting": ["raft", "river", "water", "adventure", "paddle", "boat"],
  "adventure": ["explore", "exciting", "expedition", "thrill"],
  "angkor": ["temple", "cambodia", "ruin", "ancient", "archaeology"],
  "hiking": ["hike", "trail", "trek", "walk", "mountain", "backpack"],
  "meditation": ["meditate", "mindful", "zen", "calm", "relax"],
  "exercise": ["workout", "fitness", "training", "gym"],
  "reading": ["read", "book", "literature", "study"],
  "cooking": ["cook", "recipe", "food", "meal", "kitchen", "bake"],
  "photography": ["photo", "camera", "picture", "shoot"],
  "gardening": ["garden", "plant", "flower", "grow"],
  "painting": ["paint", "art", "canvas", "draw", "artistic"],
  "writing": ["write", "author", "story", "journal", "blog"],
  "swimming": ["swim", "pool", "water", "beach"],
  "yoga": ["stretch", "pose", "flexibility", "balance"],
  "cycling": ["cycle", "bike", "biking", "bicycle", "ride"],
  "language": ["learn", "speak", "vocabulary", "grammar"],
  "volunteering": ["volunteer", "charity", "help", "community", "donate"],
  "traveling": ["travel", "trip", "journey", "visit", "tour", "vacation"],
  "family": ["relatives", "kids", "parents", "children", "bond"],
  "museum": ["exhibit", "gallery", "art", "history", "collection"],
  "concert": ["music", "performance", "band", "live", "show"],
};

async function syncSearchKeywords() {
  console.log("Starting to sync search keywords for activities...");
  
  try {
    // Get all activities from the database
    const allActivities = await db.query.activities.findMany();
    console.log(`Found ${allActivities.length} total activities in the database`);
    
    let updateCount = 0;
    
    // Process each activity
    for (const activity of allActivities) {
      // Skip activities without names
      if (!activity.name) continue;
      
      const activityName = activity.name.toLowerCase();
      const keywords: string[] = [];
      
      // Check if any keywords apply to this activity
      for (const [key, terms] of Object.entries(ACTIVITY_KEYWORDS)) {
        if (activityName.includes(key.toLowerCase())) {
          // Add all related terms for this key
          terms.forEach(term => {
            if (!keywords.includes(term) && !activityName.includes(term)) {
              keywords.push(term);
            }
          });
        }
      }
      
      // Skip if no keywords to add
      if (keywords.length === 0) continue;
      
      // Prepare a description field with embedded keywords for search
      // This allows the frontend search to find activities by these keywords
      // We'll use a format that doesn't show in the UI but is searchable
      const searchKeywords = keywords.join(' ');
      
      console.log(`Activity: "${activity.name}" (ID: ${activity.id})`);
      console.log(`  - Adding search keywords: ${searchKeywords}`);
      
      // Format the description to include search keywords
      let description = activity.name; // Fallback description is just the name
      
      // Add hidden search keywords (for database search)
      const searchableDescription = `${description} [keywords: ${searchKeywords}]`;
      
      // Update the activity with the searchable description
      try {
        // For Rafting Adventure specifically, ensure we fix all aspects
        if (activityName.includes("rafting")) {
          console.log(`  - Processing specific fix for Rafting activity`);
          
          // Ensure proper category
          const properCategory = "Travel & Adventure";
          
          await db.update(activities)
            .set({
              description: searchableDescription,
              category: properCategory,
              // Ensure these are correct enum values
              frequencyUnit: "week" as "day" | "week" | "month" | "year",
              durationUnit: "hour" as "minute" | "hour"
            })
            .where(eq(activities.id, activity.id));
        } else {
          // Regular update for other activities
          await db.update(activities)
            .set({
              description: searchableDescription,
              // Ensure these are correct enum values
              frequencyUnit: activity.frequencyUnit as "day" | "week" | "month" | "year", 
              durationUnit: activity.durationUnit as "minute" | "hour"
            })
            .where(eq(activities.id, activity.id));
        }
        
        console.log(`  ✅ Successfully updated search keywords for activity ID ${activity.id}`);
        updateCount++;
      } catch (error) {
        console.error(`  ❌ Error updating search keywords for activity ID ${activity.id}:`, error);
      }
    }
    
    console.log(`Completed syncing search keywords. Updated ${updateCount} of ${allActivities.length} activities.`);
  } catch (error) {
    console.error("Error in syncSearchKeywords:", error);
  }
}

// Run the script
syncSearchKeywords()
  .then(() => {
    console.log("Search keyword sync completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Search keyword sync failed:", error);
    process.exit(1);
  });