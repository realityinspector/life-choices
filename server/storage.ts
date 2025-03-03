import { UserData, ActivityInsert, User, Activity, users, activities, InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import pgSessionPkg from "connect-pg-simple";
import { pool, db } from "./db";

// Import connect-pg-simple with CommonJS-style import
const PostgresSessionStore = pgSessionPkg(session);

export interface IStorage {
  // User methods
  getUser(id?: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<UserData>): Promise<User>;
  deleteUser(id?: number): Promise<void>;
  
  // Activity methods
  getActivities(userId?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: ActivityInsert & { userId: number }): Promise<Activity>;
  updateActivity(id: number, activity: ActivityInsert): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<void>;
  deleteAllActivities(userId?: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id?: number): Promise<User | undefined> {
    if (!id) return undefined;
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<UserData>): Promise<User> {
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id?: number): Promise<void> {
    if (!id) return;
    await db.delete(users).where(eq(users.id, id));
    await this.deleteAllActivities(id); // Cascade delete user's activities
  }

  async getActivities(userId?: number): Promise<Activity[]> {
    if (!userId) return [];
    return db.select().from(activities).where(eq(activities.userId, userId));
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const result = await db.select().from(activities).where(eq(activities.id, id));
    return result[0];
  }

  async createActivity(activityData: ActivityInsert & { userId: number }): Promise<Activity> {
    const result = await db.insert(activities).values(activityData).returning();
    return result[0];
  }

  async updateActivity(id: number, activityData: ActivityInsert): Promise<Activity | undefined> {
    const existingActivity = await this.getActivity(id);
    
    if (!existingActivity) {
      return undefined;
    }
    
    const result = await db.update(activities)
      .set({ ...activityData })
      .where(eq(activities.id, id))
      .returning();
    
    return result[0];
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async deleteAllActivities(userId?: number): Promise<void> {
    if (!userId) return;
    await db.delete(activities).where(eq(activities.userId, userId));
  }
}

export const storage = new DatabaseStorage();
