// Vercel serverless function
import express from "express";
import { registerRoutes } from "../server/routes.js";

let app;

// Initialize the app
async function createApp() {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Initialize routes
    await registerRoutes(app);
  }
  return app;
}

// Export the handler function for Vercel
export default async function handler(req, res) {
  const expressApp = await createApp();
  return expressApp(req, res);
}