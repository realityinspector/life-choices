import passport from "passport";
import passportLocal from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, InsertUser } from "@shared/schema";
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
      age: number | null;
      lifeExpectancy: number | null;
      sleepHours: number | null;
    }
    interface Request {
      user?: User;
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

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set (e.g. `openssl rand -hex 32`).");
  }
  return secret;
}

export function setupAuth(app: Express) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const sessionSettings: session.SessionOptions = {
    secret: requireSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'connect.sid',
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // Set to false for Replit environment
      sameSite: 'lax',
      path: '/'
    }
  };

  app.set("trust proxy", 1); // Trust first proxy
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

        // Convert user to Express.User type
        const expressUser: Express.User = {
          id: user.id,
          username: user.username,
          name: user.name,
          age: user.age,
          lifeExpectancy: user.lifeExpectancy,
          sleepHours: user.sleepHours
        };

        return done(null, expressUser);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) {
        return done(null, false);
      }
      
      // Convert user to Express.User type
      const expressUser: Express.User = {
        id: user.id,
        username: user.username,
        name: user.name,
        age: user.age,
        lifeExpectancy: user.lifeExpectancy,
        sleepHours: user.sleepHours
      };
      
      done(null, expressUser);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", { username: req.body.username });
    
    passport.authenticate("local", (err: Error | null, user: UserType | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Session error" });
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