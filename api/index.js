// Vercel serverless function for Green Gold Seeds API
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Create Express app once
let app;

async function createApp() {
  if (app) return app;
  
  app = express();
  
  // Configure middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport strategy
  passport.use(new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async (username, password, done) => {
      try {
        // Mock users for testing
        const users = [
          { id: '1', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@test.com' },
          { id: '2', username: 'op2', password: 'test123', role: 'operator', email: 'op@test.com' }
        ];
        
        const user = users.find(u => u.username === username);
        if (!user || user.password !== password) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    const users = [
      { id: '1', username: 'admin', role: 'admin', email: 'admin@test.com' },
      { id: '2', username: 'op2', role: 'operator', email: 'op@test.com' }
    ];
    const user = users.find(u => u.id === id);
    done(null, user);
  });
  
  // API Routes
  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json(req.user);
  });
  
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  app.get('/api/products', (req, res) => {
    // Mock products for testing
    const products = [
      {
        id: '1',
        product: 'Test Product 1',
        brand: 'Test Brand',
        status: 'pending',
        uniqueId: 'TEST-001',
        mrp: 100,
        submittedBy: 'op@test.com'
      }
    ];
    res.json(products);
  });
  
  return app;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const expressApp = await createApp();
    return expressApp(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    });
  }
}