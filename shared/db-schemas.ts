/**
 * List of all database table names used in the application.
 * This list is used for backup and restore operations.
 */
export const DB_SCHEMAS = [
  "users",
  "activities",
  "activity_clusters",
  "activity_invitations",
  "activity_images",
  "life_events",
  "event_categories",
  "user_life_events",
  "system_prompts",
  "llm_conversations",
  "llm_messages",
  "sessions" // Express session table
];