import Together from "together-ai";
import { ActivityInsert } from "../../shared/schema";
import fs from "fs";
import path from "path";
import { Buffer } from "buffer";
import { promisify } from "util";

// Make fs operations async
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

// Define valid categories with type safety
const VALID_CATEGORIES = [
  "Work", "Health", "Leisure", "Education", "Family", "Social", 
  "Personal Growth", "Spiritual", "Travel", "Chores", "Hobby", 
  "Exercise", "Nutrition", "Other"
] as const;

type ActivityCategory = typeof VALID_CATEGORIES[number];

// Define valid frequency and duration units
const VALID_FREQUENCY_UNITS = ["day", "week", "month", "year"] as const;
const VALID_DURATION_UNITS = ["minute", "hour"] as const;

type FrequencyUnit = typeof VALID_FREQUENCY_UNITS[number];
type DurationUnit = typeof VALID_DURATION_UNITS[number];

// Enhanced interfaces with validation
interface ActivityGenerationResponse {
  name: string;
  category: ActivityCategory;
  frequency: number;
  frequencyUnit: FrequencyUnit;
  duration: number;
  durationUnit: DurationUnit;
  lifeImpact: number; // -10 to 10
  emoji?: string;
  description?: string;
  color?: string;
  priority?: number; // 1-5
}

interface ImageGenerationResponse {
  filename: string;
  originalFilename: string;
  path: string;
  mimeType: string;
}

interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryable?: boolean;
}

interface BatchProcessingOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
}

class TogetherAIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "TogetherAIError";
  }
}

export class TogetherAIService {
  private client: Together;
  private textModel = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
  private imageModel = "black-forest-labs/FLUX.1-schnell-Free";
  private uploadDir = "./uploads";
  private isInitialized = false;

  // Default configuration
  private readonly defaultBatchSize = 5;
  private readonly defaultMaxRetries = 3;
  private readonly defaultRetryDelay = 1000;
  private readonly defaultConcurrency = 2;

  constructor() {
    this.initializeClient();
    this.ensureUploadDirectory();
  }

  /**
   * Initialize the Together AI client with error handling
   */
  private initializeClient(): void {
    try {
      const apiKey = process.env.TOGETHER_API_KEY;
      if (!apiKey) {
        console.warn("TOGETHER_API_KEY not found in environment variables. Service will be limited.");
        return;
      }

      this.client = new Together({
        apiKey: apiKey
      });
      this.isInitialized = true;
      console.log("TogetherAI service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize TogetherAI client:", error);
      throw new TogetherAIError(
        "Failed to initialize TogetherAI client",
        "INIT_ERROR",
        false
      );
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      const uploadExists = await exists(this.uploadDir);
      if (!uploadExists) {
        await mkdir(this.uploadDir, { recursive: true });
        console.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      console.error("Failed to create upload directory:", error);
    }
  }

  /**
   * Check if the service is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.client) {
      throw new TogetherAIError(
        "TogetherAI service is not properly initialized. Check API key.",
        "NOT_INITIALIZED",
        false
      );
    }
  }

  /**
   * Create system prompt for generating activity details
   */
  private generateSystemPrompt(): string {
    const categories = VALID_CATEGORIES.join(", ");
    const frequencyUnits = VALID_FREQUENCY_UNITS.join(", ");
    const durationUnits = VALID_DURATION_UNITS.join(", ");

    return `You are an AI assistant that creates detailed activities from image filenames. 
The filenames describe activities people engage in.

For each filename, create a structured activity with these attributes:
- name: Clear, descriptive title (maximum 40 characters)
- category: Must be one of [${categories}]
- frequency: Positive number representing how often the activity occurs
- frequencyUnit: Must be one of [${frequencyUnits}]
- duration: Positive number representing activity duration
- durationUnit: Must be one of [${durationUnits}]
- lifeImpact: Integer from -10 (very negative) to 10 (very positive)
- emoji: Single appropriate emoji (optional)
- description: Brief activity description (optional)
- color: Hex color code starting with # (optional)
- priority: Integer from 1 (low) to 5 (high) (optional, defaults to 3)

Rules:
1. Always respond with valid JSON
2. Use realistic frequency/duration values for the activity type
3. Ensure all required fields are present
4. Keep names concise but descriptive

Example response format:
{
  "name": "Morning Yoga",
  "category": "Exercise",
  "frequency": 5,
  "frequencyUnit": "week",
  "duration": 30,
  "durationUnit": "minute",
  "lifeImpact": 8,
  "emoji": "🧘",
  "description": "Daily yoga practice to start the day",
  "color": "#4CAF50",
  "priority": 4
}`;
  }

  /**
   * Process filename for better readability
   */
  private processFilename(filename: string): string {
    try {
      return filename
        .replace(/\.[^/.]+$/, "") // Remove file extension
        .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase to spaces
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // PascalCase to spaces  
        .replace(/[_-]/g, " ") // Replace underscores/dashes with spaces
        .replace(/\s+/g, " ") // Normalize multiple spaces
        .trim();
    } catch (error) {
      console.warn(`Error processing filename "${filename}":`, error);
      return filename;
    }
  }

  /**
   * Generate prompt for a single filename
   */
  private generateUserPrompt(filename: string): string {
    const processedFilename = this.processFilename(filename);
    return `Generate activity details for the image filename: "${processedFilename}"

Respond with a valid JSON object containing all required properties.`;
  }

  /**
   * Generate batch prompt for multiple filenames
   */
  private generateBatchUserPrompt(filenames: string[]): string {
    const processedFilenames = filenames.map((filename, index) => {
      const processed = this.processFilename(filename);
      return `${index + 1}. "${processed}"`;
    });

    return `Generate activity details for these image filenames:
${processedFilenames.join('\n')}

Respond with a valid JSON array containing one object for each filename in the same order.
Format: [{"name": "...", "category": "...", ...}, {"name": "...", "category": "...", ...}]

Ensure each object contains all required properties and the array has ${filenames.length} items.`;
  }

  /**
   * Validate activity generation response
   */
  private validateActivityResponse(data: any): ActivityGenerationResponse | null {
    try {
      // Check required fields
      const requiredFields = [
        'name', 'category', 'frequency', 'frequencyUnit', 
        'duration', 'durationUnit', 'lifeImpact'
      ];

      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
          console.error(`Missing required field: ${field}`);
          return null;
        }
      }

      // Validate types and ranges
      if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length > 40) {
        console.error(`Invalid name: ${data.name}`);
        return null;
      }

      if (!VALID_CATEGORIES.includes(data.category)) {
        console.error(`Invalid category: ${data.category}`);
        return null;
      }

      if (!VALID_FREQUENCY_UNITS.includes(data.frequencyUnit)) {
        console.error(`Invalid frequency unit: ${data.frequencyUnit}`);
        return null;
      }

      if (!VALID_DURATION_UNITS.includes(data.durationUnit)) {
        console.error(`Invalid duration unit: ${data.durationUnit}`);
        return null;
      }

      if (typeof data.frequency !== 'number' || data.frequency <= 0) {
        console.error(`Invalid frequency: ${data.frequency}`);
        return null;
      }

      if (typeof data.duration !== 'number' || data.duration <= 0) {
        console.error(`Invalid duration: ${data.duration}`);
        return null;
      }

      if (typeof data.lifeImpact !== 'number' || data.lifeImpact < -10 || data.lifeImpact > 10) {
        console.error(`Invalid life impact: ${data.lifeImpact}`);
        return null;
      }

      // Validate optional fields
      if (data.priority !== undefined && 
          (typeof data.priority !== 'number' || data.priority < 1 || data.priority > 5)) {
        console.error(`Invalid priority: ${data.priority}`);
        return null;
      }

      if (data.color !== undefined && 
          (typeof data.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(data.color))) {
        console.error(`Invalid color: ${data.color}`);
        return null;
      }

      return data as ActivityGenerationResponse;
    } catch (error) {
      console.error("Error validating activity response:", error);
      return null;
    }
  }

  /**
   * Parse LLM response with improved error handling
   */
  private parseLLMResponse(response: string): ProcessingResult<ActivityGenerationResponse> {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // Find JSON object in the response
      const jsonMatch = cleanResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: "No JSON object found in response",
          retryable: true
        };
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      const validatedData = this.validateActivityResponse(parsedData);

      if (!validatedData) {
        return {
          success: false,
          error: "Invalid activity data structure",
          retryable: true
        };
      }

      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      return {
        success: false,
        error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      };
    }
  }

  /**
   * Parse batch LLM response with improved error handling
   */
  private parseBatchLLMResponse(response: string, expectedCount: number): ProcessingResult<(ActivityGenerationResponse | null)[]> {
    try {
      // Clean the response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // Find JSON array in the response - improved regex
      const jsonArrayMatch = cleanResponse.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/);
      if (!jsonArrayMatch) {
        return {
          success: false,
          error: "No JSON array found in batch response",
          retryable: true
        };
      }

      const parsedArray = JSON.parse(jsonArrayMatch[0]);
      if (!Array.isArray(parsedArray)) {
        return {
          success: false,
          error: "Parsed JSON is not an array",
          retryable: true
        };
      }

      // Process each item in the array
      const results: (ActivityGenerationResponse | null)[] = [];
      for (let i = 0; i < expectedCount; i++) {
        if (i < parsedArray.length && parsedArray[i]) {
          const validated = this.validateActivityResponse(parsedArray[i]);
          results.push(validated);
        } else {
          results.push(null);
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error("Error parsing batch LLM response:", error);
      return {
        success: false,
        error: `Batch parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      };
    }
  }

  /**
   * Generate random hex color
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Convert LLM response to ActivityInsert with defaults
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
   * Make API call with retry logic
   */
  private async makeAPICall<T>(
    apiCall: () => Promise<T>,
    operation: string,
    maxRetries: number = this.defaultMaxRetries
  ): Promise<ProcessingResult<T>> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`${operation} - Attempt ${attempt}/${maxRetries}`);
        const result = await apiCall();
        return { success: true, data: result };
      } catch (error) {
        lastError = error as Error;
        console.warn(`${operation} - Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = this.defaultRetryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError.message}`,
      retryable: false
    };
  }

  /**
   * Generate activity from single filename with improved error handling
   */
  async generateActivityFromFilename(filename: string): Promise<ActivityInsert | null> {
    try {
      this.ensureInitialized();
      console.log(`Generating activity details for filename: ${filename}`);

      const apiCall = async () => {
        return await this.client.chat.completions.create({
          messages: [
            { role: "system", content: this.generateSystemPrompt() },
            { role: "user", content: this.generateUserPrompt(filename) }
          ],
          model: this.textModel,
          temperature: 0.7,
          max_tokens: 1000
        });
      };

      const result = await this.makeAPICall(apiCall, `Generate activity for ${filename}`);
      if (!result.success || !result.data) {
        console.error(`Failed to generate activity for ${filename}:`, result.error);
        return null;
      }

      const content = result.data.choices[0]?.message?.content;
      if (!content) {
        console.error("Empty response from LLM");
        return null;
      }

      console.log(`LLM Response for ${filename}:`, content);

      const parseResult = this.parseLLMResponse(content);
      if (!parseResult.success || !parseResult.data) {
        console.error(`Failed to parse response for ${filename}:`, parseResult.error);
        return null;
      }

      return this.toActivityInsert(parseResult.data);
    } catch (error) {
      console.error(`Error generating activity from filename ${filename}:`, error);
      return null;
    }
  }

  /**
   * Process batch with single LLM call
   */
  private async processBatchWithSingleCall(filenames: string[]): Promise<(ActivityInsert | null)[]> {
    try {
      console.log(`Processing ${filenames.length} files in single LLM call`);

      const apiCall = async () => {
        return await this.client.chat.completions.create({
          messages: [
            { role: "system", content: this.generateSystemPrompt() },
            { role: "user", content: this.generateBatchUserPrompt(filenames) }
          ],
          model: this.textModel,
          temperature: 0.7,
          max_tokens: Math.min(4000, 500 * filenames.length)
        });
      };

      const result = await this.makeAPICall(apiCall, `Batch process ${filenames.length} files`);
      if (!result.success || !result.data) {
        console.error("Failed batch processing:", result.error);
        return Array(filenames.length).fill(null);
      }

      const content = result.data.choices[0]?.message?.content;
      if (!content) {
        console.error("Empty batch response from LLM");
        return Array(filenames.length).fill(null);
      }

      console.log("Batch LLM Response:", content);

      const parseResult = this.parseBatchLLMResponse(content, filenames.length);
      if (!parseResult.success || !parseResult.data) {
        console.error("Failed to parse batch response:", parseResult.error);
        return Array(filenames.length).fill(null);
      }

      // Convert valid responses to ActivityInsert
      return parseResult.data.map(response => 
        response ? this.toActivityInsert(response) : null
      );
    } catch (error) {
      console.error("Error in batch processing:", error);
      return Array(filenames.length).fill(null);
    }
  }

  /**
   * Process batch in parallel with concurrency control
   */
  private async processBatchInParallel(
    filenames: string[], 
    concurrency: number = this.defaultConcurrency
  ): Promise<(ActivityInsert | null)[]> {
    const results: (ActivityInsert | null)[] = [];
    const semaphore = Array(concurrency).fill(Promise.resolve());

    await Promise.all(
      filenames.map(async (filename, index) => {
        const semIndex = index % concurrency;
        await semaphore[semIndex];

        semaphore[semIndex] = (async () => {
          const result = await this.generateActivityFromFilename(filename);
          results[index] = result;
        })();
      })
    );

    return results;
  }

  /**
   * Enhanced batch processing with flexible options
   */
  async generateActivitiesFromFilenames(
    filenames: string[], 
    options: BatchProcessingOptions = {}
  ): Promise<(ActivityInsert | null)[]> {
    try {
      this.ensureInitialized();

      const {
        batchSize = this.defaultBatchSize,
        maxRetries = this.defaultMaxRetries,
        retryDelay = this.defaultRetryDelay,
        concurrency = this.defaultConcurrency
      } = options;

      console.log(`Starting batch processing of ${filenames.length} files with batch size ${batchSize}`);

      if (filenames.length === 0) {
        return [];
      }

      const results: (ActivityInsert | null)[] = [];
      const totalBatches = Math.ceil(filenames.length / batchSize);

      for (let i = 0; i < filenames.length; i += batchSize) {
        const batch = filenames.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        console.log(`Processing batch ${batchNumber}/${totalBatches}: ${batch.length} items`);

        let batchResults: (ActivityInsert | null)[];

        if (batch.length === 1) {
          // Single item - use individual processing
          const result = await this.generateActivityFromFilename(batch[0]);
          batchResults = [result];
        } else if (batch.length <= 10) {
          // Small batch - use single LLM call for efficiency
          batchResults = await this.processBatchWithSingleCall(batch);
        } else {
          // Large batch - use parallel processing with concurrency control
          batchResults = await this.processBatchInParallel(batch, concurrency);
        }

        results.push(...batchResults);

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < filenames.length) {
          console.log(`Waiting ${retryDelay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      const successCount = results.filter(r => r !== null).length;
      console.log(`Batch processing complete: ${successCount}/${filenames.length} successful`);

      return results;
    } catch (error) {
      console.error("Error in batch processing:", error);
      return Array(filenames.length).fill(null);
    }
  }

  /**
   * Generate image prompt with enhanced customization
   */
  private generateImagePrompt(activity: ActivityInsert): string {
    const categoryStyles: Record<string, string> = {
      'Work': 'professional office environment, modern workspace',
      'Health': 'clean medical or wellness setting, bright and calming',
      'Leisure': 'relaxed recreational environment, comfortable atmosphere',
      'Education': 'learning environment, books or classroom setting',
      'Family': 'warm family gathering, cozy home atmosphere',
      'Social': 'social gathering, friendly interaction',
      'Personal Growth': 'inspiring personal development setting',
      'Spiritual': 'peaceful spiritual environment, serene atmosphere',
      'Travel': 'exciting travel destination, adventure setting',
      'Chores': 'organized home setting, clean environment',
      'Hobby': 'creative hobby space, organized and inspiring',
      'Exercise': 'fitness environment, energetic atmosphere',
      'Nutrition': 'healthy food setting, fresh ingredients',
      'Other': 'appropriate activity setting'
    };

    const baseStyle = categoryStyles[activity.category] || '';
    let prompt = `High-quality, photorealistic image showing ${activity.name} in ${baseStyle}.`;

    // Add emotional tone based on life impact
    if (activity.lifeImpact >= 7) {
      prompt += ' Vibrant, joyful atmosphere with bright lighting and positive energy.';
    } else if (activity.lifeImpact >= 3) {
      prompt += ' Pleasant, comfortable atmosphere with good lighting.';
    } else if (activity.lifeImpact >= 0) {
      prompt += ' Neutral, balanced atmosphere.';
    } else if (activity.lifeImpact >= -3) {
      prompt += ' Subdued atmosphere, soft lighting.';
    } else {
      prompt += ' Challenging environment, dramatic lighting.';
    }

    // Add style specifications
    prompt += ' Professional photography style, sharp focus, good composition, realistic lighting.';

    // Add color hint if available
    if (activity.color) {
      prompt += ` Color palette inspired by ${activity.color}.`;
    }

    return prompt;
  }

  /**
   * Save base64 image with enhanced error handling
   */
  private async saveBase64Image(base64Data: string, activityName: string): Promise<ImageGenerationResponse> {
    try {
      await this.ensureUploadDirectory();

      // Clean base64 data
      const base64Content = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      // Generate safe filename
      const safeName = activityName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 20);

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}_${randomSuffix}.jpg`;
      const originalFilename = `${safeName}.jpg`;
      const fullPath = path.join(this.uploadDir, filename);

      // Decode and save
      const imageBuffer = Buffer.from(base64Content, 'base64');
      await writeFile(fullPath, imageBuffer);

      console.log(`Image saved successfully: ${fullPath}`);

      return {
        filename,
        originalFilename,
        path: `uploads/${filename}`,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw new TogetherAIError(
        `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_SAVE_ERROR',
        false
      );
    }
  }

  /**
   * Fetch image from URL with retry logic
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    const fetchCall = async () => {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'TogetherAI-Service/1.0'
        },
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    };

    const result = await this.makeAPICall(fetchCall, `Fetch image from ${url}`);
    if (!result.success) {
      throw new TogetherAIError(
        `Failed to fetch image: ${result.error}`,
        'IMAGE_FETCH_ERROR',
        true
      );
    }

    return result.data!;
  }

  /**
   * Generate image for activity with comprehensive error handling
   */
  async generateImageForActivity(activity: ActivityInsert): Promise<ImageGenerationResponse | null> {
    try {
      this.ensureInitialized();
      console.log(`Generating image for activity: ${activity.name}`);

      const prompt = this.generateImagePrompt(activity);
      console.log(`Image prompt: ${prompt}`);

      const imageCall = async () => {
        return await this.client.images.create({
          model: this.imageModel,
          prompt: prompt,
          steps: 4, // Maximum allowed steps (1-4)
          n: 1, // Generate single image for reliability
          seed: Math.floor(Math.random() * 1000000)
        });
      };

      const result = await this.makeAPICall(imageCall, `Generate image for ${activity.name}`);
      if (!result.success || !result.data) {
        console.error(`Failed to generate image for ${activity.name}:`, result.error);
        return null;
      }

      const response = result.data;

      // Validate response structure
      if (!response.data || response.data.length === 0) {
        console.error('No image data in response');
        return null;
      }

      const imageData = response.data[0];
      console.log('Image response keys:', Object.keys(imageData));

      // Handle URL response
      if (imageData.url) {
        console.log('Processing image URL response...');
        try {
          const base64Image = await this.fetchImageAsBase64(imageData.url);
          return await this.saveBase64Image(base64Image, activity.name);
        } catch (error) {
          console.error('Error processing image URL:', error);
          return null;
        }
      }

      // Handle base64 response
      if (imageData.b64_json) {
        console.log('Processing base64 image response...');
        try {
          return await this.saveBase64Image(imageData.b64_json, activity.name);
        } catch (error) {
          console.error('Error processing base64 image:', error);
          return null;
        }
      }

      console.error('No valid image data found in response');
      return null;

    } catch (error) {
      console.error(`Error generating image for activity ${activity.name}:`, error);
      return null;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{ status: string; initialized: boolean; canGenerateText: boolean; canGenerateImages: boolean }> {
    const status = {
      status: 'unknown',
      initialized: this.isInitialized,
      canGenerateText: false,
      canGenerateImages: false
    };

    try {
      if (!this.isInitialized) {
        status.status = 'not_initialized';
        return status;
      }

      // Test text generation
      try {
        const testResponse = await this.client.chat.completions.create({
          messages: [{ role: "user", content: "Hello" }],
          model: this.textModel,
          max_tokens: 10
        });
        status.canGenerateText = !!testResponse.choices[0]?.message?.content;
      } catch (error) {
        console.warn('Text generation test failed:', error);
      }

      // Test image generation (optional, as it's more expensive)
      // Uncomment if you want to test image generation in health checks
      /*
      try {
        const testImageResponse = await this.client.images.create({
          model: this.imageModel,
          prompt: "test",
          width: 256,
          height: 256,
          steps: 10,
          n: 1
        });
        status.canGenerateImages = !!testImageResponse.data[0];
      } catch (error) {
        console.warn('Image generation test failed:', error);
      }
      */

      // For now, assume image generation works if text generation works
      status.canGenerateImages = status.canGenerateText;

      status.status = status.canGenerateText ? 'healthy' : 'degraded';
    } catch (error) {
      console.error('Health check failed:', error);
      status.status = 'unhealthy';
    }

    return status;
  }

  /**
   * Get service statistics
   */
  getStats(): { 
    initialized: boolean; 
    uploadDirectory: string;
    textModel: string;
    imageModel: string;
    defaultBatchSize: number;
  } {
    return {
      initialized: this.isInitialized,
      uploadDirectory: this.uploadDir,
      textModel: this.textModel,
      imageModel: this.imageModel,
      defaultBatchSize: this.defaultBatchSize
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: {
    textModel?: string;
    imageModel?: string;
    uploadDir?: string;
  }): void {
    if (config.textModel) {
      this.textModel = config.textModel;
      console.log(`Updated text model to: ${this.textModel}`);
    }

    if (config.imageModel) {
      this.imageModel = config.imageModel;
      console.log(`Updated image model to: ${this.imageModel}`);
    }

    if (config.uploadDir) {
      this.uploadDir = config.uploadDir;
      this.ensureUploadDirectory();
      console.log(`Updated upload directory to: ${this.uploadDir}`);
    }
  }

  /**
   * Cleanup resources (if needed)
   */
  async cleanup(): Promise<void> {
    try {
      // Add any cleanup logic here if needed
      console.log('TogetherAI service cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance for backward compatibility
export const togetherAIService = new TogetherAIService();

// Export additional utilities for advanced usage
export { TogetherAIError, type ActivityGenerationResponse, type ImageGenerationResponse, type BatchProcessingOptions };

// Example usage:
/*

// Basic usage (backward compatible)
const activity = await togetherAIService.generateActivityFromFilename('morningYoga.jpg');

// Batch processing with options
const activities = await togetherAIService.generateActivitiesFromFilenames(
  ['morningYoga.jpg', 'readingBook.png', 'cookingDinner.jpg'],
  {
    batchSize: 5,
    maxRetries: 3,
    retryDelay: 1000,
    concurrency: 2
  }
);

// Image generation
const imageData = await togetherAIService.generateImageForActivity(activity);

// Health check
const health = await togetherAIService.healthCheck();
console.log('Service health:', health);

// Get service stats
const stats = togetherAIService.getStats();
console.log('Service stats:', stats);

// Update configuration
togetherAIService.updateConfig({
  textModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  uploadDir: './custom-uploads'
});

// Cleanup (call before shutting down)
await togetherAIService.cleanup();

*/