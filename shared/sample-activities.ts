import { Activity } from "./schema";

// Custom type to handle sample activities that we'll transform
// to match the real schema when needed
type SampleActivity = {
  id?: number; // Will be assigned when converted to Activity
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
  userId?: number; // Will be assigned when needed
  completionCount?: number;
  clusterId?: number | null;
  lastCompleted?: Date | null;
  nextDue?: Date;
};

// Function to generate a sample set of activities
export const SAMPLE_ACTIVITIES: SampleActivity[] = [
  {
    name: "Morning Meditation",
    category: "Spirituality & Mindfulness",
    frequency: 7,
    frequencyUnit: "week",
    duration: 15,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#4CAF50",
    priority: 1,
    emoji: "🧘",
    exportToCalendar: false,
  },
  {
    name: "Family Time",
    category: "Family & Relationships",
    frequency: 3, 
    frequencyUnit: "week",
    duration: 90,
    durationUnit: "minute",
    lifeImpact: 9,
    color: "#E91E63",
    priority: 2,
    emoji: "👨‍👩‍👧‍👦",
    exportToCalendar: true,
  },
  {
    name: "Reading Books",
    category: "Learning & Development",
    frequency: 5,
    frequencyUnit: "week",
    duration: 30,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#9C27B0",
    priority: 3,
    emoji: "📚",
    exportToCalendar: false,
  },
  {
    name: "Exercise Routine",
    category: "Health & Fitness",
    frequency: 4,
    frequencyUnit: "week",
    duration: 45,
    durationUnit: "minute",
    lifeImpact: 8,
    color: "#F44336",
    priority: 1,
    emoji: "🏃",
    exportToCalendar: true,
  },
  {
    name: "Journaling",
    category: "Spirituality & Mindfulness",
    frequency: 7,
    frequencyUnit: "week",
    duration: 20,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#673AB7",
    priority: 4,
    emoji: "✏️",
    exportToCalendar: false,
  }
];

// More diverse activities
export const MORE_SAMPLE_ACTIVITIES: SampleActivity[] = [
  {
    name: "Yoga Practice",
    category: "Health & Fitness",
    frequency: 3,
    frequencyUnit: "week",
    duration: 45,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#2196F3",
    priority: 3,
    emoji: "🧘‍♀️",
    exportToCalendar: true,
  },
  {
    name: "Language Learning",
    category: "Learning & Development",
    frequency: 5,
    frequencyUnit: "week",
    duration: 20,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#00BCD4",
    priority: 5,
    emoji: "🗣️",
    exportToCalendar: false,
  },
  {
    name: "Volunteer Work",
    category: "Community & Social",
    frequency: 1,
    frequencyUnit: "week",
    duration: 120,
    durationUnit: "minute",
    lifeImpact: 8,
    color: "#FFEB3B",
    priority: 6,
    emoji: "🤝",
    exportToCalendar: true,
  },
  {
    name: "Career Development",
    category: "Career & Finance",
    frequency: 2,
    frequencyUnit: "week",
    duration: 60,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#795548",
    priority: 2,
    emoji: "💼",
    exportToCalendar: false,
  },
  {
    name: "Meal Preparation",
    category: "Health & Fitness",
    frequency: 1,
    frequencyUnit: "week",
    duration: 90,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#607D8B",
    priority: 4,
    emoji: "🍲",
    exportToCalendar: false,
  },
  {
    name: "Hobby Time",
    category: "Leisure & Recreation",
    frequency: 2,
    frequencyUnit: "week",
    duration: 60,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#FF9800",
    priority: 7,
    emoji: "🎨",
    exportToCalendar: false,
  },
  {
    name: "Digital Detox",
    category: "Spirituality & Mindfulness",
    frequency: 1,
    frequencyUnit: "week",
    duration: 240,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#9E9E9E",
    priority: 8,
    emoji: "📵",
    exportToCalendar: true,
  },
  {
    name: "Nature Walk",
    category: "Health & Fitness",
    frequency: 2,
    frequencyUnit: "week",
    duration: 60,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#8BC34A",
    priority: 5,
    emoji: "🌳",
    exportToCalendar: false,
  },
  {
    name: "Financial Planning",
    category: "Career & Finance",
    frequency: 1,
    frequencyUnit: "month",
    duration: 60,
    durationUnit: "minute",
    lifeImpact: 8,
    color: "#009688",
    priority: 6,
    emoji: "💰",
    exportToCalendar: true,
  },
  {
    name: "Social Gathering",
    category: "Community & Social",
    frequency: 2,
    frequencyUnit: "month",
    duration: 180,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#FF5722",
    priority: 9,
    emoji: "🎉",
    exportToCalendar: true,
  }
];

// Convert a sample activity to an Activity object with all required fields
function convertToActivity(sample: SampleActivity, id: number): Activity {
  return {
    id,
    name: sample.name,
    userId: sample.userId || 999, // Special user ID for sample activities
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

// Combine all sample activities and convert to Activity objects
export const getAllSampleActivities = (): Activity[] => {
  let idCounter = 1000; // Start IDs at 1000 to avoid conflicts with real activities
  const allSamples = [...SAMPLE_ACTIVITIES, ...MORE_SAMPLE_ACTIVITIES];
  
  return allSamples.map(sample => convertToActivity(sample, idCounter++));
};