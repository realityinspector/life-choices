import Together from "together-ai";
import { ActivityInsert } from "../../shared/schema";

// Define the structure of the LLM response for activity generation
interface ActivityGenerationResponse {
  name: string;
  category: string;
  frequency: number;
  frequencyUnit: "day" | "week" | "month" | "year";
  duration: number;
  durationUnit: "minute" | "hour";
  lifeImpact: number; // -10 to 10
  emoji?: string;
  description?: string;
  color?: string;
  priority?: number; // 1-5
}

export class TogetherAIService {
  private client: Together;
  private model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
  
  constructor() {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error("TOGETHER_API_KEY not found in environment variables");
    }
    this.client = new Together();
  }

  /**
   * Create system prompt for generating activity details from image filename
   */
  private generateSystemPrompt(): string {
    return `You are an AI assistant that helps create detailed activities based on image filenames. 
The filenames describe activities people do in their lives.

For each filename, create a structured activity with these attributes:
- name: A clear, descriptive title (max 40 chars)
- category: Choose from [Work, Health, Leisure, Education, Family, Social, Personal Growth, Spiritual, Travel, Chores, Hobby, Exercise, Nutrition, Other]
- frequency: How often the activity typically occurs (number)
- frequencyUnit: Unit for frequency [day, week, month, year]
- duration: How long the activity typically takes (number)
- durationUnit: Unit for duration [minute, hour]
- lifeImpact: Impact on quality of life from -10 (very negative) to 10 (very positive)
- emoji: A single appropriate emoji (optional)
- description: A brief description of the activity
- color: A hex color code that visually represents this activity
- priority: Importance level from 1 (low) to 5 (high)

Analyze the filename carefully. It may include camelCase or snake_case formatting with rich context.
For example:
- "morningYoga.jpg" → A regular yoga practice in the morning
- "visitGrandparents.jpg" → A family visit activity
- "deep_work_focus.jpg" → A productivity technique

Use reasonable defaults for frequency and duration based on the activity type.`;
  }

  /**
   * Generate a prompt for the model based on filename
   */
  private generateUserPrompt(filename: string): string {
    // Process the filename to make it more readable
    const processedFilename = filename
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Convert camelCase to spaces
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Convert PascalCase to spaces
      .replace(/[_-]/g, " "); // Replace underscores and dashes with spaces

    return `Generate activity details for the image filename: "${processedFilename}"

Respond with a valid JSON object containing all the required properties.`;
  }

  /**
   * Parse the LLM response into a structured activity
   */
  private parseLLMResponse(response: string): ActivityGenerationResponse | null {
    try {
      // Find JSON in the response (might be surrounded by other text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        console.error("No JSON found in LLM response");
        return null;
      }

      const json = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = ['name', 'category', 'frequency', 'frequencyUnit', 'duration', 'durationUnit', 'lifeImpact'];
      for (const field of requiredFields) {
        if (json[field] === undefined) {
          console.error(`Missing required field: ${field}`);
          return null;
        }
      }

      return json as ActivityGenerationResponse;
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      return null;
    }
  }

  /**
   * Generate random hex color if not provided
   */
  private generateRandomColor(): string {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
  }

  /**
   * Convert LLM response to ActivityInsert
   */
  private toActivityInsert(response: ActivityGenerationResponse): ActivityInsert {
    return {
      name: response.name,
      category: response.category,
      frequency: response.frequency,
      frequencyUnit: response.frequencyUnit,
      duration: response.duration,
      durationUnit: response.durationUnit,
      lifeImpact: response.lifeImpact,
      color: response.color || this.generateRandomColor(),
      priority: response.priority || 3,
      emoji: response.emoji || null,
      exportToCalendar: false,
      clusterId: null
    };
  }

  /**
   * Generate activity details from an image filename
   */
  async generateActivityFromFilename(filename: string): Promise<ActivityInsert | null> {
    try {
      console.log(`Generating activity details for filename: ${filename}`);
      
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: this.generateSystemPrompt() },
          { role: "user", content: this.generateUserPrompt(filename) }
        ],
        model: this.model,
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content || '';
      if (!content) {
        console.error("Empty response from LLM");
        return null;
      }

      console.log("LLM Response:", content);
      
      const parsedResponse = this.parseLLMResponse(content);
      if (!parsedResponse) {
        return null;
      }

      return this.toActivityInsert(parsedResponse);
    } catch (error) {
      console.error("Error generating activity from filename:", error);
      return null;
    }
  }

  /**
   * Generate multiple activities from filenames (batch processing)
   */
  async generateActivitiesFromFilenames(filenames: string[], batchSize: number = 1): Promise<(ActivityInsert | null)[]> {
    const results: (ActivityInsert | null)[] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < filenames.length; i += batchSize) {
      const batch = filenames.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(filenames.length/batchSize)}: ${batch.length} items`);
      
      if (batchSize === 1) {
        // Single mode processing
        const result = await this.generateActivityFromFilename(batch[0]);
        results.push(result);
      } else {
        // Batch mode processing
        // Process each filename individually but in parallel for now
        // This could be optimized further in the future to create a single prompt with multiple filenames
        try {
          console.log(`Processing ${batch.length} files in parallel batch`);
          const batchPromises = batch.map(filename => this.generateActivityFromFilename(filename));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        } catch (error) {
          console.error("Error in batch processing:", error);
          // If the batch fails, add null results for each item in this batch
          batch.forEach(() => results.push(null));
        }
      }
    }
    
    return results;
  }
}

export const togetherAIService = new TogetherAIService();