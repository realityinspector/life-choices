import Together from "together-ai";
import { ActivityInsert } from "../../shared/schema";
import fs from "fs";
import path from "path";
import { Buffer } from "buffer";

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

// Stability AI image generation response
interface ImageGenerationResponse {
  filename: string;
  originalFilename: string;
  path: string;
  mimeType: string;
}

export class TogetherAIService {
  private client: Together;
  private textModel = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
  private imageModel = "stabilityai/stable-diffusion-xl-base-1.0";

  constructor() {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error("TOGETHER_API_KEY not found in environment variables");
    }
    this.client = new Together({
      apiKey: apiKey || ''
    });
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
        model: this.textModel,
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
   * Generate a batch prompt for multiple filenames
   */
  private generateBatchUserPrompt(filenames: string[]): string {
    // Process each filename to make it more readable
    const processedFilenames = filenames.map(filename => 
      filename
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/([a-z])([A-Z])/g, "$1 $2") // Convert camelCase to spaces
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Convert PascalCase to spaces
        .replace(/[_-]/g, " "); // Replace underscores and dashes with spaces
    );

    return `Generate activity details for the following image filenames:
${processedFilenames.map((name, index) => `${index + 1}. "${name}"`).join('\n')}

Respond with a valid JSON array containing one object for each filename. Each object should contain all the required properties.
The response should be formatted as: [ { activity1 }, { activity2 }, ... ]

Ensure that each activity in the array corresponds to the filename at the same position in the list.`;
  }

  /**
   * Parse batch LLM response into structured activities
   */
  private parseBatchLLMResponse(response: string, count: number): (ActivityGenerationResponse | null)[] {
    try {
      // Find JSON array in the response
      const jsonMatch = response.match(/\[[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        console.error("No JSON array found in batch LLM response");
        return Array(count).fill(null);
      }

      const jsonArray = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(jsonArray)) {
        console.error("Parsed JSON is not an array");
        return Array(count).fill(null);
      }

      // Validate each item in the array
      return jsonArray.map((item, index) => {
        // Check required fields
        const requiredFields = ['name', 'category', 'frequency', 'frequencyUnit', 'duration', 'durationUnit', 'lifeImpact'];
        for (const field of requiredFields) {
          if (item[field] === undefined) {
            console.error(`Missing required field '${field}' in item ${index + 1}`);
            return null;
          }
        }
        return item as ActivityGenerationResponse;
      });
    } catch (error) {
      console.error("Error parsing batch LLM response:", error);
      return Array(count).fill(null);
    }
  }

  /**
   * Process a batch of filenames with a single LLM call
   */
  private async processBatchWithSingleCall(filenames: string[]): Promise<(ActivityInsert | null)[]> {
    try {
      console.log(`Processing ${filenames.length} files in a single LLM call`);

      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: this.generateSystemPrompt() },
          { role: "user", content: this.generateBatchUserPrompt(filenames) }
        ],
        model: this.textModel,
        temperature: 0.7,
        max_tokens: 3000 // Increased for batch processing
      });

      const content = response.choices[0]?.message?.content || '';
      if (!content) {
        console.error("Empty response from LLM for batch processing");
        return Array(filenames.length).fill(null);
      }

      console.log("Batch LLM Response:", content);

      const parsedResponses = this.parseBatchLLMResponse(content, filenames.length);

      // Convert each response to ActivityInsert
      return parsedResponses.map(response => 
        response ? this.toActivityInsert(response) : null
      );
    } catch (error) {
      console.error("Error in batch processing with single call:", error);
      return Array(filenames.length).fill(null);
    }
  }

  /**
   * Generate multiple activities from filenames (batch processing)
   */
  async generateActivitiesFromFilenames(filenames: string[], batchSize: number = 10): Promise<(ActivityInsert | null)[]> {
    const results: (ActivityInsert | null)[] = [];

    // Process in batches
    for (let i = 0; i < filenames.length; i += batchSize) {
      const batch = filenames.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(filenames.length/batchSize)}: ${batch.length} items`);

      try {
        if (batch.length === 1) {
          // Single item processing
          const result = await this.generateActivityFromFilename(batch[0]);
          results.push(result);
        } else if (batch.length <= 10) {
          // Use more efficient batch processing with a single LLM call
          const batchResults = await this.processBatchWithSingleCall(batch);
          results.push(...batchResults);
        } else {
          // Fallback to parallel processing for large batches (though this shouldn't happen with proper batching)
          console.log(`Batch size ${batch.length} exceeds optimal size, processing in parallel`);
          const batchPromises = batch.map(filename => this.generateActivityFromFilename(filename));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        // If the batch fails, add null results for each item in this batch
        batch.forEach(() => results.push(null));
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < filenames.length) {
        console.log("Pausing briefly between batches");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Generate a prompt for image generation based on activity details
   */
  private generateImagePrompt(activity: ActivityInsert): string {
    // Create a detailed prompt based on activity details
    const categoryDescriptions: Record<string, string> = {
      'Work': 'in a professional setting',
      'Health': 'in a health-related context',
      'Leisure': 'during leisure time',
      'Education': 'in an educational setting',
      'Family': 'with family members',
      'Social': 'in a social gathering',
      'Personal Growth': 'for personal development',
      'Spiritual': 'in a spiritual context',
      'Travel': 'during a travel experience',
      'Chores': 'doing household tasks',
      'Hobby': 'enjoying a hobby',
      'Exercise': 'during physical activity',
      'Nutrition': 'related to food and nutrition',
      'Other': ''
    };

    const categoryContext = categoryDescriptions[activity.category] || '';

    // Basic prompt structure
    let prompt = `A high-quality, photorealistic image of people engaging in ${activity.name} ${categoryContext}.`;

    // Adding emotional tone based on life impact
    if (activity.lifeImpact !== undefined) {
      if (activity.lifeImpact > 7) {
        prompt += ' The scene should convey joy, fulfillment, and positive energy.';
      } else if (activity.lifeImpact > 3) {
        prompt += ' The scene should have a pleasant, positive atmosphere.';
      } else if (activity.lifeImpact < -3) {
        prompt += ' The scene should convey challenge or difficulty.';
      }
    }

    // Add aesthetic style guidance
    prompt += ' The image should be vibrant, well-lit, with good composition. Professional photography style.';

    return prompt;
  }

  /**
   * Save a base64 image to the file system
   */
  private async saveBase64Image(base64Data: string, activityName: string): Promise<ImageGenerationResponse> {
    try {
      // Extract the base64 content (remove data:image/jpeg;base64, part if present)
      const base64Image = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      // Generate a sanitized filename
      const sanitizedName = activityName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}.jpg`;
      const originalFilename = `${sanitizedName}.jpg`;

      // Ensure the uploads directory exists
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Full path to save the image
      const filePath = path.join(uploadDir, filename);

      // Decode and save the image
      const imageBuffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(filePath, imageBuffer);

      console.log(`Image saved to ${filePath}`);

      return {
        filename,
        originalFilename,
        path: `uploads/${filename}`,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw error;
    }
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  async generateImageForActivity(activity: ActivityInsert): Promise<ImageGenerationResponse | null> {
    try {
      console.log(`Generating image for activity: ${activity.name}`);

      // Create a prompt for the image generation
      const prompt = this.generateImagePrompt(activity);
      console.log(`Image generation prompt: ${prompt}`);

      // Call the Together API with the Stability AI model using the specified parameters
      const response = await this.client.images.create({
        model: this.imageModel,
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 40,
        n: 4,
        seed: 1000
      });

      // Log the full response structure for debugging
      console.log('Image generation response structure:', JSON.stringify({
        hasData: !!response.data,
        dataLength: response.data ? response.data.length : 0,
        responseKeys: Object.keys(response)
      }));

      // Check if we have a valid response with a URL or b64_json
      if (!response.data || response.data.length === 0) {
        console.error('No data in response');
        return null;
      }

      if (response.data && response.data.length > 0) {
        console.log('Response data first item keys:', Object.keys(response.data[0]));
      }

      // Check for URL in the response
      if (response.data[0].url) {
        console.log('Found image URL in response, fetching image...');
        const imageUrl = response.data[0].url;

        // Fetch the image from the URL and convert to base64
        const base64Image = await this.fetchImageAsBase64(imageUrl);

        // Save the image to the filesystem
        const imageData = await this.saveBase64Image(base64Image, activity.name);
        return imageData;
      } 
      // Fallback to b64_json if it exists
      else if (response.data[0].b64_json) {
        console.log('Found b64_json in response');
        const imageData = await this.saveBase64Image(
          response.data[0].b64_json, 
          activity.name
        );
        return imageData;
      }
      else {
        console.error('No image URL or base64 data in response');
        return null;
      }
    } catch (error) {
      console.error('Error generating image for activity:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  }
}

export const togetherAIService = new TogetherAIService();