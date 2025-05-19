import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";

const authRouter = Router();

// Login route
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = z.object({
      username: z.string(),
      password: z.string(),
    }).parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set up session
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      return res.json({ message: "Logged in successfully" });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Register route
authRouter.post("/register", async (req, res) => {
  try {
    const { username, password, name } = z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string(),
    }).parse(req.body);

    // Check if username already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      name,
    }).returning();

    // Log in the new user
    req.login(newUser, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Registration successful but login failed" });
      }
      return res.status(201).json({ message: "Registration successful" });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Logout route
authRouter.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    return res.json({ message: "Logged out successfully" });
  });
});

// Check authentication status
authRouter.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user });
  }
  return res.json({ authenticated: false });
});

export default authRouter; 