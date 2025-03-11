import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { storage } from '../server/storage';
import { ActivityInsert } from '../shared/schema';
import path from 'path';

// Helper function to determine the duration unit based on hours
function determineDurationUnit(hoursMin: number, hoursMax: number): { duration: number, durationUnit: "minute" | "hour" } {
  const avgHours = (hoursMin + hoursMax) / 2;
  
  if (avgHours < 1) {
    // Convert to minutes if less than 1 hour
    return {
      duration: Math.round(avgHours * 60),
      durationUnit: "minute"
    };
  } else {
    // Use hours otherwise
    return {
      duration: Math.round(avgHours),
      durationUnit: "hour"
    };
  }
}

// Helper function to determine frequency unit based on events per year
function determineFrequencyUnit(eventsPerYear: number): { frequency: number, frequencyUnit: "day" | "week" | "month" | "year" } {
  if (eventsPerYear >= 365) {
    // Daily or more frequently
    return {
      frequency: Math.round(365 / eventsPerYear),
      frequencyUnit: "day"
    };
  } else if (eventsPerYear >= 52) {
    // Weekly or more frequently
    return {
      frequency: Math.round(52 / eventsPerYear),
      frequencyUnit: "week"
    };
  } else if (eventsPerYear >= 12) {
    // Monthly or more frequently
    return {
      frequency: Math.round(12 / eventsPerYear),
      frequencyUnit: "month"
    };
  } else {
    // Less than monthly, use yearly
    return {
      frequency: Math.max(1, Math.round(eventsPerYear)),
      frequencyUnit: "year"
    };
  }
}

// Helper function to generate a random color if none is specified
function generateRandomColor(): string {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33",
    "#33FFF5", "#FF3333", "#33FF33", "#3333FF", "#FF33FF",
    "#FFFF33", "#33FFFF", "#FF7733", "#33FF77", "#7733FF"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Determine priority based on life points and other factors
function determinePriority(lifePoints: string | null, emotionValue: string | null): number {
  // Default priority is 3 (middle of 1-5 scale)
  let priority = 3;
  
  if (lifePoints) {
    if (lifePoints.includes('veryNegative')) priority = 1;
    else if (lifePoints.includes('negative')) priority = 2;
    else if (lifePoints.includes('large') || lifePoints.includes('Great') || lifePoints.includes('Life Goal')) priority = 5;
    else if (lifePoints.includes('medium') || lifePoints.includes('Good')) priority = 4;
  }
  
  if (emotionValue) {
    if (emotionValue.includes('Very Negative')) priority = Math.min(priority, 1);
    else if (emotionValue.includes('Negative')) priority = Math.min(priority, 2);
    else if (emotionValue.includes('Great') || emotionValue.includes('Life Goal')) priority = Math.max(priority, 5);
    else if (emotionValue.includes('Good')) priority = Math.max(priority, 4);
  }
  
  return priority;
}

// Calculate life impact based on various factors in the CSV
function calculateLifeImpact(
  lifePoints: string | null, 
  emotionValue: string | null, 
  longevityImpact: string | null
): number {
  // Default neutral impact
  let impact = 0;
  
  // Adjust based on life points
  if (lifePoints) {
    if (lifePoints.includes('veryNegative')) impact -= 2;
    else if (lifePoints.includes('negative')) impact -= 1;
    else if (lifePoints.includes('small')) impact += 0.5;
    else if (lifePoints.includes('medium') || lifePoints.includes('Good')) impact += 1;
    else if (lifePoints.includes('large') || lifePoints.includes('Great')) impact += 2;
    else if (lifePoints.includes('rare') || lifePoints.includes('Life Goal')) impact += 3;
  }
  
  // Adjust based on emotion value
  if (emotionValue) {
    if (emotionValue.includes('Very Negative')) impact -= 1;
    else if (emotionValue.includes('Negative')) impact -= 0.5;
    else if (emotionValue.includes('Good')) impact += 0.5;
    else if (emotionValue.includes('Great') || emotionValue.includes('Life Goal')) impact += 1;
  }
  
  // Adjust based on longevity impact
  if (longevityImpact) {
    if (longevityImpact.includes('takes much life')) impact -= 1;
    else if (longevityImpact.includes('takes some life')) impact -= 0.5;
    else if (longevityImpact.includes('adds some life')) impact += 0.5;
    else if (longevityImpact.includes('adds much life')) impact += 1;
  }
  
  // Ensure the impact is within a reasonable range (-5 to 5)
  return Math.max(-5, Math.min(5, impact));
}

export async function importActivities(userId: number): Promise<number> {
  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'shared', 'data.csv');
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    
    console.log(`Reading CSV file from ${csvPath}`);
    
    // Parse the CSV data
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      // Handle quotes and potential special characters
      delimiter: ',',
      quote: '"',
      escape: '"',
      relax_column_count: true
    });

    const records: any[] = [];
    for await (const record of parser) {
      records.push(record);
    }
    
    console.log(`Parsed ${records.length} records from CSV file`);
    
    // Filter out any completely empty records
    const dataRecords = records.filter(record => {
      // Check if at least one required field exists
      return (
        (record['default eventLabelNoRelationship'] || record['updatedEventLabelNoRelationship']) &&
        parseFloat(record['default Expected or Desired Events / Year'] || '0') > 0
      );
    });
    
    // Transform CSV data to activities
    const activities: (ActivityInsert & { userId: number })[] = dataRecords.map(record => {
      // Get the main activity label
      const activityLabel = record['default eventLabelNoRelationship']?.trim() || 
                            record['updatedEventLabelNoRelationship']?.trim() || 
                            'Unnamed Activity';
      
      // Get relationship description (for category)
      const relationship = record['default relationship Label']?.trim() || 
                          record['updatedRelationship']?.trim() || 
                          '';
                          
      // Get the full label with relationship
      const fullLabel = record['default label with relationship']?.trim() || 
                       record['updated label with relationship']?.trim() || 
                       activityLabel;
      
      // Get events per year for frequency calculation
      const eventsPerYear = parseFloat(record['default Expected or Desired Events / Year'] || '0');
      
      // Get hours for duration calculation
      const hoursMin = parseFloat(record['default Hours Min'] || '0');
      const hoursMax = parseFloat(record['default Hours Max'] || '0');
      
      // Calculate duration and frequency
      const { duration, durationUnit } = determineDurationUnit(hoursMin, hoursMax);
      const { frequency, frequencyUnit } = determineFrequencyUnit(eventsPerYear);
      
      // Determine category based on relationship
      let category = 'Personal';
      if (relationship.includes('with Anthony') || 
          relationship.includes('with Partner')) {
        category = 'Relationship';
      } else if (relationship.includes('with Family') || 
                relationship.includes('with Kids')) {
        category = 'Family';
      } else if (relationship.includes('with Friends') || 
                relationship.includes('with Best Friend')) {
        category = 'Social';
      } else if (relationship.includes('for Business') ||
                relationship.includes('for Work')) {
        category = 'Work';
      } else if (relationship.includes('for Holidays')) {
        category = 'Holidays';
      } else if (relationship.includes('with Household')) {
        category = 'Household';
      }
      
      // Get emoji if available
      const emoji = record['default emoji']?.trim() || record['updateEmoji']?.trim() || null;
      
      // Get life impact related fields
      const lifePoints = record['default lifePointsSelector']?.trim() || record['updatedValue lifePoints']?.trim() || null;
      const emotionValue = record['default emotionSelector']?.trim() || record['updatedValue emotionSelector']?.trim() || null;
      const longevityImpact = record['default longevityImpactSelector']?.trim() || record['updatedValue longevityImpactSelector']?.trim() || null;
      
      // Calculate life impact value
      const lifeImpact = calculateLifeImpact(lifePoints, emotionValue, longevityImpact);
      
      // Determine priority (1-5 scale)
      const priority = determinePriority(lifePoints, emotionValue);
      
      // Calculate next due date - default to tomorrow
      const now = new Date();
      const nextDue = new Date();
      nextDue.setDate(now.getDate() + 1);
      nextDue.setHours(9, 0, 0, 0); // Set to 9 AM

      return {
        userId,
        name: fullLabel,
        category,
        frequency,
        frequencyUnit,
        duration,
        durationUnit,
        lifeImpact,
        color: generateRandomColor(),
        priority,
        emoji,
        exportToCalendar: Boolean(parseInt(record['default Calendared'] || '0')),
        completionCount: 0,
        clusterId: null,
        lastCompleted: null,
        nextDue: nextDue 
      };
    });
    
    // Filter out activities with zero frequency (invalid)
    const validActivities = activities.filter(activity => activity.frequency > 0);
    
    // Insert activities in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    let importedCount = 0;
    
    for (let i = 0; i < validActivities.length; i += BATCH_SIZE) {
      const batch = validActivities.slice(i, i + BATCH_SIZE);
      
      for (const activity of batch) {
        try {
          await storage.createActivity(activity);
          importedCount++;
        } catch (error) {
          console.error(`Error importing activity ${activity.name}:`, error);
        }
      }
      
      console.log(`Imported batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(validActivities.length / BATCH_SIZE)}`);
    }
    
    console.log(`Successfully imported ${importedCount} activities for user ${userId}`);
    return importedCount;
  } catch (error) {
    console.error('Error importing activities:', error);
    throw error;
  }
}

// For ES Module environment, we can't use require.main === module
// Instead we can check if this script is being imported or run directly
// The import.meta.url vs process.argv[1] check serves a similar purpose
const isRunningDirectly = import.meta.url === `file://${process.argv[1]}`;

if (isRunningDirectly) {
  // Use a default user ID (admin user) when run directly
  const DEFAULT_USER_ID = 1;
  
  importActivities(DEFAULT_USER_ID).then((count) => {
    console.log(`Import completed: ${count} activities imported`);
    process.exit(0);
  }).catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}