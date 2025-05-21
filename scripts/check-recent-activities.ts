import { db } from '../server/db';
import { activities } from '../shared/schema';
import { desc, sql } from 'drizzle-orm';

async function checkRecentActivities() {
  try {
    console.log('Checking 10 most recent activities...');

    const recentActivities = await db
      .select()
      .from(activities)
      .where(sql`source IS NOT NULL AND source != 'undefined'`)
      .orderBy(desc(activities.id))
      .limit(10);

    console.log('\nMost recent activities:');
    console.log('----------------------');
    recentActivities.forEach(activity => {
      console.log(`ID: ${activity.id}`);
      console.log(`Name: ${activity.name}`);
      console.log(`Source: ${activity.source}`);
      console.log(`User ID: ${activity.userId}`);
      console.log('----------------------');
    });

  } catch (error) {
    console.error('Error checking recent activities:', error);
  } finally {
    process.exit(0);
  }
}

checkRecentActivities();