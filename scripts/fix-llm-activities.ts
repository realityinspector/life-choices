/**
 * This script fixes LLM-generated activities to make them searchable in the shop interface.
 * It ensures all activities have the correct data types and field formatting required for proper searching.
 */

import { db } from '../server/db';
import { activities, Activity } from '../shared/schema';
import { eq, ilike } from 'drizzle-orm';
import { togetherAIService } from '../server/services/together-ai';
import { ActivityInsert } from '../shared/schema';

async function fixLLMActivities() {
  console.log("Starting to fix LLM-generated activities for shop integration...");
  
  try {
    // 1. Retrieve all activities from the database
    const allActivities = await db.query.activities.findMany();
    console.log(`Found ${allActivities.length} total activities in the database`);
    
    // 2. Identify activities that might be from LLM based on certain patterns
    // Typically LLM-generated activities might have a specific source or pattern
    const potentialLLMActivities = allActivities.filter(activity => {
      // Check for indicators that this is an LLM-generated activity:
      // - Might have certain naming patterns
      // - Could be associated with images
      // - Might have an unusual description format
      // - Could have non-standard category values
      
      // Identify by associated images or specific pattern
      const hasImage = activity.id >= 100; // Assumption that activities with ID over 100 are LLM-generated
      const hasStandardCategory = ["Health & Fitness", "Learning & Development", 
                                  "Spirituality & Mindfulness", "Career & Finance", 
                                  "Recreation & Leisure", "Family & Relationships", 
                                  "Creativity & Expression", "Service & Contribution",
                                  "Travel & Adventure", "Home & Environment"].includes(activity.category);
                                  
      return hasImage || !hasStandardCategory;
    });
    
    console.log(`Identified ${potentialLLMActivities.length} potential LLM-generated activities`);
    
    // Track successful fixes
    let fixedCount = 0;
    
    // 3. Process each potential LLM activity 
    for (const activity of potentialLLMActivities) {
      console.log(`Processing activity: "${activity.name}" (ID: ${activity.id})`);
      
      try {
        // Ensure frequency unit is a valid enum value
        let frequencyUnit = activity.frequencyUnit;
        if (!["day", "week", "month", "year"].includes(frequencyUnit)) {
          frequencyUnit = "week"; // Default to week if invalid
          console.log(`  - Fixed invalid frequencyUnit: "${activity.frequencyUnit}" → "week"`);
        }
        
        // Ensure duration unit is a valid enum value
        let durationUnit = activity.durationUnit;
        if (!["minute", "hour"].includes(durationUnit)) {
          durationUnit = "minute"; // Default to minute if invalid
          console.log(`  - Fixed invalid durationUnit: "${activity.durationUnit}" → "minute"`);
        }
        
        // Normalize category - map similar categories to standard ones
        const categoryMap: Record<string, string> = {
          // Health-related variations
          "health": "Health & Fitness",
          "fitness": "Health & Fitness",
          "exercise": "Health & Fitness",
          "wellness": "Health & Fitness",
          
          // Learning-related variations
          "learning": "Learning & Development",
          "education": "Learning & Development",
          "study": "Learning & Development",
          "skill": "Learning & Development",
          
          // Recreation-related variations
          "leisure": "Recreation & Leisure",
          "hobby": "Recreation & Leisure",
          "recreation": "Recreation & Leisure",
          "fun": "Recreation & Leisure",
          
          // Spirituality-related variations
          "spiritual": "Spirituality & Mindfulness",
          "mindfulness": "Spirituality & Mindfulness",
          "meditation": "Spirituality & Mindfulness",
          
          // Work-related variations
          "career": "Career & Finance",
          "work": "Career & Finance",
          "business": "Career & Finance",
          "finance": "Career & Finance",
          "money": "Career & Finance",
          
          // Relationship-related variations
          "family": "Family & Relationships",
          "relationship": "Family & Relationships",
          "social": "Family & Relationships",
          
          // Creativity-related variations
          "creativity": "Creativity & Expression",
          "art": "Creativity & Expression",
          "music": "Creativity & Expression",
          "writing": "Creativity & Expression",
          
          // Service-related variations
          "service": "Service & Contribution",
          "volunteer": "Service & Contribution",
          "community": "Service & Contribution",
          
          // Travel-related variations
          "travel": "Travel & Adventure",
          "adventure": "Travel & Adventure",
          "exploration": "Travel & Adventure",
          
          // Home-related variations
          "home": "Home & Environment",
          "household": "Home & Environment",
          "cleaning": "Home & Environment",
          "environment": "Home & Environment",
        };
        
        let normalizedCategory = activity.category;
        
        // Check if the current category needs normalization
        const lowerCategory = activity.category.toLowerCase();
        for (const [key, standardCategory] of Object.entries(categoryMap)) {
          if (lowerCategory.includes(key)) {
            normalizedCategory = standardCategory;
            if (normalizedCategory !== activity.category) {
              console.log(`  - Normalized category: "${activity.category}" → "${normalizedCategory}"`);
            }
            break;
          }
        }
        
        // Use the Together AI service to enhance activity details if needed
        // This is especially useful for activities that lack proper descriptions or categories
        let enhancedDetails: ActivityInsert | null = null;
        
        // Check if this activity needs enhancement (missing important details)
        const needsEnhancement = !activity.color || !activity.emoji || 
                                activity.priority === null || activity.lifeImpact === 0;
        
        if (needsEnhancement) {
          console.log(`  - Activity "${activity.name}" needs enhancement, using Together AI...`);
          
          // Use the activity name to generate better details
          try {
            enhancedDetails = await togetherAIService.generateActivityFromFilename(activity.name);
            
            if (enhancedDetails) {
              console.log(`  - Successfully enhanced activity details with AI`);
            }
          } catch (error) {
            console.error(`  - Error enhancing activity with AI:`, error);
          }
        }
        
        // Prepare the update data
        const updateData: Partial<Activity> = {
          frequencyUnit,
          durationUnit,
          category: normalizedCategory,
        };
        
        // Add enhanced fields if available from Together AI
        if (enhancedDetails) {
          updateData.color = enhancedDetails.color || activity.color;
          updateData.emoji = enhancedDetails.emoji || activity.emoji;
          updateData.priority = enhancedDetails.priority !== null ? enhancedDetails.priority : activity.priority;
          updateData.lifeImpact = enhancedDetails.lifeImpact || activity.lifeImpact;
        }
        
        // Update the activity in the database
        await db.update(activities)
          .set(updateData)
          .where(eq(activities.id, activity.id));
        
        console.log(`  ✅ Successfully fixed activity ID ${activity.id}: "${activity.name}"`);
        fixedCount++;
      } catch (error) {
        console.error(`  ❌ Error fixing activity ID ${activity.id}:`, error);
      }
    }
    
    console.log(`Completed fixing LLM activities. Fixed ${fixedCount} of ${potentialLLMActivities.length} activities.`);
  } catch (error) {
    console.error("Error in fixLLMActivities:", error);
  }
}

// Run the script
fixLLMActivities()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });