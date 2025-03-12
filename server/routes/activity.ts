import { Router, Request } from 'express';
import { storage } from '../storage';
import { ActivityInsert, activitySchema } from '@shared/schema';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Helper function to ensure correct type assertions for ActivityInsert
function ensureActivityTypes(data: any): ActivityInsert {
  return {
    ...data,
    frequencyUnit: data.frequencyUnit as "day" | "week" | "month" | "year",
    durationUnit: data.durationUnit as "minute" | "hour"
  };
}

// Type guard for authentication
function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated();
}

// Type for request.user with User ID
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    name: string;
    age: number;
    lifeExpectancy: number;
    sleepHours: number;
    [key: string]: any;
  };
}

export const activityRouter = Router();

// Get all activities for the logged-in user
activityRouter.get('/', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // @ts-ignore - user will always exist due to isAuthenticated check
  const userId = req.user.id;
  const activities = await storage.getActivities(userId);
  res.json(activities);
});

// Get all activities with associated images for the logged-in user
activityRouter.get('/with-images', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // @ts-ignore - user will always exist due to isAuthenticated check
    const userId = req.user.id;
    const activitiesWithImages = await storage.getActivitiesWithImages(userId);
    res.json(activitiesWithImages);
  } catch (err: unknown) {
    console.error("Error fetching activities with images:", err);
  }
});

// Get all activities in the system for the shop (no user filtering)
activityRouter.get('/shop', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Fetch all activities without filtering by user
    const allActivities = await storage.getActivities();
    
    // Get query parameters for additional filtering
    const { category, impact, duration } = req.query;
    
    // Apply server-side filtering if requested
    let filteredActivities = [...allActivities];
    
    // Filter by category if specified
    if (category && typeof category === 'string') {
      filteredActivities = filteredActivities.filter(
        activity => activity.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by minimum impact if specified
    if (impact && typeof impact === 'string') {
      const minImpact = parseInt(impact, 10);
      if (!isNaN(minImpact)) {
        filteredActivities = filteredActivities.filter(
          activity => (activity.lifeImpact || 0) >= minImpact
        );
      }
    }
    
    // Filter by maximum duration if specified (in minutes)
    if (duration && typeof duration === 'string') {
      const maxDuration = parseInt(duration, 10);
      if (!isNaN(maxDuration)) {
        filteredActivities = filteredActivities.filter(activity => {
          // Convert to minutes for comparison
          const durationInMinutes = activity.durationUnit === 'hour' 
            ? activity.duration * 60 
            : activity.duration;
          return durationInMinutes <= maxDuration;
        });
      }
    }
    
    res.json(filteredActivities);
  } catch (err: unknown) {
    console.error("Error fetching shop activities:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to fetch shop activities",
      details: errorMessage
    });
  }
});

// Get all activities with their images for the shop (no user filtering)
activityRouter.get('/shop/with-images', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Pass undefined as userId to fetch all activities with images without filtering
    const activitiesWithImages = await storage.getActivitiesWithImages();
    
    // Get query parameters for additional filtering
    const { category, impact, duration } = req.query;
    
    // Apply server-side filtering if requested
    let filteredActivities = [...activitiesWithImages];
    
    // Filter by category if specified
    if (category && typeof category === 'string') {
      filteredActivities = filteredActivities.filter(
        activity => activity.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by minimum impact if specified
    if (impact && typeof impact === 'string') {
      const minImpact = parseInt(impact, 10);
      if (!isNaN(minImpact)) {
        filteredActivities = filteredActivities.filter(
          activity => (activity.lifeImpact || 0) >= minImpact
        );
      }
    }
    
    // Filter by maximum duration if specified (in minutes)
    if (duration && typeof duration === 'string') {
      const maxDuration = parseInt(duration, 10);
      if (!isNaN(maxDuration)) {
        filteredActivities = filteredActivities.filter(activity => {
          // Convert to minutes for comparison
          const durationInMinutes = activity.durationUnit === 'hour' 
            ? activity.duration * 60 
            : activity.duration;
          return durationInMinutes <= maxDuration;
        });
      }
    }
    
    res.json(filteredActivities);
  } catch (err: unknown) {
    console.error("Error fetching shop activities with images:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to fetch shop activities with images",
      details: errorMessage
    });
  }
});

// Get next activity suggestion
activityRouter.get('/next', async (req: AuthenticatedRequest, res) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid user ID" });
    }
    
    // Check for skipNames query parameter that allows clients
    // to exclude activities with specific names
    const skipNames = req.query.skipNames 
      ? Array.isArray(req.query.skipNames) 
        ? req.query.skipNames.map(name => String(name))
        : [String(req.query.skipNames)] 
      : [];
      
    // Also check for skipDuplicates flag - if true, we'll detect and skip activities with the same name
    const skipDuplicates = req.query.skipDuplicates === 'true';
    
    // If we want to skip duplicates, get user's activities to check for duplicates
    let namesToSkip = [...skipNames];
    
    try {
      if (skipDuplicates) {
        // Get all activities for this user to check for duplicates
        const allActivities = await storage.getActivities(userId);
        
        // Group activities by name to find duplicates
        const activitiesByName: Record<string, number> = {};
        
        allActivities.forEach(activity => {
          activitiesByName[activity.name] = (activitiesByName[activity.name] || 0) + 1;
        });
        
        // Add names of duplicate activities to the skip list
        for (const [name, count] of Object.entries(activitiesByName)) {
          if (count > 1 && !namesToSkip.includes(name)) {
            namesToSkip.push(name);
          }
        }
      }
      
      // Get the next activity, passing the list of activity names to skip
      const nextActivity = await storage.getNextActivity(userId, namesToSkip);
      
      if (!nextActivity) {
        return res.status(404).json({ 
          message: "No activities found",
          suggestion: "show_recommendations" 
        });
      }
      
      res.json(nextActivity);
    } catch (dbError) {
      console.error("Database error fetching activities:", dbError);
      // Return a specific error so the client knows to show recommendations
      return res.status(503).json({ 
        message: "Database unavailable",
        suggestion: "show_recommendations",
        error: dbError instanceof Error ? dbError.message : "Unknown database error"
      });
    }
  } catch (error) {
    console.error("Error in /next endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch next activity",
      suggestion: "show_recommendations",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get activities by cluster
activityRouter.get('/cluster/:clusterId', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { clusterId } = req.params;
  const activities = await storage.getActivitiesByCluster(parseInt(clusterId));
  res.json(activities);
});

// Create new activity
activityRouter.post('/', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const userId = req.user.id;
    const parsed = activitySchema.parse(req.body);
    
    // IMPORTANT: Set nextDue to a timestamp in the past to ensure it shows up immediately
    // This makes the activity appear as "overdue" so it shows up right away in "What's Next"
    // We subtract 1 day to ensure it's in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const nextDue = yesterday;
    
    // If the request specifically asks for the activity to be scheduled in the future
    // via a query parameter, then calculate the future date
    if (req.query.scheduleForLater === 'true') {
      // Set nextDue to the current time first
      const futureDate = new Date();
      if (parsed.frequencyUnit === 'day') {
        futureDate.setDate(futureDate.getDate() + parsed.frequency);
      } else if (parsed.frequencyUnit === 'week') {
        futureDate.setDate(futureDate.getDate() + (parsed.frequency * 7));
      } else if (parsed.frequencyUnit === 'month') {
        futureDate.setMonth(futureDate.getMonth() + parsed.frequency);
      } else if (parsed.frequencyUnit === 'year') {
        futureDate.setFullYear(futureDate.getFullYear() + parsed.frequency);
      }
      // Override the default past date with the future date if scheduled later
      nextDue.setTime(futureDate.getTime());
    }
    
    const typedActivity = ensureActivityTypes(parsed);
    
    const activityData: ActivityInsert & { userId: number, nextDue: Date } = {
      ...typedActivity,
      userId: userId,
      nextDue
    };
    
    const activity = await storage.createActivity(activityData);
    console.log("Created activity:", activity);
    res.json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Error creating activity:', error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  }
});

// Update activity
activityRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this activity" });
    }
    
    const parsed = activitySchema.parse(req.body);
    const typedActivity = ensureActivityTypes(parsed);
    const updatedActivity = await storage.updateActivity(activityId, typedActivity);
    
    res.json(updatedActivity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Error updating activity:', error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  }
});

// Complete an activity
activityRouter.post('/:id/complete', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to complete this activity" });
    }
    
    const updatedActivity = await storage.completeActivity(activityId);
    res.json(updatedActivity);
  } catch (error) {
    console.error('Error completing activity:', error);
    res.status(500).json({ message: "Failed to complete activity" });
  }
});

// Delete activity
activityRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this activity" });
    }
    
    await storage.deleteActivity(activityId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ message: "Failed to delete activity" });
  }
});

// Delete all activities
activityRouter.delete('/', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const userId = req.user.id;
    await storage.deleteAllActivities(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting all activities:', error);
    res.status(500).json({ message: "Failed to delete all activities" });
  }
});

// Share activity with someone
activityRouter.post('/share', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const userId = req.user.id;
    const { activity, recipientEmail } = req.body;
    
    if (!activity || !recipientEmail) {
      return res.status(400).json({ message: "Activity and recipient email are required" });
    }
    
    // First, create the activity
    const parsed = activitySchema.parse(activity);
    
    // IMPORTANT: Set nextDue to a timestamp in the past for shared activities too
    // This makes the activity appear as "overdue" so it shows up right away in "What's Next"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const nextDue = yesterday;
    
    // If the request specifically asks to schedule for later
    if (req.query.scheduleForLater === 'true') {
      // Set nextDue to the current time first
      const futureDate = new Date();
      if (parsed.frequencyUnit === 'day') {
        futureDate.setDate(futureDate.getDate() + parsed.frequency);
      } else if (parsed.frequencyUnit === 'week') {
        futureDate.setDate(futureDate.getDate() + (parsed.frequency * 7));
      } else if (parsed.frequencyUnit === 'month') {
        futureDate.setMonth(futureDate.getMonth() + parsed.frequency);
      } else if (parsed.frequencyUnit === 'year') {
        futureDate.setFullYear(futureDate.getFullYear() + parsed.frequency);
      }
      // Override the default past date with the future date if scheduled later
      nextDue.setTime(futureDate.getTime());
    }
    
    const typedActivity = ensureActivityTypes(parsed);
    
    const activityData: ActivityInsert & { userId: number, nextDue: Date } = {
      ...typedActivity,
      userId: userId,
      nextDue
    };
    
    const createdActivity = await storage.createActivity(activityData);
    
    // Create invitation token for sharing
    const invitationToken = uuidv4();
    
    const invitation = await storage.createActivityInvitation({
      activityId: createdActivity.id,
      senderUserId: userId,
      recipientEmail,
      invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });
    
    res.json({ 
      success: true,
      activity: createdActivity,
      invitation,
      invitationToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Error sharing activity:', error);
      res.status(500).json({ message: "Failed to share activity" });
    }
  }
});

// Accept shared activity using token
activityRouter.post('/accept/:token', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const userId = req.user.id;
    const { token } = req.params;
    const success = await storage.acceptActivityInvitation(token, userId);
    
    if (!success) {
      return res.status(404).json({ message: "Invalid or expired invitation" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting activity invitation:', error);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// Skip an activity (reschedule without completing)
activityRouter.post('/:id/skip', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req) || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to skip this activity" });
    }
    
    const updatedActivity = await storage.skipActivity(activityId);
    res.json(updatedActivity);
  } catch (error) {
    console.error('Error skipping activity:', error);
    res.status(500).json({ message: "Failed to skip activity" });
  }
});