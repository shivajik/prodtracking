// Vercel serverless function for Green Gold Seeds API
import express from "express";
import session from "express-session";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Schema validation (inline since we can't import from shared/schema.ts)
const insertProductSchema = z.object({
  uniqueId: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  brand: z.string().min(1, "Brand is required"),
  product: z.string().min(1, "Product is required"),
  description: z.string().min(1, "Description is required"),
  mrp: z.string().min(1, "MRP is required"),
  netQty: z.string().min(1, "Net quantity is required"),
  lotBatch: z.string().min(1, "Lot/Batch is required"),
  mfgDate: z.string().min(1, "Manufacturing date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  customerCare: z.string().min(1, "Customer care is required"),
  email: z.string().email("Valid email is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  marketedBy: z.string().min(1, "Marketed by is required"),
  brochureUrl: z.string().optional(),
  brochureFilename: z.string().optional(),
  submittedBy: z.string().optional(),
});

// Storage functions for database operations
const storage = {
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        submission_date: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('submission_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getProductsByStatus(status) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', status)
      .order('submission_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getProductsBySubmitter(submitterId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('submitted_by', submitterId)
      .order('submission_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getProductByUniqueId(uniqueId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('unique_id', uniqueId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getProductById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProductStatus(id, status, approvedBy, rejectionReason = null) {
    const updateData = {
      status,
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
    };

    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProduct(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Setup multer for file uploads (Note: In serverless, files are temporary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed"));
    }
  }
});

// Generate unique ID for products
function generateUniqueId() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `GGS-${year}-${timestamp}`;
}

// Password hashing utility
async function hashPassword(password) {
  const { scrypt, randomBytes } = await import("crypto");
  const { promisify } = await import("util");
  const scryptAsync = promisify(scrypt);
  
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  req.user = req.session.user;
  req.isAuthenticated = () => !!req.session?.user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session?.user || req.session.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}

// Create Express app
let app;

async function createApp() {
  if (app) return app;
  
  app = express();
  
  // Configure middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password (simplified for production)
      const [hash, salt] = user.password.split('.');
      const { scrypt } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const buf = await scryptAsync(password, salt, 64);
      const hashedAttempt = buf.toString('hex');

      if (hash !== hashedAttempt) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  // Product routes
  app.post("/api/products", requireAuth, requireRole("operator"), upload.single("brochure"), async (req, res) => {
    try {
      const productData = { ...req.body };
      
      // Auto-generate unique ID if not provided
      if (!productData.uniqueId) {
        productData.uniqueId = generateUniqueId();
      }

      // Handle file upload (in production, you'd typically upload to cloud storage)
      if (req.file) {
        // For production, you'd upload to Supabase Storage, AWS S3, etc.
        // For now, we'll just store the filename
        productData.brochureUrl = `/api/files/${productData.uniqueId}${path.extname(req.file.originalname)}`;
        productData.brochureFilename = req.file.originalname;
      }

      // Validate product data
      const validatedData = insertProductSchema.parse({
        ...productData,
        submittedBy: req.user.id,
      });

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get products by status (for admin)
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      let products;

      if (req.user?.role === "admin") {
        if (status && typeof status === "string") {
          products = await storage.getProductsByStatus(status);
        } else {
          products = await storage.getAllProducts();
        }
      } else if (req.user?.role === "operator") {
        // Operators can only see their own products
        products = await storage.getProductsBySubmitter(req.user.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get public product by unique ID
  app.get("/api/track/:uniqueId", async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const product = await storage.getProductByUniqueId(uniqueId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.status !== "approved") {
        return res.status(404).json({ message: "Product not available" });
      }

      // Remove sensitive information for public view
      const publicProduct = {
        ...product,
        submittedBy: undefined,
        approvedBy: undefined,
        rejectionReason: undefined,
      };

      res.json(publicProduct);
    } catch (error) {
      console.error("Get public product error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update product status (admin only)
  app.patch("/api/products/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      if (status === "rejected" && !rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const product = await storage.updateProductStatus(
        id,
        status,
        req.user.id,
        rejectionReason
      );

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update product status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update product (admin for any product, operator for own pending products)
  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get the product first to check ownership and status
      const existingProduct = await storage.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check permissions
      if (req.user.role === "admin") {
        // Admins can edit any product
      } else if (req.user.role === "operator") {
        // Operators can only edit their own pending or rejected products
        if (existingProduct.submitted_by !== req.user.id) {
          return res.status(403).json({ message: "You can only edit your own products" });
        }
        if (existingProduct.status !== "pending" && existingProduct.status !== "rejected") {
          return res.status(403).json({ message: "Only pending or rejected products can be edited" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const product = await storage.updateProduct(id, updates);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete product (admin only)
  app.delete("/api/products/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProduct(id);

      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create operator account (admin only)
  app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create operator user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: "operator",
      });

      // Remove password from response
      const { password: _, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove passwords from response
      const usersResponse = users.map(({ password, ...user }) => user);
      res.json(usersResponse);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Debug endpoint to check database connection and data
  app.get("/api/debug", async (req, res) => {
    try {
      // Get database info (without exposing connection string)
      const dbUrl = process.env.DATABASE_URL || "Not set";
      const isSupabase = dbUrl.includes("supabase.com");
      
      // Get product counts by status
      const allProducts = await storage.getAllProducts();
      const pendingCount = allProducts.filter(p => p.status === "pending").length;
      const approvedCount = allProducts.filter(p => p.status === "approved").length;
      const rejectedCount = allProducts.filter(p => p.status === "rejected").length;
      
      // Get sample products
      const sampleProducts = allProducts.slice(0, 3).map(p => ({
        uniqueId: p.unique_id,
        product: p.product,
        status: p.status,
        submissionDate: p.submission_date
      }));
      
      res.json({
        environment: process.env.NODE_ENV || "unknown",
        database: {
          isSupabase,
          host: isSupabase ? "supabase.com" : "Unknown",
          connected: true
        },
        productCounts: {
          total: allProducts.length,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount
        },
        sampleProducts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ 
        error: "Debug failed", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Serve uploaded files (Note: In production, you'd serve from cloud storage)
  app.get("/api/files/:filename", (req, res) => {
    // In production, you would redirect to or serve from cloud storage
    res.status(404).json({ message: "File not found" });
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}