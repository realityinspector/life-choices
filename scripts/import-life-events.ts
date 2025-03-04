import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { storage } from '../server/storage';
import { InsertLifeEvent, InsertEventCategory } from '../shared/schema';
import path from 'path';

// Define event categories based on the data
const EVENT_CATEGORIES = [
  { name: 'Personal', description: 'Events related to personal life and self-care', color: '#4CAF50' },
  { name: 'Family', description: 'Events related to family and relationships', color: '#2196F3' },
  { name: 'Travel', description: 'Travel and exploration events', color: '#9C27B0' },
  { name: 'Work', description: 'Professional and work-related events', color: '#FF9800' },
  { name: 'Health', description: 'Health and wellness events', color: '#F44336' },
  { name: 'Holidays', description: 'Holiday and celebration events', color: '#3F51B5' },
  { name: 'Education', description: 'Learning and educational events', color: '#00BCD4' },
  { name: 'Financial', description: 'Financial and investment events', color: '#607D8B' },
  { name: 'Social', description: 'Social and community events', color: '#E91E63' },
  { name: 'Household', description: 'Home and household management events', color: '#795548' },
];

// Helper function to determine the event category from the event name
function determineCategory(eventName: string, relationship: string | null): string {
  const lowerName = eventName.toLowerCase();
  const lowerRelationship = relationship?.toLowerCase() || '';
  
  if (lowerName.includes('travel') || lowerName.includes('trip') || 
      lowerRelationship.includes('with anthony') && /angkor|antarctica|barcelona|africa/.test(lowerName)) {
    return 'Travel';
  }
  if (lowerName.includes('holiday') || lowerName.includes('christmas') || 
      lowerName.includes('new year') || lowerName.includes('solstice') || 
      lowerName.includes('thanksgiving')) {
    return 'Holidays';
  }
  if (lowerName.includes('doctor') || lowerName.includes('dentist') || 
      lowerName.includes('health') || lowerName.includes('chiropractor') ||
      lowerName.includes('medical') || lowerName.includes('therapy')) {
    return 'Health';
  }
  if (lowerName.includes('accounting') || lowerName.includes('finance') || 
      lowerName.includes('investment') || lowerName.includes('debt') ||
      lowerName.includes('taxes')) {
    return 'Financial';
  }
  if (lowerName.includes('meeting') || lowerName.includes('work') || 
      lowerName.includes('business') || lowerName.includes('career')) {
    return 'Work';
  }
  if (lowerName.includes('family') || lowerName.includes('parent') || 
      lowerName.includes('child') || lowerName.includes('spouse') || 
      lowerName.includes('anniversary') || lowerRelationship.includes('with family')) {
    return 'Family';
  }
  if (lowerName.includes('read') || lowerName.includes('learn') || 
      lowerName.includes('class') || lowerName.includes('course')) {
    return 'Education';
  }
  if (lowerName.includes('clean') || lowerName.includes('maintenance') || 
      lowerName.includes('home') || lowerName.includes('house')) {
    return 'Household';
  }
  if (lowerName.includes('friend') || lowerName.includes('date') || 
      lowerName.includes('party') || lowerName.includes('social')) {
    return 'Social';
  }
  return 'Personal';
}

// Convert date from MM/DD/YYYY to ISO format (YYYY-MM-DD)
function convertDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const [month, day, year] = dateStr.split('/').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch (err) {
    console.error(`Invalid date format: ${dateStr}`);
    return null;
  }
}

// Convert time from HH:MM to ISO format (HH:MM:00)
function convertTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  try {
    return `${timeStr}:00`;
  } catch (err) {
    console.error(`Invalid time format: ${timeStr}`);
    return null;
  }
}

// Parse currency strings like "$1,000.00" to decimal values
function parseCurrency(currencyStr: string | null): number {
  if (!currencyStr) return 0;
  return parseFloat(currencyStr.replace(/[^0-9.-]+/g, ""));
}

// Clean string values
function cleanString(str: string | null): string | null {
  if (!str) return null;
  return str.trim();
}

// Parse boolean values
function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
}

// Convert a number like 2.5 to a percentage string like "25%"
function convertToPercentageString(value: string | null): string | null {
  if (!value) return null;
  if (value.includes('%')) return value;
  
  try {
    const numValue = parseFloat(value);
    if (numValue <= 1) {
      return `${Math.round(numValue * 100)}%`;
    } else {
      return `${Math.round(numValue)}%`;
    }
  } catch (err) {
    return value;
  }
}

async function importLifeEvents() {
  try {
    // Create categories first
    const categoryMap = new Map<string, number>();
    
    for (const category of EVENT_CATEGORIES) {
      const createdCategory = await storage.createEventCategory(category);
      categoryMap.set(category.name, createdCategory.id);
    }
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'attached_assets', 'backup Copy of sundial oak v3 - eventEditor.csv');
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    
    // Parse the CSV data
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const records: any[] = [];
    for await (const record of parser) {
      records.push(record);
    }
    
    // Skip the header row
    const dataRecords = records.slice(0);
    
    // Transform CSV data to life events
    const lifeEvents: InsertLifeEvent[] = dataRecords.map(record => {
      const eventLabel = cleanString(record['default eventLabelNoRelationship']) || cleanString(record['updatedEventLabelNoRelationship']);
      const relationship = cleanString(record['default relationship Label']) || cleanString(record['updatedRelationship']);
      
      const category = determineCategory(eventLabel || '', relationship);
      const categoryId = categoryMap.get(category);
      
      return {
        label: eventLabel || 'Unnamed Event',
        relationship: relationship,
        categoryId: categoryId,
        eventsPerYear: parseFloat(record['default Expected or Desired Events / Year'] || '0'),
        bonusEvents: parseFloat(record['default Bonus Events'] || '0'),
        isCalendared: Boolean(parseInt(record['default Calendared'] || '0')),
        defaultStartDate: convertDate(record['default Start Date']),
        defaultStartTime: convertTime(record['default Start Time']),
        historicalEventsPerYear: parseFloat(record['default Historical Events / Year'] || '0'),
        hoursMin: parseFloat(record['default Hours Min'] || '0'),
        hoursMax: parseFloat(record['default Hours Max'] || '0'),
        overlapTolerance: convertToPercentageString(record['default Overlap Tolerance']),
        exclusionDayRequired: parseBoolean(record['default Exclusion Day Required?']),
        costMin: parseCurrency(record['default Cost Min']),
        costMax: parseCurrency(record['default Cost Max']),
        valueMin: parseCurrency(record['default Value Min']),
        yearsInLength: parseFloat(record['default Years in Length'] || '0'),
        valueMaxPersonal: parseCurrency(record['default Value Max Personal']),
        peopleValueMultiplier: parseFloat(record['default People Value Multiplier '] || '1'),
        timeVortexMultiplier: parseFloat(record['default Time Vortex Multiplier'] || '1'),
        lovePriorityMultiplier: parseFloat(record['default Love Priority Multiplier '] || '1'),
        motivator: cleanString(record['default motivator']),
        ageStart: parseInt(record['default ageStart'] || '0'),
        ageStop: parseInt(record['default ageStop'] || '100'),
        lifePoints: cleanString(record['default lifePointsSelector']),
        emotionValue: cleanString(record['default emotionSelector']),
        longevityImpact: cleanString(record['default longevityImpactSelector']),
        approvalStatus: cleanString(record['default approvalSelector']) || 'Not Sent',
        emoji: cleanString(record['default emoji']),
        isDefault: true,
      };
    });
    
    // Insert events in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    for (let i = 0; i < lifeEvents.length; i += BATCH_SIZE) {
      const batch = lifeEvents.slice(i, i + BATCH_SIZE);
      await storage.createManyLifeEvents(batch);
      console.log(`Imported batch ${i / BATCH_SIZE + 1} of ${Math.ceil(lifeEvents.length / BATCH_SIZE)}`);
    }
    
    console.log(`Successfully imported ${lifeEvents.length} life events`);
  } catch (error) {
    console.error('Error importing life events:', error);
  }
}

// Run the import
importLifeEvents().then(() => {
  console.log('Import completed');
  process.exit(0);
}).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});