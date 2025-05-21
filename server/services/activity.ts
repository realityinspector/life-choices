
import { ActivityInsert } from '@shared/schema';
import { db } from '../db';
import { activities } from '@shared/schema';

export async function createActivity(activity: ActivityInsert) {
  const [newActivity] = await db.insert(activities)
    .values(activity)
    .returning();
  return newActivity;
}
