import { Router } from "express";
import { db } from "../db";
import { llmConversations, llmMessages, systemPrompts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";

const llmRouter = Router();

// Get all conversations for the current user
llmRouter.get("/conversations", auth, async (req, res) => {
  try {
    const conversations = await db.query.llmConversations.findMany({
      where: eq(llmConversations.userId, req.user!.id),
      orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
    });
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Create a new conversation
llmRouter.post("/conversations", auth, async (req, res) => {
  try {
    const { title } = z.object({
      title: z.string().min(1),
    }).parse(req.body);

    const [newConversation] = await db.insert(llmConversations).values({
      userId: req.user!.id,
      title,
    }).returning();

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

// Get conversation messages
llmRouter.get("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const { id } = z.object({
      id: z.string(),
    }).parse(req.params);

    // Check if conversation belongs to user
    const [conversation] = await db.select().from(llmConversations).where(
      and(
        eq(llmConversations.id, parseInt(id)),
        eq(llmConversations.userId, req.user!.id)
      )
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await db.query.llmMessages.findMany({
      where: eq(llmMessages.conversationId, parseInt(id)),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Add message to conversation
llmRouter.post("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const { id } = z.object({
      id: z.string(),
    }).parse(req.params);

    const { role, content, systemPromptId } = z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
      systemPromptId: z.number().optional(),
    }).parse(req.body);

    // Check if conversation belongs to user
    const [conversation] = await db.select().from(llmConversations).where(
      and(
        eq(llmConversations.id, parseInt(id)),
        eq(llmConversations.userId, req.user!.id)
      )
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const [newMessage] = await db.insert(llmMessages).values({
      conversationId: parseInt(id),
      role,
      content,
      systemPromptId,
    }).returning();

    // Update conversation's updatedAt timestamp
    await db.update(llmConversations)
      .set({ updatedAt: new Date() })
      .where(eq(llmConversations.id, parseInt(id)));

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ message: "Failed to add message" });
  }
});

// Get system prompts
llmRouter.get("/system-prompts", auth, async (req, res) => {
  try {
    const prompts = await db.query.systemPrompts.findMany();
    res.json(prompts);
  } catch (error) {
    console.error("Error fetching system prompts:", error);
    res.status(500).json({ message: "Failed to fetch system prompts" });
  }
});

export default llmRouter;