import { Router } from 'express';
import { storage } from '../storage';
import { ActivityInsert, activitySchema } from '@shared/schema';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const activityRouter = Router();

// Get all activities for the logged-in user
activityRouter.get('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const activities = await storage.getActivities(req.session.userId);
  res.json(activities);
});

// Get next activity suggestion
activityRouter.get('/next', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const nextActivity = await storage.getNextActivity(req.session.userId);
  if (!nextActivity) {
    return res.status(404).json({ message: "No activities found" });
  }
  
  res.json(nextActivity);
});

// Get activities by cluster
activityRouter.get('/cluster/:clusterId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { clusterId } = req.params;
  const activities = await storage.getActivitiesByCluster(parseInt(clusterId));
  res.json(activities);
});

// Create new activity
activityRouter.post('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const parsed = activitySchema.parse(req.body);
    const nextDue = new Date();
    
    if (parsed.frequencyUnit === 'day') {
      nextDue.setDate(nextDue.getDate() + parsed.frequency);
    } else if (parsed.frequencyUnit === 'week') {
      nextDue.setDate(nextDue.getDate() + (parsed.frequency * 7));
    } else if (parsed.frequencyUnit === 'month') {
      nextDue.setMonth(nextDue.getMonth() + parsed.frequency);
    } else if (parsed.frequencyUnit === 'year') {
      nextDue.setFullYear(nextDue.getFullYear() + parsed.frequency);
    }
    
    const activityData: ActivityInsert & { userId: number, nextDue: Date } = {
      ...parsed,
      userId: req.session.userId,
      nextDue
    };
    
    const activity = await storage.createActivity(activityData);
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
activityRouter.put('/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized to update this activity" });
    }
    
    const parsed = activitySchema.parse(req.body);
    const updatedActivity = await storage.updateActivity(activityId, parsed);
    
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
activityRouter.post('/:id/complete', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== req.session.userId) {
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
activityRouter.delete('/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { id } = req.params;
  
  try {
    const activityId = parseInt(id);
    const activity = await storage.getActivity(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    if (activity.userId !== req.session.userId) {
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
activityRouter.delete('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    await storage.deleteAllActivities(req.session.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting all activities:', error);
    res.status(500).json({ message: "Failed to delete all activities" });
  }
});

// Share activity with someone
activityRouter.post('/share', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const { activity, recipientEmail } = req.body;
    
    if (!activity || !recipientEmail) {
      return res.status(400).json({ message: "Activity and recipient email are required" });
    }
    
    // First, create the activity
    const parsed = activitySchema.parse(activity);
    const nextDue = new Date();
    
    if (parsed.frequencyUnit === 'day') {
      nextDue.setDate(nextDue.getDate() + parsed.frequency);
    } else if (parsed.frequencyUnit === 'week') {
      nextDue.setDate(nextDue.getDate() + (parsed.frequency * 7));
    } else if (parsed.frequencyUnit === 'month') {
      nextDue.setMonth(nextDue.getMonth() + parsed.frequency);
    } else if (parsed.frequencyUnit === 'year') {
      nextDue.setFullYear(nextDue.getFullYear() + parsed.frequency);
    }
    
    const activityData: ActivityInsert & { userId: number, nextDue: Date } = {
      ...parsed,
      userId: req.session.userId,
      nextDue
    };
    
    const createdActivity = await storage.createActivity(activityData);
    
    // Create invitation token for sharing
    const invitationToken = uuidv4();
    
    const invitation = await storage.createActivityInvitation({
      activityId: createdActivity.id,
      senderUserId: req.session.userId,
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
activityRouter.post('/accept/:token', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const { token } = req.params;
    const success = await storage.acceptActivityInvitation(token, req.session.userId);
    
    if (!success) {
      return res.status(404).json({ message: "Invalid or expired invitation" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting activity invitation:', error);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});