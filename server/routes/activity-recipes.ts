import { Router } from 'express';
import { storage } from '../storage';
import { auth } from '../auth';
import { z } from 'zod';

const router = Router();

// Type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    name: string;
    [key: string]: any;
  };
}

// Get all recipes
router.get('/', auth, async (req, res) => {
  try {
    const recipes = await storage.getActivityRecipes(0); // Get all recipes
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get recipes for a specific activity
router.get('/activity/:activityId', auth, async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId);
    if (isNaN(activityId)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }
    
    const recipes = await storage.getActivityRecipes(activityId);
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes for activity:', error);
    res.status(500).json({ error: 'Failed to fetch recipes for activity' });
  }
});

// Get a specific recipe
router.get('/:id', auth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    const recipe = await storage.getActivityRecipe(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create a new recipe
router.post('/', auth, async (req, res) => {
  try {
    const recipeSchema = z.object({
      name: z.string(),
      ingredients: z.union([z.string(), z.array(z.string())]),
      instructions: z.string(),
      activityId: z.number().optional()
    });
    
    const data = recipeSchema.parse(req.body);
    
    // If ingredients is a string, try to parse it as JSON
    let ingredients: string[] = [];
    if (typeof data.ingredients === 'string') {
      try {
        ingredients = JSON.parse(data.ingredients);
        if (!Array.isArray(ingredients)) {
          ingredients = [data.ingredients];
        }
      } catch (e) {
        ingredients = [data.ingredients];
      }
    } else {
      ingredients = data.ingredients;
    }
    
    const recipe = await storage.createActivityRecipe({
      name: data.name,
      ingredients,
      instructions: data.instructions,
      activityId: data.activityId
    });
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid recipe data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  }
});

// Update a recipe
router.put('/:id', auth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    const existingRecipe = await storage.getActivityRecipe(recipeId);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipeSchema = z.object({
      name: z.string().optional(),
      ingredients: z.union([z.string(), z.array(z.string())]).optional(),
      instructions: z.string().optional()
    });
    
    const data = recipeSchema.parse(req.body);
    
    // Process ingredients if provided
    let ingredients;
    if (data.ingredients !== undefined) {
      if (typeof data.ingredients === 'string') {
        try {
          ingredients = JSON.parse(data.ingredients);
          if (!Array.isArray(ingredients)) {
            ingredients = [data.ingredients];
          }
        } catch (e) {
          ingredients = [data.ingredients];
        }
      } else {
        ingredients = data.ingredients;
      }
    }
    
    const updatedRecipe = await storage.updateActivityRecipe(recipeId, {
      name: data.name,
      ingredients,
      instructions: data.instructions
    });
    
    res.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid recipe data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  }
});

// Delete a recipe
router.delete('/:id', auth, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    
    const existingRecipe = await storage.getActivityRecipe(recipeId);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    await storage.deleteActivityRecipe(recipeId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

export const activityRecipesRouter = router; 