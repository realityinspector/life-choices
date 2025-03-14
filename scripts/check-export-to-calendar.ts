/**
 * This script checks the exportToCalendar field values in the database
 * to help debug calendar export issues.
 */
import { storage } from '../server/storage';
import { db } from '../server/db';
import { activities } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function checkExportToCalendarValues() {
  console.log('Checking exportToCalendar field values...');
  
  try {
    // First check using storage
    console.log('\n=== Using Storage Interface ===');
    const allActivities = await storage.getActivities();
    console.log(`Total activities found: ${allActivities.length}`);
    
    // Count activities with exportToCalendar true/false/null/undefined
    const trueCount = allActivities.filter(a => a.exportToCalendar === true).length;
    const falseCount = allActivities.filter(a => a.exportToCalendar === false).length;
    const nullCount = allActivities.filter(a => a.exportToCalendar === null).length;
    const undefinedCount = allActivities.filter(a => a.exportToCalendar === undefined).length;
    
    console.log(`exportToCalendar === true: ${trueCount}`);
    console.log(`exportToCalendar === false: ${falseCount}`);
    console.log(`exportToCalendar === null: ${nullCount}`);
    console.log(`exportToCalendar === undefined: ${undefinedCount}`);
    
    // Now check directly with SQL for comparison
    console.log('\n=== Using Direct SQL Query ===');
    const sqlResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN export_to_calendar IS NULL THEN 'null'
          WHEN export_to_calendar = true THEN 'true'
          WHEN export_to_calendar = false THEN 'false'
          ELSE 'unknown'
        END as export_status,
        COUNT(*) as count
      FROM activities
      GROUP BY export_status
    `);
    
    console.log('SQL Results:', sqlResult.rows);
    
    // Show some example activities
    console.log('\n=== Sample Activities ===');
    const sampleActivities = allActivities.slice(0, 5);
    sampleActivities.forEach(activity => {
      console.log(`ID: ${activity.id}, Name: ${activity.name}, exportToCalendar: ${activity.exportToCalendar}`);
    });
    
    // Success
    console.log('\nCheck completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error checking exportToCalendar values:', error);
    process.exit(1);
  }
}

// Run the function
checkExportToCalendarValues();