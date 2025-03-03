import { pgTable, text, serial, integer, boolean, real, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  lifeExpectancy: integer("life_expectancy").notNull(),
  sleepHours: real("sleep_hours").notNull(),
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
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  frequency: integer("frequency").notNull(),
  frequencyUnit: text("frequency_unit").notNull(),
  duration: integer("duration").notNull(),
  durationUnit: text("duration_unit").notNull(),
  lifeImpact: real("life_impact").notNull().default(0),
  color: text("color").notNull(),
});

export const activitySchema = createInsertSchema(activities).omit({
  id: true,
  userId: true,
});

export type ActivityInsert = Omit<z.infer<typeof activitySchema>, "frequencyUnit" | "durationUnit"> & {
  frequencyUnit: "day" | "week" | "month" | "year";
  durationUnit: "minute" | "hour";
};

export type Activity = typeof activities.$inferSelect;
