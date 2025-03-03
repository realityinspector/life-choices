import { pgTable, text, serial, integer, boolean, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  lifeExpectancy: integer("life_expectancy").notNull(),
  sleepHours: real("sleep_hours").notNull(),
});

export const userSchema = createInsertSchema(users).omit({
  id: true,
});

export type UserData = z.infer<typeof userSchema>;
export type User = typeof users.$inferSelect;

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
