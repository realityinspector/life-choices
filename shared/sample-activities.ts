import { Activity } from "./schema";

// Custom type to handle sample activities that we'll transform
// to match the real schema when needed
type SampleActivity = {
  id?: number;
  name: string;
  category: string;
  frequency: number;
  frequencyUnit: "day" | "week" | "month" | "year";
  duration: number;
  durationUnit: "minute" | "hour";
  lifeImpact: number;
  color: string;
  priority: number | null;
  emoji: string | null;
  exportToCalendar: boolean;
  userId?: number;
  completionCount?: number;
  clusterId?: number | null;
  lastCompleted?: Date | null;
  nextDue?: Date;
};

// Empty arrays - no more sample activities
export const SAMPLE_ACTIVITIES: SampleActivity[] = [];
export const MORE_SAMPLE_ACTIVITIES: SampleActivity[] = [];

// Convert a sample activity to an Activity object with all required fields
function convertToActivity(sample: SampleActivity, id: number): Activity {
  return {
    id,
    name: sample.name,
    userId: sample.userId || 999,
    category: sample.category,
    frequency: sample.frequency,
    frequencyUnit: sample.frequencyUnit,
    duration: sample.duration,
    durationUnit: sample.durationUnit,
    lifeImpact: sample.lifeImpact,
    color: sample.color,
    priority: sample.priority,
    lastCompleted: sample.lastCompleted || null,
    nextDue: sample.nextDue || new Date(),
    completionCount: sample.completionCount || 0,
    exportToCalendar: sample.exportToCalendar,
    emoji: sample.emoji,
    clusterId: sample.clusterId || null
  };
}

// Return empty array since there are no more samples
export const getAllSampleActivities = (): Activity[] => {
  return [];
};