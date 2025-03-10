import { Router, Request } from 'express';
import { storage } from '../storage';
import { activityClusterSchema } from '@shared/schema';
import { z } from 'zod';

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

export const clusterRouter = Router();

// Get all activity clusters
clusterRouter.get('/', async (req, res) => {
  try {
    const clusters = await storage.getActivityClusters();
    res.json(clusters);
  } catch (error) {
    console.error('Error fetching activity clusters:', error);
    res.status(500).json({ message: "Failed to fetch activity clusters" });
  }
});

// Get a specific cluster by ID
clusterRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cluster = await storage.getActivityCluster(parseInt(id));
    
    if (!cluster) {
      return res.status(404).json({ message: "Cluster not found" });
    }
    
    res.json(cluster);
  } catch (error) {
    console.error('Error fetching activity cluster:', error);
    res.status(500).json({ message: "Failed to fetch activity cluster" });
  }
});

// Create a new cluster
clusterRouter.post('/', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const parsed = activityClusterSchema.parse(req.body);
    const cluster = await storage.createActivityCluster(parsed);
    res.json(cluster);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Error creating activity cluster:', error);
      res.status(500).json({ message: "Failed to create activity cluster" });
    }
  }
});

// Update an existing cluster
clusterRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const { id } = req.params;
    const cluster = await storage.getActivityCluster(parseInt(id));
    
    if (!cluster) {
      return res.status(404).json({ message: "Cluster not found" });
    }
    
    const parsed = activityClusterSchema.parse(req.body);
    const updatedCluster = await storage.updateActivityCluster(parseInt(id), parsed);
    
    res.json(updatedCluster);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Error updating activity cluster:', error);
      res.status(500).json({ message: "Failed to update activity cluster" });
    }
  }
});

// Delete a cluster
clusterRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const { id } = req.params;
    const cluster = await storage.getActivityCluster(parseInt(id));
    
    if (!cluster) {
      return res.status(404).json({ message: "Cluster not found" });
    }
    
    await storage.deleteActivityCluster(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity cluster:', error);
    res.status(500).json({ message: "Failed to delete activity cluster" });
  }
});