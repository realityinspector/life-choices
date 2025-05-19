import { pgTable, text, serial, integer, boolean, real, json, varchar, timestamp, date, time, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System Prompts schema
export const systemPrompts = pgTable("system_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  content: text("content").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// LLM Conversation schema
export const llmConversations = pgTable("llm_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// LLM Messages schema
export const llmMessages = pgTable("llm_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => llmConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'system', 'user', 'assistant'
  content: text("content").notNull(),
  systemPromptId: integer("system_prompt_id").references(() => systemPrompts.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create schemas for insert
export const systemPromptSchema = createInsertSchema(systemPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const llmConversationSchema = createInsertSchema(llmConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const llmMessageSchema = createInsertSchema(llmMessages).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type InsertSystemPrompt = typeof systemPrompts.$inferInsert;

export type LLMConversation = typeof llmConversations.$inferSelect;
export type InsertLLMConversation = typeof llmConversations.$inferInsert;

export type LLMMessage = typeof llmMessages.$inferSelect;
export type InsertLLMMessage = typeof llmMessages.$inferInsert;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  age: integer("age").default(30),
  lifeExpectancy: integer("life_expectancy").default(85),
  sleepHours: real("sleep_hours").default(8),
});

export const userSchema = createInsertSchema(users).omit({
  id: true,
});

export const userAuthSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export type UserAuth = z.infer<typeof userAuthSchema>;
export type UserData = z.infer<typeof userSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  frequency: integer("frequency").notNull(),
  frequencyUnit: text("frequency_unit").notNull(),
  duration: integer("duration").notNull(),
  durationUnit: text("duration_unit").notNull(),
  lifeImpact: real("life_impact").notNull().default(0),
  color: text("color").notNull(),
  priority: integer("priority").default(1), // 1-5 priority level
  lastCompleted: timestamp("last_completed"), // When was this last completed
  nextDue: timestamp("next_due"), // When is it next due
  completionCount: integer("completion_count").default(0), // How many times completed
  exportToCalendar: boolean("export_to_calendar").default(false), // Export to calendar option
  emoji: text("emoji"), // Emoji representation
  clusterId: integer("cluster_id"), // For grouping related activities
});

// Activity clusters (groups of related activities)
export const activityClusters = pgTable("activity_clusters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  goal: text("goal"),
  emoji: text("emoji"),
  color: text("color").notNull(),
  isTemplate: boolean("is_template").default(false), // Is this a template that can be added in bulk
  createdAt: timestamp("created_at").defaultNow(),
});

// Shared activity invitations
export const activityInvitations = pgTable("activity_invitations", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email"),
  invitationToken: text("invitation_token").notNull(),
  accepted: boolean("accepted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const activitySchema = createInsertSchema(activities).omit({
  id: true,
  userId: true,
  lastCompleted: true,
  nextDue: true,
  completionCount: true,
});

export const activityClusterSchema = createInsertSchema(activityClusters).omit({
  id: true,
  createdAt: true,
});

export const activityInvitationSchema = createInsertSchema(activityInvitations).omit({
  id: true,
  createdAt: true,
});

export type ActivityInsert = Omit<z.infer<typeof activitySchema>, "frequencyUnit" | "durationUnit"> & {
  frequencyUnit: "day" | "week" | "month" | "year";
  durationUnit: "minute" | "hour";
};

export type ActivityCluster = typeof activityClusters.$inferSelect;
export type InsertActivityCluster = typeof activityClusters.$inferInsert;

export type ActivityInvitation = typeof activityInvitations.$inferSelect;
export type InsertActivityInvitation = typeof activityInvitations.$inferInsert;

export type Activity = typeof activities.$inferSelect;

// Life Event schema
export const lifeEvents = pgTable("life_events", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  relationship: text("relationship"),
  categoryId: integer("category_id").references(() => eventCategories.id),
  eventsPerYear: real("events_per_year").default(0),
  bonusEvents: real("bonus_events").default(0),
  isCalendared: boolean("is_calendared").default(false),
  defaultStartDate: date("default_start_date"),
  defaultStartTime: time("default_start_time"),
  historicalEventsPerYear: real("historical_events_per_year").default(0),
  hoursMin: real("hours_min").default(0),
  hoursMax: real("hours_max").default(0),
  overlapTolerance: text("overlap_tolerance"),
  exclusionDayRequired: boolean("exclusion_day_required").default(false),
  costMin: decimal("cost_min", { precision: 10, scale: 2 }).default("0"),
  costMax: decimal("cost_max", { precision: 10, scale: 2 }).default("0"),
  valueMin: decimal("value_min", { precision: 10, scale: 2 }).default("0"),
  yearsInLength: real("years_in_length").default(0),
  valueMaxPersonal: decimal("value_max_personal", { precision: 10, scale: 2 }).default("0"),
  peopleValueMultiplier: real("people_value_multiplier").default(1),
  timeVortexMultiplier: real("time_vortex_multiplier").default(1),
  lovePriorityMultiplier: real("love_priority_multiplier").default(1),
  motivator: text("motivator"),
  ageStart: integer("age_start").default(0),
  ageStop: integer("age_stop").default(100),
  lifePoints: text("life_points"),
  emotionValue: text("emotion_value"),
  longevityImpact: text("longevity_impact"),
  approvalStatus: text("approval_status").default("Not Sent"),
  emoji: text("emoji"),
  isDefault: boolean("is_default").default(true),
});

// Event Categories schema
export const eventCategories = pgTable("event_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color"),
});

// User Life Events junction table
export const userLifeEvents = pgTable("user_life_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lifeEventId: integer("life_event_id").notNull().references(() => lifeEvents.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  dateAdded: timestamp("date_added").defaultNow(),
  customLabel: text("custom_label"),
  customRelationship: text("custom_relationship"),
  customEventsPerYear: real("custom_events_per_year"),
  customStartDate: date("custom_start_date"),
  customHoursMin: real("custom_hours_min"),
  customHoursMax: real("custom_hours_max"),
});

// Create schemas for insert
export const eventCategorySchema = createInsertSchema(eventCategories).omit({
  id: true,
});

export const lifeEventSchema = createInsertSchema(lifeEvents).omit({
  id: true,
});

export const userLifeEventSchema = createInsertSchema(userLifeEvents).omit({
  id: true,
  dateAdded: true,
});

// Type definitions
export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventCategory = typeof eventCategories.$inferInsert;

export type LifeEvent = typeof lifeEvents.$inferSelect;
export type InsertLifeEvent = typeof lifeEvents.$inferInsert;

export type UserLifeEvent = typeof userLifeEvents.$inferSelect;
export type InsertUserLifeEvent = typeof userLifeEvents.$inferInsert;

// Activity Images schema
export const activityImages = pgTable("activity_images", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityImageSchema = createInsertSchema(activityImages).omit({
  id: true,
  createdAt: true,
});

export type ActivityImage = typeof activityImages.$inferSelect;
export type InsertActivityImage = typeof activityImages.$inferInsert;
