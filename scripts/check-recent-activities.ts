import { db } from '../server/db';
import { activities } from '../shared/schema';
import { desc, sql } from 'drizzle-orm';

async function checkRecentActivities() {
  try {
    console.log('Checking 10 most recent activities...');

    const recentActivities = await db
      .select()
      .from(activities)
      .where(sql`source IS NOT NULL`)
      .orderBy(desc(activities.createdAt))
      .orderBy(desc(activities.id))
      .limit(10);

    console.log('\nMost recent activities:');
    console.log('----------------------');
    recentActivities.forEach(activity => {
      console.log(`ID: ${activity.id}`);
      console.log(`Name: ${activity.name}`);
      console.log(`Source: ${activity.source}`);
      console.log(`User ID: ${activity.userId}`);
      console.log(`Created At: ${activity.createdAt}`);
      if (activity.clusterId) {
        console.log(`Cluster ID: ${activity.clusterId}`);
      }
      console.log(`Description: ${activity.description || 'No description'}`);
      console.log('----------------------');
    });

  } catch (error) {
    console.error('Error checking recent activities:', error);
  } finally {
    process.exit(0);
  }
}

checkRecentActivities();
import { db } from '../server/db';
import { activities } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function checkRecentActivities() {
  try {
    const recentActivities = await db.select({
      id: activities.id,
      name: activities.name,
      source: activities.source,
      userId: activities.userId,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .orderBy(desc(activities.createdAt))
    .limit(10);

    console.log('Checking 10 most recent activities...');
    console.log('Database connection established');
    console.table(recentActivities);
  } catch (error) {
    console.error('Error checking recent activities:', error);
  }
}

checkRecentActivities();
