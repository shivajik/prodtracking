// Vercel serverless function for Green Gold Seeds API
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "../server/storage.js";

// Create Express app for serverless function
const app = express();

// Configure session
const PostgresSessionStore = connectPg(session);
app.use(session({
  store: storage.sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Import and register routes
let routesRegistered = false;

async function ensureRoutes() {
  if (!routesRegistered) {
    try {
      const { registerRoutes } = await import('../server/routes.js');
      await registerRoutes(app);
      routesRegistered = true;
    } catch (error) {
      console.error('Failed to register routes:', error);
      throw error;
    }
  }
}

// Export the handler function for Vercel
export default async function handler(req, res) {
  try {
    await ensureRoutes();
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}