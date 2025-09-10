// api/index.js - Production-ready serverless function with embedded schema
import express from "express";
import session from "express-session";
import { Pool } from "pg";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectPgSimple from "connect-pg-simple";

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Configure session storage with PostgreSQL
const PgSession = connectPgSimple(session);

// Configure middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Session configuration
app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Simple authentication middleware
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
});

// Helper function to check authentication
function requireAuth(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

// Setup file uploads - Use /tmp directory on Vercel
const uploadDir = "/tmp/uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
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
  },
});

// Define Zod schemas for validation (replacing the shared schema)
const insertProductSchema = z.object({
  uniqueId: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  brand: z.string().min(1, "Brand is required"),
  product: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  mrp: z.string().min(1, "MRP is required").or(z.number()),
  netQty: z.string().min(1, "Net quantity is required"),
  lotBatch: z.string().min(1, "Lot/Batch number is required"),
  mfgDate: z.string().min(1, "Manufacturing date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  customerCare: z.string().min(1, "Customer care details are required"),
  email: z.string().email("Valid email is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  marketedBy: z.string().min(1, "Marketed by information is required"),
  brochureUrl: z.string().optional(),
  brochureFilename: z.string().optional(),
  submittedBy: z.string().optional(),
});

// Storage functions for database operations
const storage = {
  // Product operations
  createProduct: async (productData) => {
    const {
      uniqueId,
      company,
      brand,
      product,
      description,
      mrp,
      netQty,
      lotBatch,
      mfgDate,
      expiryDate,
      customerCare,
      email,
      companyAddress,
      marketedBy,
      brochureUrl,
      brochureFilename,
      submittedBy,
    } = productData;

    const result = await pool.query(
      `INSERT INTO products 
       (unique_id, company, brand, product, description, mrp, net_qty, lot_batch, 
        mfg_date, expiry_date, customer_care, email, company_address, marketed_by, 
        brochure_url, brochure_filename, submitted_by, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending') 
       RETURNING *`,
      [
        uniqueId, company, brand, product, description, mrp, netQty, lotBatch,
        mfgDate, expiryDate, customerCare, email, companyAddress, marketedBy,
        brochureUrl, brochureFilename, submittedBy
      ]
    );

    return result.rows[0];
  },

  getProductsByStatus: async (status) => {
    const result = await pool.query("SELECT * FROM products WHERE status = $1 ORDER BY created_at DESC", [
      status,
    ]);
    return result.rows;
  },

  getAllProducts: async () => {
    const result = await pool.query(`
      SELECT p.*, u1.email as submitted_by_email, u2.email as approved_by_email 
      FROM products p
      LEFT JOIN users u1 ON p.submitted_by = u1.id
      LEFT JOIN users u2 ON p.approved_by = u2.id
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  },

  getProductsBySubmitter: async (userId) => {
    const result = await pool.query(`
      SELECT p.*, u.email as submitted_by_email 
      FROM products p
      LEFT JOIN users u ON p.submitted_by = u.id
      WHERE p.submitted_by = $1 
      ORDER BY p.created_at DESC
    `, [userId]);
    return result.rows;
  },

  getProductByUniqueId: async (uniqueId) => {
    const result = await pool.query(`
      SELECT p.*, u.email as submitted_by_email 
      FROM products p
      LEFT JOIN users u ON p.submitted_by = u.id
      WHERE p.unique_id = $1
    `, [uniqueId]);
    return result.rows[0] || null;
  },

  getProductById: async (id) => {
    const result = await pool.query(`
      SELECT p.*, u1.email as submitted_by_email, u2.email as approved_by_email 
      FROM products p
      LEFT JOIN users u1 ON p.submitted_by = u1.id
      LEFT JOIN users u2 ON p.approved_by = u2.id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  updateProductStatus: async (id, status, approvedBy, rejectionReason) => {
    const result = await pool.query(
      `UPDATE products 
       SET status = $1, approved_by = $2, rejection_reason = $3, approved_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [status, approvedBy, rejectionReason, id]
    );
    return result.rows[0] || null;
  },

  updateProduct: async (id, updates) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");

    const result = await pool.query(`UPDATE products SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`, [
      ...values,
      id,
    ]);
    return result.rows[0] || null;
  },

  deleteProduct: async (id) => {
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
    return result.rowCount > 0;
  },

  // User operations
  getUserByUsername: async (username) => {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0] || null;
  },

  getUserByEmail: async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
  },

  getUserById: async (id) => {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  createUser: async (userData) => {
    const { username, email, password, role } = userData;
    const result = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
      [username, email, password, role]
    );
    return result.rows[0];
  },

  getAllUsers: async () => {
    const result = await pool.query("SELECT id, username, email, role FROM users ORDER BY username");
    return result.rows;
  },
};

// Generate unique ID for products
function generateUniqueId() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GGS-${year}-${timestamp}-${random}`;
}

// Authentication routes
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Find user in database
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // In a real application, you should use bcrypt to compare hashed passwords
    // For now, we'll do a simple comparison (not secure for production)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Store user in session
    (req.session).user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/user", (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Product routes
app.post("/api/products", upload.single("brochure"), async (req, res) => {
  try {
    if (!req.user || req.user.role !== "operator") {
      return res.status(403).json({ message: "Access denied" });
    }

    const productData = { ...req.body };

    // Auto-generate unique ID if not provided
    if (!productData.uniqueId) {
      productData.uniqueId = generateUniqueId();
    }

    // Handle file upload
    if (req.file) {
      const fileExtension = path.extname(req.file.originalname);
      const newFilename = `${productData.uniqueId}${fileExtension}`;
      const newPath = path.join(uploadDir, newFilename);

      fs.renameSync(req.file.path, newPath);

      productData.brochureUrl = `/api/files/${newFilename}`;
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
app.get("/api/products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { status } = req.query;
    let products;

    if (req.user.role === "admin") {
      if (status && typeof status === "string") {
        products = await storage.getProductsByStatus(status);
      } else {
        products = await storage.getAllProducts();
      }
    } else if (req.user.role === "operator") {
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
    const { submitted_by, approved_by, rejection_reason, ...publicProduct } = product;
    
    res.json(publicProduct);
  } catch (error) {
    console.error("Get public product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update product status (admin only)
app.patch("/api/products/:id/status", async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const product = await storage.updateProductStatus(id, status, req.user.id, rejectionReason);

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
app.patch("/api/products/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

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
app.delete("/api/products/:id", async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

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
app.post("/api/users", async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

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

    // Create user (in production, you should hash the password)
    const user = await storage.createUser({
      username,
      email,
      password, // In production, hash this password
      role: "operator",
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all users (admin only)
app.get("/api/users", async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await storage.getAllUsers();
    res.json(users);
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
    const dbHost = dbUrl.split("@")[1]?.split(":")[0] || "Unknown";

    // Get product counts by status
    const allProducts = await storage.getAllProducts();
    const pendingCount = allProducts.filter((p) => p.status === "pending").length;
    const approvedCount = allProducts.filter((p) => p.status === "approved").length;
    const rejectedCount = allProducts.filter((p) => p.status === "rejected").length;

    // Get sample products
    const sampleProducts = allProducts.slice(0, 3).map((p) => ({
      uniqueId: p.unique_id,
      product: p.product,
      status: p.status,
      submissionDate: p.created_at,
    }));

    res.json({
      environment: process.env.NODE_ENV || "unknown",
      database: {
        isSupabase,
        host: dbHost,
        connected: true,
      },
      productCounts: {
        total: allProducts.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      sampleProducts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Serve uploaded files
app.get("/api/files/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Export the serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Pass the request to Express
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}