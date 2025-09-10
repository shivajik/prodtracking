// Vercel serverless function
import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes
await registerRoutes(app);

// Export the Express app as a serverless function
export default app;