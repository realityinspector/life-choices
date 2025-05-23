import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { ActivityRecipe, Activity } from "@shared/schema";
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

interface Recipe {
  activityId?: number; // Not stored in database anymore
  name: string;
  ingredients: string[]; // Changed to an array of strings
  instructions: string;
}

async function generateRecipeWithRetry(activity: Activity, retries = 3): Promise<Recipe> {
  for (let i = 0; i < retries; i++) {
    try {
      // Modified prompt to generate activity steps instead of cooking recipes
      const prompt = `Generate a sequential plan for the activity "${activity.name}" in the following JSON format:
{
  "name": "string",
  "ingredients": ["string", "string", "string"],
  "instructions": "string"
}

The "name" should be a concise title for the activity plan.
The "ingredients" should be an array of distinct steps or materials needed for the activity, with EACH ITEM stored as a separate string in the array. Each ingredient should be a standalone piece of information.
The "instructions" should be a string detailing the execution steps.

Make sure each ingredient is stored as a separate entry in the array.
Each ingredient should be a concise, focused item (ideally under 50 characters). 
Include at least 3-5 distinct ingredients for the activity.

It's crucial that your response is valid JSON that can be parsed with JSON.parse(). 
Do not include any markdown formatting, code blocks, or explanations.
Only return the JSON object itself.`;

      const response = await togetherAIService.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: togetherAIService.textModel,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Get the response content
      let content = response.choices[0]?.message?.content?.trim() || '';
      
      // More aggressive cleaning to extract JSON
      // First, remove any markdown code block formatting
      content = content.replace(/^```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
      
      // Remove any control characters that would break JSON parsing
      content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Try to find JSON object boundaries if there's extra text
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}');
      
      if (jsonStartIndex >= 0 && jsonEndIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        content = content.substring(jsonStartIndex, jsonEndIndex + 1);
      }

      console.log(`Attempt ${i + 1} cleaned response:`, content.substring(0, 100) + '...');
      
      try {
        const recipe = JSON.parse(content);
        
        // Schema validation using a more structured approach
        const RecipeSchema = z.object({
          name: z.string(),
          ingredients: z.array(z.string()),
          instructions: z.string()
        });
        
        // Validate and coerce the recipe data
        const validatedRecipe = RecipeSchema.parse(recipe);

        return {
          ...validatedRecipe,
          activityId: activity.id
        };
      } catch (parseError) {
        console.error(`JSON parse error (attempt ${i + 1}):`, parseError);
        console.error('First 200 chars of response:', content.substring(0, 200));
        
        if (i === retries - 1) {
          throw new Error(`Failed to parse LLM response after ${retries} attempts: ${parseError.message}`);
        }
        
        // Increase wait time between retries
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retrying with exponential backoff
      await sleep(1000 * Math.pow(2, i));
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
