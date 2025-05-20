import { Router } from "express";
import { storage } from "../storage";
import { auth } from "../auth";
import { z } from "zod";
import { db } from "../db";
import { books, bookActivities, activities } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

const bookRouter = Router();

// Get all books for the current user
bookRouter.get("/", auth, async (req, res) => {
  try {
    const userBooks = await db.select()
      .from(books)
      .where(eq(books.userId, req.user!.id))
      .orderBy(desc(books.createdAt));
    res.json(userBooks);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Create a new book
bookRouter.post("/", auth, async (req, res) => {
  try {
    const { name } = z.object({
      name: z.string().min(1),
    }).parse(req.body);

    const [newBook] = await db.insert(books).values({
      userId: req.user!.id,
      name,
    }).returning();

    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ error: "Failed to create book" });
  }
});

// Update a book
bookRouter.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = z.object({
      name: z.string().min(1),
    }).parse(req.body);

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const [updatedBook] = await db.update(books)
      .set({ name, updatedAt: new Date() })
      .where(eq(books.id, parseInt(id)))
      .returning();

    res.json(updatedBook);
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

// Delete a book
bookRouter.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    await db.delete(books).where(eq(books.id, parseInt(id)));

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// Get book details with activities
bookRouter.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookActivitiesList = await db
      .select({
        activityId: bookActivities.activityId,
        orderIndex: bookActivities.orderIndex,
      })
      .from(bookActivities)
      .where(eq(bookActivities.bookId, parseInt(id)))
      .orderBy(bookActivities.orderIndex);

    const activityIds = bookActivitiesList.map(ba => ba.activityId);
    
    const bookActivityDetails = activityIds.length > 0 
      ? await db.select().from(activities).where(inArray(activities.id, activityIds))
      : [];

    res.json({
      ...book,
      activities: bookActivityDetails,
    });
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});

// Add activity to book
bookRouter.post("/:id/activities", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { activityId } = z.object({
      activityId: z.number(),
    }).parse(req.body);

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Get the highest order index
    const [lastActivity] = await db.select()
      .from(bookActivities)
      .where(eq(bookActivities.bookId, parseInt(id)))
      .orderBy(bookActivities.orderIndex)
      .limit(1);

    const orderIndex = lastActivity ? lastActivity.orderIndex + 1 : 0;

    const [newBookActivity] = await db.insert(bookActivities)
      .values({
        bookId: parseInt(id),
        activityId,
        orderIndex,
      })
      .returning();

    res.status(201).json(newBookActivity);
  } catch (error) {
    console.error("Error adding activity to book:", error);
    res.status(500).json({ error: "Failed to add activity to book" });
  }
});

// Remove activity from book
bookRouter.delete("/:id/activities/:activityId", auth, async (req, res) => {
  try {
    const { id, activityId } = req.params;

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    await db.delete(bookActivities)
      .where(
        and(
          eq(bookActivities.bookId, parseInt(id)),
          eq(bookActivities.activityId, parseInt(activityId))
        )
      );

    res.json({ message: "Activity removed from book successfully" });
  } catch (error) {
    console.error("Error removing activity from book:", error);
    res.status(500).json({ error: "Failed to remove activity from book" });
  }
});

// Update activity order in book
bookRouter.put("/:id/activities/order", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { activityOrders } = z.object({
      activityOrders: z.array(z.object({
        activityId: z.number(),
        orderIndex: z.number(),
      })),
    }).parse(req.body);

    const [book] = await db.select().from(books).where(
      and(
        eq(books.id, parseInt(id)),
        eq(books.userId, req.user!.id)
      )
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Update each activity's order
    for (const { activityId, orderIndex } of activityOrders) {
      await db.update(bookActivities)
        .set({ orderIndex })
        .where(
          and(
            eq(bookActivities.bookId, parseInt(id)),
            eq(bookActivities.activityId, activityId)
          )
        );
    }

    res.json({ message: "Activity order updated successfully" });
  } catch (error) {
    console.error("Error updating activity order:", error);
    res.status(500).json({ error: "Failed to update activity order" });
  }
});

export default bookRouter; 