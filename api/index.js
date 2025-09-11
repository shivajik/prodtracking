// Vercel serverless function for Green Gold Seeds API - Production Ready
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import multer from "multer";
import { createHash, scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import path from "path";

const scryptAsync = promisify(scrypt);

// Database Schema
const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'operator' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueId: text("unique_id").notNull().unique(),
  company: text("company").notNull(),
  brand: text("brand").notNull(),
  product: text("product").notNull(),
  description: text("description").notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull(),
  netQty: text("net_qty").notNull(),
  lotBatch: text("lot_batch").notNull(),
  mfgDate: text("mfg_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  customerCare: text("customer_care").notNull(),
  email: text("email").notNull(),
  companyAddress: text("company_address").notNull(),
  marketedBy: text("marketed_by").notNull(),
  brochureUrl: text("brochure_url"),
  brochureFilename: text("brochure_filename"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  submissionDate: timestamp("submission_date").defaultNow(),
  approvalDate: timestamp("approval_date"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
});

// Validation Schemas
const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["operator", "admin"]),
});

const insertProductSchema = z.object({
  uniqueId: z.string().optional(),
  company: z.string().min(1),
  brand: z.string().min(1),
  product: z.string().min(1),
  description: z.string().min(1),
  mrp: z.string().min(1),
  netQty: z.string().min(1),
  lotBatch: z.string().min(1),
  mfgDate: z.string().min(1),
  expiryDate: z.string().min(1),
  customerCare: z.string().min(1),
  email: z.string().email(),
  companyAddress: z.string().min(1),
  marketedBy: z.string().min(1),
  brochureUrl: z.string().optional(),
  brochureFilename: z.string().optional(),
  submittedBy: z.string().optional(),
});

// Database connection
let db;
let client;

function getDatabase() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    client = postgres(connectionString, {
      prepare: false,
    });
    db = drizzle(client);
  }
  return db;
}

// Session store setup
const PostgresSessionStore = connectPg(session);
let sessionStore;

function getSessionStore() {
  if (!sessionStore) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    sessionStore = new PostgresSessionStore({
      conString: connectionString,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }
  return sessionStore;
}

// Storage functions
const storage = {
  async getUserByUsername(username) {
    const db = getDatabase();
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  },

  async getUserByEmail(email) {
    const db = getDatabase();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  },

  async getUserById(id) {
    const db = getDatabase();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  },

  async createUser(userData) {
    const db = getDatabase();
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  },

  async getAllUsers() {
    const db = getDatabase();
    return await db.select().from(users);
  },

  async createProduct(productData) {
    const db = getDatabase();
    const result = await db.insert(products).values(productData).returning();
    return result[0];
  },

  async getAllProducts() {
    const db = getDatabase();
    return await db.select().from(products);
  },

  async getProductsByStatus(status) {
    const db = getDatabase();
    return await db.select().from(products).where(eq(products.status, status));
  },

  async getProductsBySubmitter(submitterId) {
    const db = getDatabase();
    // submitterId is already the user's ID, no need to lookup by email
    return await db.select().from(products).where(eq(products.submittedBy, submitterId));
  },

  async getProductByUniqueId(uniqueId) {
    const db = getDatabase();
    const result = await db.select().from(products).where(eq(products.uniqueId, uniqueId)).limit(1);
    return result[0] || null;
  },

  async getProductById(id) {
    const db = getDatabase();
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0] || null;
  },

  async updateProductStatus(id, status, approvedById, rejectionReason = null) {
    const db = getDatabase();
    const updateData = {
      status,
      approvedBy: approvedById,
      approvalDate: new Date(),
    };
    
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const result = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
    return result[0] || null;
  },

  async updateProduct(id, updates) {
    const db = getDatabase();
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0] || null;
  },

  async deleteProduct(id) {
    const db = getDatabase();
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  },

  async searchProducts(searchTerm, status) {
    const db = getDatabase();
    const searchPattern = `%${searchTerm}%`;
    
    const searchConditions = or(
      ilike(products.uniqueId, searchPattern),
      ilike(products.company, searchPattern),
      ilike(products.brand, searchPattern),
      ilike(products.product, searchPattern),
      ilike(products.description, searchPattern),
      ilike(products.lotBatch, searchPattern),
      ilike(products.mfgDate, searchPattern),
      ilike(products.expiryDate, searchPattern),
      ilike(products.customerCare, searchPattern),
      ilike(products.email, searchPattern),
      ilike(products.marketedBy, searchPattern)
    );

    let whereCondition;
    if (status) {
      whereCondition = and(searchConditions, eq(products.status, status));
    } else {
      whereCondition = searchConditions;
    }

    return await db
      .select()
      .from(products)
      .where(whereCondition)
      .orderBy(desc(products.submissionDate));
  },

  async searchProductsBySubmitter(submitterId, searchTerm) {
    const db = getDatabase();
    const searchPattern = `%${searchTerm}%`;
    
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.submittedBy, submitterId),
          or(
            ilike(products.uniqueId, searchPattern),
            ilike(products.company, searchPattern),
            ilike(products.brand, searchPattern),
            ilike(products.product, searchPattern),
            ilike(products.description, searchPattern),
            ilike(products.lotBatch, searchPattern),
            ilike(products.mfgDate, searchPattern),
            ilike(products.expiryDate, searchPattern),
            ilike(products.customerCare, searchPattern),
            ilike(products.email, searchPattern),
            ilike(products.marketedBy, searchPattern)
          )
        )
      )
      .orderBy(desc(products.submissionDate));
  }
};

// Password verification function - matches localhost logic
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64));
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate unique ID for products
function generateUniqueId() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `GGS-${year}-${timestamp}`;
}

// Configure multer for file uploads (memory storage for serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed"));
    }
  }
});

// Upload configuration for CSV/Excel import files
const importUpload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for import files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypePatterns = [
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const mimetype = mimetypePatterns.includes(file.mimetype);
    
    if (extname && (mimetype || file.originalname.toLowerCase().endsWith('.csv'))) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files (.csv, .xlsx, .xls) are allowed for import"));
    }
  }
});

// Create Express app
let app;

async function createApp() {
  if (app) return app;
  
  app = express();
  
  // Configure middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));
  
  // Trust proxy - CRITICAL for production HTTPS cookie handling
  app.set('trust proxy', 1);
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: getSessionStore(),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Initialize Passport - CRITICAL for session persistence
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration - matches localhost logic
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUserById(id);
    done(null, user);
  });

  // Authentication routes - using Passport like localhost
  app.post('/api/login', passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Product routes
  app.post("/api/products", upload.single("brochure"), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "operator") {
        return res.status(403).json({ message: "Access denied" });
      }

      const productData = { ...req.body };
      
      // Auto-generate unique ID if not provided
      if (!productData.uniqueId) {
        productData.uniqueId = generateUniqueId();
      }

      // Handle file upload (for serverless, you might want to store in cloud storage)
      if (req.file) {
        // In production, you should upload to cloud storage (AWS S3, Cloudinary, etc.)
        // For now, we'll store the filename reference
        productData.brochureUrl = `/api/files/${productData.uniqueId}`;
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, search } = req.query;
      let products;

      if (req.user?.role === "admin") {
        if (search && typeof search === "string") {
          // Search across all products for admin
          products = await storage.searchProducts(search, status);
        } else if (status && typeof status === "string") {
          products = await storage.getProductsByStatus(status);
        } else {
          products = await storage.getAllProducts();
        }
      } else if (req.user?.role === "operator") {
        // Operators can only see their own products
        if (search && typeof search === "string") {
          products = await storage.searchProductsBySubmitter(req.user.id, search);
        } else {
          products = await storage.getProductsBySubmitter(req.user.id);
        }
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
  app.patch("/api/products/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
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
  app.patch("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
        if (existingProduct.submittedBy !== req.user.id) {
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
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
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

  // Import products from CSV/Excel file (admin and operator)
  app.post("/api/products/import", importUpload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "operator")) {
        return res.status(403).json({ message: "Access denied. Admin or operator role required for bulk import." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { buffer, mimetype, originalname } = req.file;
      let products = [];

      // Parse CSV files
      if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
        products = await new Promise((resolve, reject) => {
          const results = [];
          Readable.from(buffer)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
        });
      }
      // Parse Excel files
      else if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               mimetype === 'application/vnd.ms-excel' ||
               originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        products = XLSX.utils.sheet_to_json(worksheet);
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload CSV or Excel files." });
      }

      if (products.length === 0) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      // Process and validate products
      let imported = 0;
      let skipped = 0;
      const errors = [];
 
      for (let i = 0; i < products.length; i++) {
        try {
          const row = products[i];
          
          // Map CSV/Excel columns to our schema (handle different possible column names)
          const productData = {
            company: row.company || row.Company || row.COMPANY || "",
            brand: row.brand || row.Brand || row.BRAND || "",
            product: row.product || row.Product || row.PRODUCT || row['Product Name'] || row['Crop Name'] || "",
            description: row.description || row.Description || row.DESCRIPTION || "",
            mrp: row.mrp || row.MRP || row['MRP (₹)'] || row.price || row.Price || "",
            netQty: row.netQty || row['Net Qty'] || row['Net Quantity'] || row.quantity || row.Quantity || "",
            lotBatch: row.lotBatch || row['Lot/Batch'] || row['Lot Batch'] || row.batch || row.Batch || row['New Lot No'] || "",
            mfgDate: row.mfgDate || row['Mfg Date'] || row['Manufacturing Date'] || row['Date of Packing'] || row.mfgDate || "",
            expiryDate: row.expiryDate || row['Expiry Date'] || row['Valid Upto'] || row.expiryDate || "",
            customerCare: row.customerCare || row['Customer Care'] || row.support || row.Support || "",
            email: row.email || row.Email || row.EMAIL || "",
            companyAddress: row.companyAddress || row['Company Address'] || row.address || row.Address || "",
            marketedBy: row.marketedBy || row['Marketed By'] || row.marketer || row.Marketer || "",
            packSize: row.packSize || row['Pack Size'] || row.size || row.Size || "",
            dateOfTest: row.dateOfTest || row['Date of Test'] || row.testDate || row['Test Date'] || "",
            unitSalePrice: row.unitSalePrice || row['Unit Sale Price'] || row.unitPrice || row['Unit Price'] || "",
            noOfPkts: row.noOfPkts || row['No of Pkts'] || row.packets || row.Packets || "",
            totalPkts: row.totalPkts || row['Total Pkts'] || row.totalPackets || row['Total Packets'] || "",
            from: row.from || row.From || row.FROM || "",
            to: row.to || row.To || row.TO || "",
            marketingCode: row.marketingCode || row['Marketing Code'] || row.code || row.Code || "",
            unitOfMeasureCode: row.unitOfMeasureCode || row['Unit of Measure Code'] || row.unit || row.Unit || "",
            marketCode: row.marketCode || row['Market Code'] || row.market || row.Market || "",
            prodCode: row.prodCode || row['Prod. Code'] || row['Prod Code'] || row.productCode || row['Product Code'] || "",
            lotNo: row.lotNo || row['Lot No'] || row.lot || row.Lot || "",
            gb: row.gb || row.GB || row.Gb || "",
            // Always generate unique ID with our own logic, ignore any provided value
            uniqueId: generateUniqueId(),
            submittedBy: req.user.id,
          };

          // Skip rows with missing required fields
          if (!productData.company || !productData.brand || !productData.product || !productData.description) {
            skipped++;
            errors.push(`Row ${i + 1}: Missing required fields (company, brand, product, description)`);
            continue;
          }

          // Validate and create product
          const validatedData = insertProductSchema.parse(productData);
          await storage.createProduct(validatedData);
          imported++;

        } catch (error) {
          skipped++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: "Import completed",
        imported,
        skipped,
        total: products.length,
        errors: errors.slice(0, 10) // Limit errors shown to first 10
      });

    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import products" });
    }
  });

  // Create operator account (admin only)
  app.post("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
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

      // Hash password
      const salt = randomBytes(16).toString("hex");
      const buf = await scryptAsync(password, salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

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
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

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
      const dbHost = dbUrl.split("@")[1]?.split(":")[0] || "Unknown";
      
      // Get product counts by status
      const allProducts = await storage.getAllProducts();
      const pendingCount = allProducts.filter(p => p.status === "pending").length;
      const approvedCount = allProducts.filter(p => p.status === "approved").length;
      const rejectedCount = allProducts.filter(p => p.status === "rejected").length;
      
      // Get sample products
      const sampleProducts = allProducts.slice(0, 3).map(p => ({
        uniqueId: p.uniqueId,
        product: p.product,
        status: p.status,
        submissionDate: p.submissionDate
      }));
      
      res.json({
        environment: process.env.NODE_ENV || "unknown",
        database: {
          isSupabase,
          host: dbHost,
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown"
    });
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