import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { userSchema, activitySchema, User, lifeEventSchema, userLifeEventSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

// Type guard to check if user is authenticated
function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Protected route middleware
  const requireAuth = (req: Request, res: any, next: any) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // User routes - protected
  app.put('/api/user', requireAuth, async (req, res) => {
    try {
      const userData = userSchema.partial().parse(req.body);
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      const user = await storage.updateUser(userId, userData);
      return res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error updating user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/user', requireAuth, async (req, res) => {
    try {
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      await storage.deleteUser(userId);
      req.logout((err) => {
        if (err) return res.status(500).json({ message: 'Logout error' });
        return res.status(204).send();
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Activity routes - protected
  app.get('/api/activities', requireAuth, async (req, res) => {
    try {
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      const activities = await storage.getActivities(userId);
      return res.json(activities);
    } catch (error) {
      console.error('Error getting activities:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/activities', requireAuth, async (req, res) => {
    try {
      // Get activity data from request body
      const { name, category, frequency, frequencyUnit, duration, durationUnit, lifeImpact, color } = req.body;
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      
      // Create the activity with complete data
      const activity = await storage.createActivity({
        name,
        category,
        frequency: parseInt(frequency),
        frequencyUnit,
        duration: parseInt(duration),
        durationUnit,
        lifeImpact: parseFloat(lifeImpact || "0"),
        color,
        userId
      });
      
      return res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error creating activity:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/activities/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get activity data from request body
      const { name, category, frequency, frequencyUnit, duration, durationUnit, lifeImpact, color } = req.body;
      
      // First check if the activity belongs to the user
      const activity = await storage.getActivity(id);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Create the activity with complete data
      const activityData = {
        name,
        category,
        frequency: parseInt(frequency),
        frequencyUnit,
        duration: parseInt(duration),
        durationUnit,
        lifeImpact: parseFloat(lifeImpact || "0"),
        color
      };
      
      const updatedActivity = await storage.updateActivity(id, activityData);
      return res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error updating activity:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/activities/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First check if the activity belongs to the user
      const activity = await storage.getActivity(id);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      await storage.deleteActivity(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting activity:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/activities', requireAuth, async (req, res) => {
    try {
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      await storage.deleteAllActivities(userId);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting all activities:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Public free sundial route (no authentication required)
  app.post('/api/free-sundial', async (req, res) => {
    try {
      // For the free route, we only need the basic user data without authentication
      const { name, age, lifeExpectancy, sleepHours } = req.body;
      
      // Validate the input
      if (!name || !age || !lifeExpectancy || !sleepHours) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Parse and validate the values
      const userData = {
        name: String(name),
        age: parseInt(String(age)),
        lifeExpectancy: parseInt(String(lifeExpectancy)),
        sleepHours: parseFloat(String(sleepHours))
      };
      
      // Validate the numbers
      if (isNaN(userData.age) || isNaN(userData.lifeExpectancy) || isNaN(userData.sleepHours)) {
        return res.status(400).json({ message: 'Invalid numeric values' });
      }
      
      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error processing sundial data:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Life Events and Event Categories routes
  
  // Event Categories - Public
  app.get('/api/event-categories', async (req, res) => {
    try {
      const categories = await storage.getEventCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Error getting event categories:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get all Life Events - Public
  app.get('/api/life-events', async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const events = await storage.getLifeEvents(categoryId);
      return res.json(events);
    } catch (error) {
      console.error('Error getting life events:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get a single Life Event - Public
  app.get('/api/life-events/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getLifeEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: 'Life event not found' });
      }
      
      return res.json(event);
    } catch (error) {
      console.error('Error getting life event:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // User Life Events - Protected
  app.get('/api/user-life-events', requireAuth, async (req, res) => {
    try {
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      const userEvents = await storage.getUserLifeEvents(userId);
      return res.json(userEvents);
    } catch (error) {
      console.error('Error getting user life events:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Add a Life Event to User's Collection - Protected
  app.post('/api/user-life-events', requireAuth, async (req, res) => {
    try {
      // Validate request body
      const userEventData = userLifeEventSchema.partial().parse(req.body);
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      const userId = req.user.id;
      
      // Add the life event to user's collection
      const userEvent = await storage.addUserLifeEvent({
        ...userEventData,
        userId,
        lifeEventId: req.body.lifeEventId,
        isActive: true
      });
      
      // Get the full user event with the event data
      const fullUserEvent = await storage.getUserLifeEvent(userEvent.id);
      return res.status(201).json(fullUserEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error adding user life event:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update a User Life Event - Protected
  app.put('/api/user-life-events/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate request body
      const userEventData = userLifeEventSchema.partial().parse(req.body);
      
      // Check if the user life event exists
      const existingUserEvent = await storage.getUserLifeEvent(id);
      if (!existingUserEvent) {
        return res.status(404).json({ message: 'User life event not found' });
      }
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      if (existingUserEvent.userId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Update the user life event
      const updatedUserEvent = await storage.updateUserLifeEvent(id, userEventData);
      
      // Get the full user event with the event data
      const fullUserEvent = await storage.getUserLifeEvent(id);
      return res.json(fullUserEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error updating user life event:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Remove a Life Event from User's Collection - Protected
  app.delete('/api/user-life-events/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the user life event exists
      const existingUserEvent = await storage.getUserLifeEvent(id);
      if (!existingUserEvent) {
        return res.status(404).json({ message: 'User life event not found' });
      }
      
      // @ts-ignore - user will always exist due to requireAuth middleware
      if (existingUserEvent.userId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Remove the user life event
      await storage.removeUserLifeEvent(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error removing user life event:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
