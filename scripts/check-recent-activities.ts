
import { db } from '../server/db';
import { activities } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function checkRecentActivities() {
  try {
    console.log('Checking 10 most recent activities...');
    console.log('Database connection established');

    const recentActivities = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .orderBy(desc(activities.id))
      .limit(10);

    console.log('\nMost recent activities:');
    console.log('----------------------');
    recentActivities.forEach(activity => {
      console.log(`ID: ${activity.id}`);
      console.log(`Name: ${activity.name}`);
      console.log(`Source: ${activity.source || 'manual'}`);
      console.log(`User ID: ${activity.userId}`);
      console.log(`Created At: ${activity.createdAt}`);
      if (activity.clusterId) {
        console.log(`Cluster ID: ${activity.clusterId}`);
      }
      console.log('----------------------');
    });

  } catch (error) {
    console.error('Error checking recent activities:', error);
  } finally {
    process.exit(0);
  }
}

checkRecentActivities();
