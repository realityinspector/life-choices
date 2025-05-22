
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { togetherAIService } from "../services/together-ai";
import { ActivityRecipe } from "@shared/schema";
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

      // Parse and validate JSON response
      const parsed = JSON.parse(content);
      if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
        throw new Error("Invalid JSON structure");
      }

      // Convert to ActivityRecipe format
      return parsed.recipes.map((recipe: any, index: number) => ({
        activityId: activity.id,
        phase: recipe.phase.toLowerCase(),
        title: recipe.title,
        description: recipe.description,
        orderIndex: recipe.order || index + 1
      }));
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) {
        console.error(`Failed to generate recipes for activity ${activity.name} after ${maxRetries} attempts`);
        return null;
      }
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  return null;
}

router.post("/generate-recipes", async (req, res) => {
  try {
    const { activityIds, globalPrompt } = z.object({
      activityIds: z.array(z.number()),
      globalPrompt: z.string().optional()
    }).parse(req.body);

    const results = [];
    let processed = 0;

    for (const activityId of activityIds) {
      const activity = await storage.getActivity(activityId);
      if (!activity) continue;

      console.log(`Processing activity: ${activity.name} (${processed + 1}/${activityIds.length})`);

      // Generate recipes
      const recipes = await generateRecipeWithRetry(activity, globalPrompt);
      if (recipes) {
        // Save recipes to database
        for (const recipe of recipes) {
          await storage.createActivityRecipe(recipe);
        }
        results.push({
          activityId,
          status: "success",
          recipeCount: recipes.length
        });
      } else {
        results.push({
          activityId,
          status: "failed",
          error: "Failed to generate recipes"
        });
      }

      processed++;
      // Add delay between processing
      await sleep(300);
    }

    res.json({
      message: `Processed ${processed} activities`,
      results
    });
  } catch (error) {
    console.error("Error generating recipes:", error);
    res.status(500).json({ error: "Failed to generate recipes" });
  }
});

export default router;
