
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { ActivityRecipe } from "@shared/schema";
import { AuthenticatedRequest } from "../auth";
import fs from "fs";
import path from "path";

const router = Router();

const systemPrompts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../config/llm-prompts.json"), "utf-8")
);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateRecipeWithRetry(
  activity: any,
  globalPrompt: string = "",
  maxRetries: number = 3
): Promise<ActivityRecipe[] | null> {
  let attempt = 0;
  const baseDelay = 300;

  while (attempt < maxRetries) {
    try {
      const prompt = `${systemPrompts.activityRecipes.systemPrompt}\n\n${globalPrompt}\n\n` + 
        systemPrompts.activityRecipes.userPromptTemplate
          .replace("{name}", activity.name)
          .replace("{category}", activity.category)
          .replace("{description}", activity.description || "");

      const response = await togetherAIService.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: togetherAIService.textModel,
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from LLM");

      try {
        const parsed = JSON.parse(content);
        if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
          throw new Error("Invalid JSON structure");
        }

        return parsed.recipes.map((recipe: any, index: number) => ({
          activityId: activity.id,
          phase: recipe.phase.toLowerCase(),
          title: recipe.title,
          description: recipe.description,
          orderIndex: recipe.order || index + 1
        }));
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Invalid JSON response from LLM");
      }
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) {
        console.error(`Failed to generate recipes for activity ${activity.name} after ${maxRetries} attempts:`, error);
        return null;
      }
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
  return null;
}

router.post("/generate-recipes", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Validate request body before processing
    if (!req.body || !Array.isArray(req.body.activityIds)) {
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

        const recipes = await generateRecipeWithRetry(activity, globalPrompt);
        if (recipes) {
          await Promise.all(recipes.map(recipe => storage.createActivityRecipe(recipe)));
          return {
            activityId,
            status: "success",
            recipeCount: recipes.length
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
    res.status(500).json({ 
      error: "Failed to generate recipes",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
