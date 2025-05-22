import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { ActivityRecipe } from "@shared/schema";
import { AuthenticatedRequest } from "../auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemPrompts = JSON.parse(
  fs.readFileSync(path.join("server/config/llm-prompts.json"), "utf-8")
);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateRecipeWithRetry(activity: Activity, retries = 3): Promise<Recipe> {
  for (let i = 0; i < retries; i++) {
    try {
      const prompt = `Generate a recipe for the activity "${activity.name}" in the following JSON format:
{
  "name": "string",
  "description": "string",
  "ingredients": ["string"],
  "instructions": ["string"],
  "prepTime": number,
  "cookTime": number,
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["string"]
}

Ensure the response is valid JSON and follows this exact structure.`;

      const response = await togetherAIService.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: togetherAIService.textModel,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Clean the response to ensure it's valid JSON
      const cleanedResponse = response.choices[0]?.message?.content?.trim()
        .replace(/^```json\s*/, '') // Remove JSON code block markers
        .replace(/\s*```$/, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

      try {
        const recipe = JSON.parse(cleanedResponse);
        
        // Validate the recipe structure
        if (!recipe.name || !recipe.description || !Array.isArray(recipe.ingredients) || 
            !Array.isArray(recipe.instructions) || typeof recipe.prepTime !== 'number' || 
            typeof recipe.cookTime !== 'number' || typeof recipe.servings !== 'number' || 
            !['easy', 'medium', 'hard'].includes(recipe.difficulty) || !Array.isArray(recipe.tags)) {
          throw new Error('Invalid recipe structure');
        }

        return {
          ...recipe,
          activityId: activity.id
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', response.choices[0]?.message?.content);
        console.error('Cleaned response:', cleanedResponse);
        
        if (i === retries - 1) {
          throw new Error(`Failed to parse LLM response after ${retries} attempts`);
        }
        continue;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retrying
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('Failed to generate recipe after all retries');
}

router.post("/generate-recipes", async (req: AuthenticatedRequest, res) => {
  // Set JSON content type header
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Validate request body before processing
    if (!req.body) {
      return res.status(400).json({ error: "Missing request body" });
    }

    if (!Array.isArray(req.body.activityIds)) {
      return res.status(400).json({ error: "Invalid request: activityIds must be an array" });
    }

    const { activityIds, globalPrompt } = z.object({
      activityIds: z.array(z.number()),
      globalPrompt: z.string().optional()
    }).parse(req.body);

    const results = [];
    let processed = 0;
    const batchSize = 5;

    // Process activities in batches
    for (let i = 0; i < activityIds.length; i += batchSize) {
      const batch = activityIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (activityId) => {
        const activity = await storage.getActivity(activityId);
        if (!activity) {
          return {
            activityId,
            status: "failed",
            error: "Activity not found"
          };
        }

        const recipe = await generateRecipeWithRetry(activity);
        if (recipe) {
          await storage.createActivityRecipe(recipe);
          return {
            activityId,
            status: "success",
            recipeCount: 1
          };
        }
        return {
          activityId,
          status: "failed",
          error: "Failed to generate recipes"
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      processed += batch.length;

      // Add delay between batches
      if (i + batchSize < activityIds.length) {
        await sleep(1000);
      }
    }

    res.json({
      message: `Processed ${processed} activities`,
      results
    });
  } catch (error) {
    console.error("Error generating recipes:", error);
    // Ensure we always return JSON even for unexpected errors
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to generate recipes",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

// Add error handler for this route
router.use((err: any, req: any, res: any, next: any) => {
  console.error("Recipe generation error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

export const adminLLMRecipesRouter = router;
