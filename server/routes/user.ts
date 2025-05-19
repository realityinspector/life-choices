import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";

const userRouter = Router();

// Get current user
userRouter.get("/me", auth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Update user
userRouter.put("/me", auth, async (req, res) => {
  try {
    const { name, email, age, lifeExpectancy, sleepHours } = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      age: z.number().min(0).max(120).optional(),
      lifeExpectancy: z.number().min(0).max(120).optional(),
      sleepHours: z.number().min(0).max(24).optional(),
    }).parse(req.body);

    const [updatedUser] = await db.update(users)
      .set({
        name,
        email,
        age,
        lifeExpectancy,
        sleepHours,
      })
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Delete user
userRouter.delete("/me", auth, async (req, res) => {
  try {
    await db.delete(users).where(eq(users.id, req.user!.id));
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Account deleted but logout failed" });
      }
      return res.json({ message: "Account deleted successfully" });
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default userRouter; 