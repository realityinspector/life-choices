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
  "event_categories",
  "life_events",
  "user_life_events",
  "system_prompts",
  "llm_conversations",
  "llm_messages",
  "session" // Express session table
];