// Vercel serverless function for Green Gold Seeds API
import express from "express";
import session from "express-session";

// Create Express app once
let app;

async function createApp() {
  if (app) return app;
  
  try {
    // Try multiple import paths for different environments
    let builtApp;
    const possiblePaths = [
      '../dist/index.js',
      './dist/index.js',
      '/var/task/dist/index.js'
    ];
    
    for (const path of possiblePaths) {
      try {
        const imported = await import(path);
        if (imported.default && typeof imported.default === 'function') {
          builtApp = imported.default;
          console.log(`Successfully imported app from: ${path}`);
          break;
        }
      } catch (pathError) {
        console.log(`Failed to import from ${path}:`, pathError.message);
      }
    }
    
    if (builtApp) {
      app = builtApp;
      return app;
    }
  } catch (error) {
    console.error('Failed to import built app, using fallback:', error);
  }
  
  // Fallback Express app with basic authentication
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
  
  // Simple authentication for fallback
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if ((username === 'admin' && password === 'admin123') || 
        (username === 'op2' && password === 'test123')) {
      req.session.user = {
        id: username === 'admin' ? '1' : '2',
        username,
        role: username === 'admin' ? 'admin' : 'operator',
        email: username === 'admin' ? 'admin@test.com' : 'op@test.com'
      };
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
  
  app.get('/api/user', (req, res) => {
    if (req.session?.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  app.get('/api/products', (req, res) => {
    // Basic fallback products
    res.json([
      {
        id: '1',
        product: 'Fallback Product',
        brand: 'Test Brand',
        status: 'approved',
        uniqueId: 'FALLBACK-001',
        mrp: 100,
        submittedBy: 'op@test.com'
      }
    ]);
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