import OpenAI from 'openai';
import { z } from 'zod';
import { storage } from "../storage";
import { LLMConversation, LLMMessage, SystemPrompt } from '@shared/schema';

// Schema for validating OpenAI API requests
const openAIRequestSchema = z.object({
  model: z.string().default("gpt-3.5-turbo"),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().positive().default(1024),
  top_p: z.number().min(0).max(1).default(1),
});

type OpenAIRequest = z.infer<typeof openAIRequestSchema>;

// Response for when the OpenAI API key is missing
const fallbackResponse = {
  id: "fallback-response",
  object: "chat.completion",
  created: Date.now(),
  model: "fallback-model",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "I'm unable to process your request as the OpenAI API key is missing. This is a simulated response to show how the feature would work with a valid API key. Please ask the administrator to set up the OpenAI API key to enable this functionality."
      },
      finish_reason: "stop"
    }
  ]
};

export class LLMService {
  private client: OpenAI | null = null;
  
  constructor() {
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Checks if the OpenAI API key is available
   */
  hasApiKey(): boolean {
    return this.client !== null;
  }

  /**
   * Gets or creates a default system prompt
   */
  async getDefaultSystemPrompt(): Promise<SystemPrompt> {
    const defaultPromptName = "default";
    let systemPrompt = await storage.getSystemPromptByName(defaultPromptName);
    
    if (!systemPrompt) {
      systemPrompt = await storage.createSystemPrompt({
        name: defaultPromptName,
        content: "You are a helpful assistant that provides advice for time management and life optimization. Your purpose is to help users make the most of their time and improve their quality of life through thoughtful insights and suggestions.",
        description: "Default system prompt for general-purpose conversations",
      });
    }
    
    return systemPrompt;
  }

  /**
   * Formats conversation history for OpenAI API
   */
  async formatConversationHistory(conversationId: number): Promise<OpenAIRequest["messages"]> {
    const messages = await storage.getLLMMessages(conversationId);
    return messages.map(message => ({
      role: message.role as "system" | "user" | "assistant",
      content: message.content
    }));
  }

  /**
   * Sends a message to the OpenAI API
   */
  async sendMessage(
    userId: number,
    conversationId: number | null,
    message: string,
    systemPromptId?: number
  ): Promise<{
    conversation: LLMConversation;
    userMessage: LLMMessage;
    assistantMessage: LLMMessage;
  }> {
    // Get or create conversation
    let conversation: LLMConversation;
    if (conversationId) {
      const existingConversation = await storage.getLLMConversation(conversationId);
      if (!existingConversation || existingConversation.userId !== userId) {
        throw new Error("Conversation not found or not authorized");
      }
      conversation = existingConversation;
      
      // Update the conversation's updatedAt timestamp
      await storage.updateLLMConversation(conversation.id, {});
    } else {
      // Create a new conversation with the first few words of the message as the title
      const title = message.slice(0, 30) + (message.length > 30 ? "..." : "");
      conversation = await storage.createLLMConversation({
        userId,
        title
      });
    }

    // Get system prompt
    const systemPrompt = systemPromptId
      ? await storage.getSystemPrompt(systemPromptId)
      : await this.getDefaultSystemPrompt();

    // Create user message
    const userMessage = await storage.createLLMMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
      systemPromptId: null
    });

    // Get conversation history
    const conversationHistory = await this.formatConversationHistory(conversation.id);
    
    // Prepend system message if this is the first message in the conversation
    if (conversationHistory.length <= 1) {
      await storage.createLLMMessage({
        conversationId: conversation.id,
        role: "system",
        content: systemPrompt.content,
        systemPromptId: systemPrompt.id
      });
      
      // Update conversation history with system prompt
      conversationHistory.unshift({
        role: "system",
        content: systemPrompt.content
      });
    }

    // Call OpenAI API
    let response;
    if (this.hasApiKey()) {
      try {
        const request = openAIRequestSchema.parse({
          model: "gpt-3.5-turbo",
          messages: conversationHistory,
        });
        
        response = await this.client!.chat.completions.create(request);
      } catch (error) {
        console.error("Error calling OpenAI API:", error);
        response = fallbackResponse;
      }
    } else {
      // Use fallback response if API key is missing
      response = fallbackResponse;
    }

    // Extract assistant's response
    const assistantContent = response.choices[0].message.content;

    // Save assistant's response to database
    const assistantMessage = await storage.createLLMMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: assistantContent,
      systemPromptId: null
    });

    return {
      conversation,
      userMessage,
      assistantMessage
    };
  }
}

export const llmService = new LLMService();