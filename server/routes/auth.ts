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
      // Return user data without password
      const { password: _, ...userData } = user;
      return res.json(userData);
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Register route
authRouter.post("/register", async (req, res) => {
  console.log("[REGISTER] Incoming registration request:", req.body);
  try {
    const { username, password, name } = z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string(),
    }).parse(req.body);
    console.log("[REGISTER] Parsed body:", { username, name });

    // Check if username already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    if (existingUser) {
      console.log("[REGISTER] Username already exists:", username);
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    console.log("[REGISTER] Hashing password for:", username);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("[REGISTER] Password hashed");

    // Create user
    console.log("[REGISTER] Inserting new user into database:", { username, name });
    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      name,
    }).returning();
    console.log("[REGISTER] New user created:", newUser);

    // Log in the new user
    req.login(newUser, (err) => {
      if (err) {
        console.error("[REGISTER] Login error after registration:", err);
        return res.status(500).json({ message: "Registration successful but login failed" });
      }
      // Return user data without password
      const { password: _, ...userData } = newUser;
      console.log("[REGISTER] Registration and login successful for:", username);
      console.log("[REGISTER] User data being returned:", userData);
      return res.status(201).json(userData);
    });
  } catch (error) {
    console.error("[REGISTER] Registration error:", error);
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

// Admin check route
authRouter.get("/admin-check", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // List of admin usernames
  const adminUsers = [
  'realityinspector',
  'courtklein'
];
  const username = req.user && typeof req.user === 'object' ? 
                  (req.user as {username?: string}).username || '' : '';
  
  const isAdmin = adminUsers.includes(username);
  return res.json({ isAdmin });
});

export default authRouter;