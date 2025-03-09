import { Router } from "express";
import { storage } from "../storage";
import { llmService } from "../services/llm";
import { z } from "zod";
import { systemPromptSchema, llmConversationSchema, llmMessageSchema } from "@shared/schema";

export const llmRouter = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Validate system prompt request
const systemPromptRequestSchema = systemPromptSchema.extend({});

// Validate send message request
const sendMessageRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.number().nullable().optional(),
  systemPromptId: z.number().nullable().optional(),
});

// Get system prompts
llmRouter.get("/prompts", requireAuth, async (req, res) => {
  try {
    const prompts = await storage.getSystemPrompts();
    res.json(prompts);
  } catch (error) {
    console.error("Error fetching system prompts:", error);
    res.status(500).json({ message: "Failed to fetch system prompts" });
  }
});

// Get a specific system prompt
llmRouter.get("/prompts/:id", requireAuth, async (req, res) => {
  try {
    const promptId = parseInt(req.params.id);
    if (isNaN(promptId)) {
      return res.status(400).json({ message: "Invalid prompt ID" });
    }
    
    const prompt = await storage.getSystemPrompt(promptId);
    if (!prompt) {
      return res.status(404).json({ message: "System prompt not found" });
    }
    
    res.json(prompt);
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    res.status(500).json({ message: "Failed to fetch system prompt" });
  }
});

// Create a system prompt
llmRouter.post("/prompts", requireAuth, async (req, res) => {
  try {
    const promptData = systemPromptRequestSchema.parse(req.body);
    const prompt = await storage.createSystemPrompt(promptData);
    res.status(201).json(prompt);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
    }
    console.error("Error creating system prompt:", error);
    res.status(500).json({ message: "Failed to create system prompt" });
  }
});

// Update a system prompt
llmRouter.put("/prompts/:id", requireAuth, async (req, res) => {
  try {
    const promptId = parseInt(req.params.id);
    if (isNaN(promptId)) {
      return res.status(400).json({ message: "Invalid prompt ID" });
    }
    
    const promptData = systemPromptRequestSchema.parse(req.body);
    const updatedPrompt = await storage.updateSystemPrompt(promptId, promptData);
    
    if (!updatedPrompt) {
      return res.status(404).json({ message: "System prompt not found" });
    }
    
    res.json(updatedPrompt);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
    }
    console.error("Error updating system prompt:", error);
    res.status(500).json({ message: "Failed to update system prompt" });
  }
});

// Delete a system prompt
llmRouter.delete("/prompts/:id", requireAuth, async (req, res) => {
  try {
    const promptId = parseInt(req.params.id);
    if (isNaN(promptId)) {
      return res.status(400).json({ message: "Invalid prompt ID" });
    }
    
    // Check if prompt exists
    const prompt = await storage.getSystemPrompt(promptId);
    if (!prompt) {
      return res.status(404).json({ message: "System prompt not found" });
    }
    
    await storage.deleteSystemPrompt(promptId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting system prompt:", error);
    res.status(500).json({ message: "Failed to delete system prompt" });
  }
});

// Get conversations for the current user
llmRouter.get("/conversations", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await storage.getLLMConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get a specific conversation
llmRouter.get("/conversations/:id", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    const conversation = await storage.getLLMConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if the conversation belongs to the current user
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to access this conversation" });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// Delete a conversation
llmRouter.delete("/conversations/:id", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    const conversation = await storage.getLLMConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if the conversation belongs to the current user
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this conversation" });
    }
    
    await storage.deleteLLMConversation(conversationId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Failed to delete conversation" });
  }
});

// Get messages for a conversation
llmRouter.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    
    const conversation = await storage.getLLMConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if the conversation belongs to the current user
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to access this conversation" });
    }
    
    const messages = await storage.getLLMMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send a message to the LLM
llmRouter.post("/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversationId, systemPromptId } = sendMessageRequestSchema.parse(req.body);
    
    // If conversationId is provided, check if it exists and belongs to the user
    if (conversationId) {
      const conversation = await storage.getLLMConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to access this conversation" });
      }
    }
    
    // Get API status
    const hasApiKey = llmService.hasApiKey();
    
    // Process the message
    const result = await llmService.sendMessage(
      userId,
      conversationId || null,
      message,
      systemPromptId || undefined
    );
    
    res.json({
      ...result,
      apiStatus: {
        available: hasApiKey,
        fallbackMode: !hasApiKey
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid message data", errors: error.errors });
    }
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});