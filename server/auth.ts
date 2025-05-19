import passport from "passport";
import passportLocal from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, InsertUser } from "@shared/schema";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// Use CommonJS-style import for passport-local
const { Strategy: LocalStrategy } = passportLocal;

// Define User type for Express
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name: string;
      age: number;
      lifeExpectancy: number;
      sleepHours: number;
    }
    interface Request {
      user?: any;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "REDACTED_SET_SESSION_SECRET_ENV",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'connect.sid',
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    }
  };

  app.set("trust proxy", true);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, age, lifeExpectancy, sleepHours } = req.body;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const userData: InsertUser = {
        username,
        password, // In a real app we would hash this with hashPassword
        name: name || username,
        age: parseInt(age) || 30,
        lifeExpectancy: parseInt(lifeExpectancy) || 85,
        sleepHours: parseFloat(sleepHours) || 8
      };

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", { username: req.body.username });
    
    passport.authenticate("local", (err: Error | null, user: UserType | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return next(err);
        }
        console.log("Login successful for user:", user.username);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('Auth Debug:', {
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      user: req.user,
      cookies: req.headers.cookie
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}

// Authentication middleware
export const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Session configuration
export const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "REDACTED_SET_SESSION_SECRET_ENV",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Initialize passport middleware
export const initializePassport = (app: any) => {
  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());
};