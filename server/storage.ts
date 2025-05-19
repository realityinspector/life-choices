import { UserData, ActivityInsert, User, Activity, users, activities, InsertUser, 
  EventCategory, InsertEventCategory, LifeEvent, InsertLifeEvent, UserLifeEvent, InsertUserLifeEvent, 
  eventCategories, lifeEvents, userLifeEvents, SystemPrompt, InsertSystemPrompt, systemPrompts,
  LLMConversation, InsertLLMConversation, llmConversations, LLMMessage, InsertLLMMessage, llmMessages,
  ActivityCluster, InsertActivityCluster, activityClusters, ActivityInvitation, InsertActivityInvitation, activityInvitations,
  ActivityImage, InsertActivityImage, activityImages } from "@shared/schema";
import { eq, and, isNull, desc, or, lte, gt } from "drizzle-orm";
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
  getNextActivity(userId: number): Promise<Activity | undefined>;
  completeActivity(id: number): Promise<Activity | undefined>;
  skipActivity(id: number): Promise<Activity | undefined>;
  getActivitiesWithImages(userId?: number): Promise<(Activity & { images: ActivityImage[] })[]>;
  
  // Activity image methods
  getActivityImages(activityId?: number): Promise<ActivityImage[]>;
  getActivityImage(id: number): Promise<ActivityImage | undefined>;
  createActivityImage(image: InsertActivityImage): Promise<ActivityImage>;
  deleteActivityImage(id: number): Promise<void>;
  
  // Activity cluster methods
  getActivityClusters(): Promise<ActivityCluster[]>;
  getActivityCluster(id: number): Promise<ActivityCluster | undefined>;
  createActivityCluster(cluster: InsertActivityCluster): Promise<ActivityCluster>;
  updateActivityCluster(id: number, cluster: Partial<InsertActivityCluster>): Promise<ActivityCluster | undefined>;
  deleteActivityCluster(id: number): Promise<void>;
  getActivitiesByCluster(clusterId: number): Promise<Activity[]>;
  
  // Activity invitation methods
  createActivityInvitation(invitation: InsertActivityInvitation): Promise<ActivityInvitation>;
  getActivityInvitation(id: number): Promise<ActivityInvitation | undefined>;
  getActivityInvitationByToken(token: string): Promise<ActivityInvitation | undefined>;
  acceptActivityInvitation(token: string, userId: number): Promise<boolean>;
  deleteActivityInvitation(id: number): Promise<void>;
  getSentInvitations(userId: number): Promise<ActivityInvitation[]>;
  
  // Event category methods
  getEventCategories(): Promise<EventCategory[]>;
  getEventCategory(id: number): Promise<EventCategory | undefined>;
  createEventCategory(category: InsertEventCategory): Promise<EventCategory>;
  updateEventCategory(id: number, category: Partial<InsertEventCategory>): Promise<EventCategory | undefined>;
  deleteEventCategory(id: number): Promise<void>;
  
  // Life event methods
  getLifeEvents(categoryId?: number): Promise<LifeEvent[]>;
  getLifeEvent(id: number): Promise<LifeEvent | undefined>;
  createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent>;
  createManyLifeEvents(events: InsertLifeEvent[]): Promise<LifeEvent[]>;
  updateLifeEvent(id: number, event: Partial<InsertLifeEvent>): Promise<LifeEvent | undefined>;
  deleteLifeEvent(id: number): Promise<void>;
  
  // User life event methods
  getUserLifeEvents(userId: number): Promise<(UserLifeEvent & { event: LifeEvent })[]>;
  getUserLifeEvent(id: number): Promise<(UserLifeEvent & { event: LifeEvent }) | undefined>;
  addUserLifeEvent(userEvent: InsertUserLifeEvent): Promise<UserLifeEvent>;
  updateUserLifeEvent(id: number, userEvent: Partial<InsertUserLifeEvent>): Promise<UserLifeEvent | undefined>;
  removeUserLifeEvent(id: number): Promise<void>;
  
  // System prompt methods
  getSystemPrompts(): Promise<SystemPrompt[]>;
  getSystemPrompt(id: number): Promise<SystemPrompt | undefined>;
  getSystemPromptByName(name: string): Promise<SystemPrompt | undefined>;
  createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt>;
  updateSystemPrompt(id: number, prompt: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined>;
  deleteSystemPrompt(id: number): Promise<void>;
  
  // LLM conversation methods
  getLLMConversations(userId: number): Promise<LLMConversation[]>;
  getLLMConversation(id: number): Promise<LLMConversation | undefined>;
  createLLMConversation(conversation: InsertLLMConversation): Promise<LLMConversation>;
  updateLLMConversation(id: number, conversation: Partial<InsertLLMConversation>): Promise<LLMConversation | undefined>;
  deleteLLMConversation(id: number): Promise<void>;
  
  // LLM message methods
  getLLMMessages(conversationId: number): Promise<LLMMessage[]>;
  getLLMMessage(id: number): Promise<LLMMessage | undefined>;
  createLLMMessage(message: InsertLLMMessage): Promise<LLMMessage>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      pruneSessionInterval: 60, // Prune expired sessions every minute
      errorLog: console.error.bind(console),
    });
  }

  // User methods
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

  // Activity methods
  async getActivities(userId?: number): Promise<Activity[]> {
    if (userId) {
      // If userId is provided, get activities for that user
      return db.select().from(activities).where(eq(activities.userId, userId));
    } else {
      // If no userId is provided, get all activities across all users
      return db.select().from(activities);
    }
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
  
  async getNextActivity(userId: number, skipActivityNames: string[] = []): Promise<Activity | undefined> {
    try {
      const now = new Date();
      
      // First try to get activities that are due now or past due
      let query = db.select()
        .from(activities)
        .where(
          and(
            eq(activities.userId, userId),
            or(
              // Activity is due now (nextDue <= current date)
              lte(activities.nextDue, now),
              // Activity has no next due date set yet
              isNull(activities.nextDue)
            )
          )
        );
        
      // Get all due activities, ordered by:
      // 1. First by priority (higher priority first)
      // 2. Then by creation time (most recently added first) - using 'id' as a proxy for creation time
      // 3. Finally by nextDue date (oldest first)
      // This ensures newly added activities appear at the top if they have the same priority
      const overdueResults = await query.orderBy(
        desc(activities.priority), // Higher priority first
        desc(activities.id),       // Most recently added first (highest ID = newest)
        activities.nextDue         // Oldest due date first
      );
      
      // Log some debug info about the activities found
      console.log(`Found ${overdueResults.length} due activities for user ${userId}`);
      
      // Filter out activities with names in the skipActivityNames list
      // This helps prevent cycling through duplicates
      const filteredOverdueResults = skipActivityNames.length > 0 
        ? overdueResults.filter(activity => !skipActivityNames.includes(activity.name))
        : overdueResults;
      
      // If we have any activities after filtering, return the first one
      if (filteredOverdueResults.length > 0) {
        return filteredOverdueResults[0];
      }
      
      // If no activities are currently due (overdue or unscheduled), return undefined
      // This will trigger the client to show suggested activities instead
      return undefined;
    } catch (error) {
      console.error('Error getting next activity:', error);
      // Return undefined on error, allowing the client to fallback to suggestions
      return undefined;
    }
  }
  
  async skipActivity(id: number): Promise<Activity | undefined> {
    // When a user skips an activity, update the nextDue date to the future
    // using the same logic as completeActivity
    const activity = await this.getActivity(id);
    if (!activity) return undefined;
    
    const now = new Date();
    
    // Calculate when the activity will be due next based on frequency
    let nextDue: Date = new Date(now);
    
    if (activity.frequencyUnit === 'day') {
      nextDue.setDate(nextDue.getDate() + activity.frequency);
    } else if (activity.frequencyUnit === 'week') {
      nextDue.setDate(nextDue.getDate() + (activity.frequency * 7));
    } else if (activity.frequencyUnit === 'month') {
      nextDue.setMonth(nextDue.getMonth() + activity.frequency);
    } else if (activity.frequencyUnit === 'year') {
      nextDue.setFullYear(nextDue.getFullYear() + activity.frequency);
    }
    
    // Update the activity
    const updatedActivity = await db.update(activities)
      .set({
        nextDue: nextDue
      })
      .where(eq(activities.id, id))
      .returning();
    
    return updatedActivity[0];
  }
  
  async completeActivity(id: number): Promise<Activity | undefined> {
    // Mark an activity as completed by updating lastCompleted and nextDue
    const activity = await this.getActivity(id);
    if (!activity) return undefined;
    
    const now = new Date();
    
    // Calculate when the activity will be due next based on frequency
    let nextDue: Date | null = new Date(now);
    
    if (activity.frequencyUnit === 'day') {
      nextDue.setDate(nextDue.getDate() + activity.frequency);
    } else if (activity.frequencyUnit === 'week') {
      nextDue.setDate(nextDue.getDate() + (activity.frequency * 7));
    } else if (activity.frequencyUnit === 'month') {
      nextDue.setMonth(nextDue.getMonth() + activity.frequency);
    } else if (activity.frequencyUnit === 'year') {
      nextDue.setFullYear(nextDue.getFullYear() + activity.frequency);
    }
    
    const result = await db.update(activities)
      .set({
        lastCompleted: now,
        nextDue,
        completionCount: (activity.completionCount || 0) + 1
      })
      .where(eq(activities.id, id))
      .returning();
    
    return result[0];
  }
  
  async getActivitiesWithImages(userId?: number): Promise<(Activity & { images: ActivityImage[] })[]> {
    // First, get all the activities (filtered by userId if provided)
    const allActivities = await this.getActivities(userId);
    
    // Get all activity images
    const allImages = await this.getActivityImages();
    
    // Create a map of activity IDs to their associated images
    const imagesByActivityId = allImages.reduce((map: Record<number, ActivityImage[]>, image) => {
      if (image.activityId) {
        if (!map[image.activityId]) {
          map[image.activityId] = [];
        }
        map[image.activityId].push(image);
      }
      return map;
    }, {});
    
    // Combine activities with their associated images
    return allActivities.map(activity => ({
      ...activity,
      images: imagesByActivityId[activity.id] || []
    }));
  }
  
  // Activity cluster methods
  async getActivityClusters(): Promise<ActivityCluster[]> {
    return db.select().from(activityClusters);
  }
  
  async getActivityCluster(id: number): Promise<ActivityCluster | undefined> {
    const result = await db.select().from(activityClusters).where(eq(activityClusters.id, id));
    return result[0];
  }
  
  async createActivityCluster(cluster: InsertActivityCluster): Promise<ActivityCluster> {
    const result = await db.insert(activityClusters).values(cluster).returning();
    return result[0];
  }
  
  async updateActivityCluster(id: number, cluster: Partial<InsertActivityCluster>): Promise<ActivityCluster | undefined> {
    const existingCluster = await this.getActivityCluster(id);
    if (!existingCluster) {
      return undefined;
    }
    
    const result = await db.update(activityClusters)
      .set(cluster)
      .where(eq(activityClusters.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteActivityCluster(id: number): Promise<void> {
    await db.delete(activityClusters).where(eq(activityClusters.id, id));
  }
  
  async getActivitiesByCluster(clusterId: number): Promise<Activity[]> {
    return db.select()
      .from(activities)
      .where(eq(activities.clusterId, clusterId));
  }
  
  // Activity invitation methods
  async createActivityInvitation(invitation: InsertActivityInvitation): Promise<ActivityInvitation> {
    const result = await db.insert(activityInvitations).values(invitation).returning();
    return result[0];
  }
  
  async getActivityInvitation(id: number): Promise<ActivityInvitation | undefined> {
    const result = await db.select().from(activityInvitations).where(eq(activityInvitations.id, id));
    return result[0];
  }
  
  async getActivityInvitationByToken(token: string): Promise<ActivityInvitation | undefined> {
    const result = await db.select().from(activityInvitations).where(eq(activityInvitations.invitationToken, token));
    return result[0];
  }
  
  async acceptActivityInvitation(token: string, userId: number): Promise<boolean> {
    const invitation = await this.getActivityInvitationByToken(token);
    if (!invitation) return false;
    
    // Get the original activity
    const originalActivity = await this.getActivity(invitation.activityId);
    if (!originalActivity) return false;
    
    // Set nextDue to a date in the past so it appears immediately in What's Next
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const nextDue = yesterday;
    
    // Create a copy of the activity for the new user with immediate due date
    const activityCopy: ActivityInsert & { userId: number, nextDue: Date } = {
      userId,
      name: originalActivity.name,
      category: originalActivity.category,
      frequency: originalActivity.frequency,
      frequencyUnit: originalActivity.frequencyUnit as any,
      duration: originalActivity.duration,
      durationUnit: originalActivity.durationUnit as any,
      lifeImpact: originalActivity.lifeImpact,
      color: originalActivity.color,
      priority: originalActivity.priority,
      emoji: originalActivity.emoji,
      exportToCalendar: originalActivity.exportToCalendar,
      clusterId: originalActivity.clusterId,
      nextDue
    };
    
    await this.createActivity(activityCopy);
    
    // Mark invitation as accepted
    await db.update(activityInvitations)
      .set({ accepted: true })
      .where(eq(activityInvitations.id, invitation.id));
    
    return true;
  }
  
  async deleteActivityInvitation(id: number): Promise<void> {
    await db.delete(activityInvitations).where(eq(activityInvitations.id, id));
  }
  
  async getSentInvitations(userId: number): Promise<ActivityInvitation[]> {
    return db.select()
      .from(activityInvitations)
      .where(eq(activityInvitations.senderUserId, userId));
  }
  
  // Activity image methods
  async getActivityImages(activityId?: number): Promise<ActivityImage[]> {
    if (activityId) {
      return db.select().from(activityImages).where(eq(activityImages.activityId, activityId));
    }
    return db.select().from(activityImages);
  }
  
  async getActivityImage(id: number): Promise<ActivityImage | undefined> {
    const result = await db.select().from(activityImages).where(eq(activityImages.id, id));
    return result[0];
  }
  
  async createActivityImage(image: InsertActivityImage): Promise<ActivityImage> {
    const result = await db.insert(activityImages).values(image).returning();
    return result[0];
  }
  
  async deleteActivityImage(id: number): Promise<void> {
    await db.delete(activityImages).where(eq(activityImages.id, id));
  }
  
  // Event category methods
  async getEventCategories(): Promise<EventCategory[]> {
    return db.select().from(eventCategories);
  }
  
  async getEventCategory(id: number): Promise<EventCategory | undefined> {
    const result = await db.select().from(eventCategories).where(eq(eventCategories.id, id));
    return result[0];
  }
  
  async createEventCategory(category: InsertEventCategory): Promise<EventCategory> {
    const result = await db.insert(eventCategories).values(category).returning();
    return result[0];
  }
  
  async updateEventCategory(id: number, category: Partial<InsertEventCategory>): Promise<EventCategory | undefined> {
    const existingCategory = await this.getEventCategory(id);
    if (!existingCategory) {
      return undefined;
    }
    
    const result = await db.update(eventCategories)
      .set(category)
      .where(eq(eventCategories.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteEventCategory(id: number): Promise<void> {
    await db.delete(eventCategories).where(eq(eventCategories.id, id));
  }
  
  // Life event methods
  async getLifeEvents(categoryId?: number): Promise<LifeEvent[]> {
    if (categoryId) {
      return db.select().from(lifeEvents).where(eq(lifeEvents.categoryId, categoryId));
    }
    return db.select().from(lifeEvents);
  }
  
  async getLifeEvent(id: number): Promise<LifeEvent | undefined> {
    const result = await db.select().from(lifeEvents).where(eq(lifeEvents.id, id));
    return result[0];
  }
  
  async createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent> {
    const result = await db.insert(lifeEvents).values(event).returning();
    return result[0];
  }
  
  async createManyLifeEvents(events: InsertLifeEvent[]): Promise<LifeEvent[]> {
    const result = await db.insert(lifeEvents).values(events).returning();
    return result;
  }
  
  async updateLifeEvent(id: number, event: Partial<InsertLifeEvent>): Promise<LifeEvent | undefined> {
    const existingEvent = await this.getLifeEvent(id);
    if (!existingEvent) {
      return undefined;
    }
    
    const result = await db.update(lifeEvents)
      .set(event)
      .where(eq(lifeEvents.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteLifeEvent(id: number): Promise<void> {
    await db.delete(lifeEvents).where(eq(lifeEvents.id, id));
  }
  
  // User life event methods
  async getUserLifeEvents(userId: number): Promise<(UserLifeEvent & { event: LifeEvent })[]> {
    const userEvents = await db.select().from(userLifeEvents).where(eq(userLifeEvents.userId, userId));
    
    const result = [];
    for (const userEvent of userEvents) {
      const event = await this.getLifeEvent(userEvent.lifeEventId);
      if (event) {
        result.push({ ...userEvent, event });
      }
    }
    
    return result;
  }
  
  async getUserLifeEvent(id: number): Promise<(UserLifeEvent & { event: LifeEvent }) | undefined> {
    const userEvent = await db.select().from(userLifeEvents).where(eq(userLifeEvents.id, id)).then(res => res[0]);
    if (!userEvent) return undefined;
    
    const event = await this.getLifeEvent(userEvent.lifeEventId);
    if (!event) return undefined;
    
    return { ...userEvent, event };
  }
  
  async addUserLifeEvent(userEvent: InsertUserLifeEvent): Promise<UserLifeEvent> {
    const result = await db.insert(userLifeEvents).values(userEvent).returning();
    return result[0];
  }
  
  async updateUserLifeEvent(id: number, userEvent: Partial<InsertUserLifeEvent>): Promise<UserLifeEvent | undefined> {
    const existingUserEvent = await db.select().from(userLifeEvents).where(eq(userLifeEvents.id, id)).then(res => res[0]);
    if (!existingUserEvent) {
      return undefined;
    }
    
    const result = await db.update(userLifeEvents)
      .set(userEvent)
      .where(eq(userLifeEvents.id, id))
      .returning();
    
    return result[0];
  }
  
  async removeUserLifeEvent(id: number): Promise<void> {
    await db.delete(userLifeEvents).where(eq(userLifeEvents.id, id));
  }

  // System prompt methods
  async getSystemPrompts(): Promise<SystemPrompt[]> {
    return db.select().from(systemPrompts);
  }
  
  async getSystemPrompt(id: number): Promise<SystemPrompt | undefined> {
    const result = await db.select().from(systemPrompts).where(eq(systemPrompts.id, id));
    return result[0];
  }
  
  async getSystemPromptByName(name: string): Promise<SystemPrompt | undefined> {
    const result = await db.select().from(systemPrompts).where(eq(systemPrompts.name, name));
    return result[0];
  }
  
  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const result = await db.insert(systemPrompts).values(prompt).returning();
    return result[0];
  }
  
  async updateSystemPrompt(id: number, prompt: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined> {
    const existingPrompt = await this.getSystemPrompt(id);
    if (!existingPrompt) {
      return undefined;
    }
    
    const result = await db.update(systemPrompts)
      .set({
        ...prompt,
        updatedAt: new Date()
      })
      .where(eq(systemPrompts.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteSystemPrompt(id: number): Promise<void> {
    await db.delete(systemPrompts).where(eq(systemPrompts.id, id));
  }
  
  // LLM conversation methods
  async getLLMConversations(userId: number): Promise<LLMConversation[]> {
    return db.select()
      .from(llmConversations)
      .where(eq(llmConversations.userId, userId))
      .orderBy(desc(llmConversations.updatedAt));
  }
  
  async getLLMConversation(id: number): Promise<LLMConversation | undefined> {
    const result = await db.select().from(llmConversations).where(eq(llmConversations.id, id));
    return result[0];
  }
  
  async createLLMConversation(conversation: InsertLLMConversation): Promise<LLMConversation> {
    const result = await db.insert(llmConversations).values(conversation).returning();
    return result[0];
  }
  
  async updateLLMConversation(id: number, conversation: Partial<InsertLLMConversation>): Promise<LLMConversation | undefined> {
    const existingConversation = await this.getLLMConversation(id);
    if (!existingConversation) {
      return undefined;
    }
    
    const result = await db.update(llmConversations)
      .set({
        ...conversation,
        updatedAt: new Date()
      })
      .where(eq(llmConversations.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteLLMConversation(id: number): Promise<void> {
    await db.delete(llmConversations).where(eq(llmConversations.id, id));
  }
  
  // LLM message methods
  async getLLMMessages(conversationId: number): Promise<LLMMessage[]> {
    return db.select()
      .from(llmMessages)
      .where(eq(llmMessages.conversationId, conversationId))
      .orderBy(llmMessages.createdAt);
  }
  
  async getLLMMessage(id: number): Promise<LLMMessage | undefined> {
    const result = await db.select().from(llmMessages).where(eq(llmMessages.id, id));
    return result[0];
  }
  
  async createLLMMessage(message: InsertLLMMessage): Promise<LLMMessage> {
    const result = await db.insert(llmMessages).values(message).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
