import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { userSchema, activitySchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get('/api/user', async (req, res) => {
    try {
      const user = await storage.getUser();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/user', async (req, res) => {
    try {
      const userData = userSchema.parse(req.body);
      const user = await storage.createUser(userData);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/user', async (req, res) => {
    try {
      const userData = userSchema.parse(req.body);
      const user = await storage.updateUser(userData);
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

  app.delete('/api/user', async (req, res) => {
    try {
      await storage.deleteUser();
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Activity routes
  app.get('/api/activities', async (req, res) => {
    try {
      const activities = await storage.getActivities();
      return res.json(activities);
    } catch (error) {
      console.error('Error getting activities:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/activities', async (req, res) => {
    try {
      const activityData = activitySchema.omit({ userId: true }).parse(req.body);
      const activity = await storage.createActivity(activityData);
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

  app.put('/api/activities/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activityData = activitySchema.omit({ userId: true }).parse(req.body);
      const activity = await storage.updateActivity(id, activityData);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      return res.json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error('Error updating activity:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/activities/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteActivity(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting activity:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/activities', async (req, res) => {
    try {
      await storage.deleteAllActivities();
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting all activities:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
