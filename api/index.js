// Vercel serverless function for Green Gold Seeds API
import express from "express";

// Create Express app for serverless function
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      message: error.message 
    });
  }
}