import { UserData, ActivityInsert, User, Activity } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(): Promise<UserData | undefined>;
  createUser(userData: UserData): Promise<UserData>;
  updateUser(userData: UserData): Promise<UserData>;
  deleteUser(): Promise<void>;
  
  // Activity methods
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: ActivityInsert): Promise<Activity>;
  updateActivity(id: number, activity: ActivityInsert): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<void>;
  deleteAllActivities(): Promise<void>;
}

export class MemStorage implements IStorage {
  private user?: UserData;
  private activities: Map<number, Activity>;
  private nextActivityId: number;

  constructor() {
    this.activities = new Map();
    this.nextActivityId = 1;
  }

  // User methods
  async getUser(): Promise<UserData | undefined> {
    return this.user;
  }

  async createUser(userData: UserData): Promise<UserData> {
    this.user = userData;
    return userData;
  }

  async updateUser(userData: UserData): Promise<UserData> {
    this.user = userData;
    return userData;
  }

  async deleteUser(): Promise<void> {
    this.user = undefined;
    this.activities.clear();
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(activityData: ActivityInsert): Promise<Activity> {
    const id = this.nextActivityId++;
    const userId = 1; // Simple userId for in-memory storage
    const activity: Activity = { ...activityData, id, userId };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(id: number, activityData: ActivityInsert): Promise<Activity | undefined> {
    if (!this.activities.has(id)) {
      return undefined;
    }
    
    const existingActivity = this.activities.get(id)!;
    const updatedActivity: Activity = { ...activityData, id, userId: existingActivity.userId };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<void> {
    this.activities.delete(id);
  }

  async deleteAllActivities(): Promise<void> {
    this.activities.clear();
  }
}

export const storage = new MemStorage();
