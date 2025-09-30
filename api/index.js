// Vercel serverless function for Green Gold Seeds API - Production Ready
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { z } from "zod";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import multer from "multer";
import { createHash, scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import path from "path";

// Helper function to convert Excel date number to string
function excelDateToString(value) {
  if (typeof value === 'number' && value > 25567) { // Excel epoch starts at 1900-01-01, Unix epoch equivalent
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch (December 30, 1899)
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return jsDate.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  }
  return value ? String(value) : "";
}

// Helper function to handle decimal values with precision preservation
function parseDecimal(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  
  // Handle numeric values directly to preserve precision
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Handle string values - sanitize formatted numbers
  let stringValue = String(value).trim();
  if (stringValue === "") {
    return null;
  }
  
  // Remove thousands separators (commas) and normalize
  stringValue = stringValue.replace(/,/g, '');
  
  // Convert to number and preserve decimals
  const parsed = parseFloat(stringValue);
  if (isNaN(parsed)) {
    return null;
  }
  
  // Preserve original precision by converting back to string carefully
  return parsed.toString();
}

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
  company: text("company"),
  brand: text("brand"),
  product: text("product"),
  description: text("description"),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  netQty: text("net_qty"),
  lotBatch: text("lot_batch"),
  mfgDate: text("mfg_date"),
  expiryDate: text("expiry_date"),
  customerCare: text("customer_care"),
  email: text("email"),
  companyAddress: text("company_address"),
  marketedBy: text("marketed_by"),
  brochureUrl: text("brochure_url"),
  brochureFilename: text("brochure_filename"),
  packSize: text("pack_size"),
  dateOfTest: text("date_of_test"),
  unitSalePrice: decimal("unit_sale_price", { precision: 10, scale: 2 }),
  noOfPkts: decimal("no_of_pkts", { precision: 10, scale: 2 }),
  totalPkts: decimal("total_pkts", { precision: 10, scale: 2 }),
  from: text("from"),
  to: text("to"),
  marketingCode: text("marketing_code"),
  unitOfMeasureCode: text("unit_of_measure_code"),
  marketCode: text("market_code"),
  prodCode: text("prod_code"),
  lotNo: text("lot_no"),
  gb: decimal("gb", { precision: 10, scale: 2 }),
  // New columns for Excel import
  location: text("location"),
  stageCode: text("stage_code"),
  remainingQuantity: decimal("remaining_quantity", { precision: 15, scale: 2 }),
  stackNo: text("stack_no"),
  normalGermination: decimal("normal_germination", { precision: 5, scale: 2 }),
  gerAve: decimal("ger_ave", { precision: 15, scale: 2 }),
  gotPercent: decimal("got_percent", { precision: 15, scale: 8 }),
  gotAve: decimal("got_ave", { precision: 15, scale: 4 }),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  submissionDate: timestamp("submission_date").defaultNow(),
  approvalDate: timestamp("approval_date"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
});

const crops = pgTable("crops", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

const varieties = pgTable("varieties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  cropId: uuid("crop_id").notNull().references(() => crops.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Crop-variety URLs table for predefined brochure URLs
const cropVarietyUrls = pgTable("crop_variety_urls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cropId: uuid("crop_id").notNull().references(() => crops.id, { onDelete: 'cascade' }),
  varietyId: uuid("variety_id").notNull().references(() => varieties.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure only one URL per crop-variety combination
  cropVarietyUnique: unique().on(table.cropId, table.varietyId),
}));

// Validation Schemas
const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["operator", "admin"]),
});

const insertProductSchema = z.object({
  uniqueId: z.string().optional(),
  company: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  mrp: z.string().nullable().optional(),
  netQty: z.string().nullable().optional(),
  lotBatch: z.string().nullable().optional(),
  mfgDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  customerCare: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  companyAddress: z.string().nullable().optional(),
  marketedBy: z.string().nullable().optional(),
  packSize: z.string().nullable().optional(),
  dateOfTest: z.string().nullable().optional(),
  unitSalePrice: z.string().nullable().optional(),
  noOfPkts: z.string().nullable().optional(),
  totalPkts: z.string().nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  marketingCode: z.string().nullable().optional(),
  unitOfMeasureCode: z.string().nullable().optional(),
  marketCode: z.string().nullable().optional(),
  prodCode: z.string().nullable().optional(),
  lotNo: z.string().nullable().optional(),
  gb: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  stageCode: z.string().nullable().optional(),
  remainingQuantity: z.string().nullable().optional(),
  stackNo: z.string().nullable().optional(),
  normalGermination: z.string().nullable().optional(),
  gerAve: z.string().nullable().optional(),
  gotPercent: z.string().nullable().optional(),
  gotAve: z.string().nullable().optional(),
  brochureUrl: z.string().optional(),
  brochureFilename: z.string().optional(),
  submittedBy: z.string().optional(),
});

// Crop and variety validation schemas
const insertCropSchema = z.object({
  name: z.string().min(1, "Crop name is required"),
});

const insertVarietySchema = z.object({
  code: z.string().min(1, "Variety code is required"),
  cropId: z.string().uuid("Valid crop ID is required"),
});

const insertCropVarietyUrlSchema = z.object({
  cropId: z.string().uuid("Valid crop ID is required"),
  varietyId: z.string().uuid("Valid variety ID is required"),
  url: z.string().url("Valid URL is required"),
  description: z.string().optional(),
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
      ilike(products.lotNo, searchPattern),
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
            ilike(products.lotNo, searchPattern),
            ilike(products.mfgDate, searchPattern),
            ilike(products.expiryDate, searchPattern),
            ilike(products.customerCare, searchPattern),
            ilike(products.email, searchPattern),
            ilike(products.marketedBy, searchPattern)
          )
        )
      )
      .orderBy(desc(products.submissionDate));
  },

  async getAllCropsWithVarieties() {
    const db = getDatabase();
    const result = await db
      .select({
        crop: crops,
        variety: varieties,
      })
      .from(crops)
      .leftJoin(varieties, eq(varieties.cropId, crops.id))
      .orderBy(crops.name, varieties.code);

    const cropsMap = new Map();
    
    for (const row of result) {
      if (!cropsMap.has(row.crop.id)) {
        cropsMap.set(row.crop.id, {
          ...row.crop,
          varieties: []
        });
      }
      
      if (row.variety) {
        cropsMap.get(row.crop.id).varieties.push(row.variety);
      }
    }
    
    return Array.from(cropsMap.values());
  },

  async createCrop(crop) {
    const db = getDatabase();
    const [newCrop] = await db
      .insert(crops)
      .values(crop)
      .returning();
    return newCrop;
  },

  async deleteCrop(id) {
    try {
      const db = getDatabase();
      const result = await db.delete(crops).where(eq(crops.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting crop:', error);
      return false;
    }
  },

  async createVariety(variety) {
    const db = getDatabase();
    const [newVariety] = await db
      .insert(varieties)
      .values(variety)
      .returning();
    return newVariety;
  },

  async deleteVariety(id) {
    try {
      const db = getDatabase();
      const result = await db.delete(varieties).where(eq(varieties.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting variety:', error);
      return false;
    }
  },

  // Crop-variety URL management functions
  async getAllCropVarietyUrls() {
    const db = getDatabase();
    return await db.select().from(cropVarietyUrls).orderBy(cropVarietyUrls.createdAt);
  },

  async getCropVarietyUrlByCropAndVarietyNames(cropName, varietyCode) {
    const db = getDatabase();
    
    // First find the crop by name
    const crop = await db.select().from(crops).where(eq(crops.name, cropName)).limit(1);
    if (!crop.length) return null;
    
    // Then find the variety by code and crop ID
    const variety = await db.select().from(varieties)
      .where(and(eq(varieties.code, varietyCode), eq(varieties.cropId, crop[0].id)))
      .limit(1);
    if (!variety.length) return null;
    
    // Finally find the URL for this crop-variety combination
    const result = await db.select().from(cropVarietyUrls)
      .where(and(eq(cropVarietyUrls.cropId, crop[0].id), eq(cropVarietyUrls.varietyId, variety[0].id)))
      .limit(1);
    
    return result.length ? result[0] : null;
  },

  async createCropVarietyUrl(urlData) {
    const db = getDatabase();
    const [newUrl] = await db
      .insert(cropVarietyUrls)
      .values({
        ...urlData,
        updatedAt: new Date(),
      })
      .returning();
    return newUrl;
  },

  async updateCropVarietyUrl(id, updates) {
    const db = getDatabase();
    const [updatedUrl] = await db
      .update(cropVarietyUrls)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(cropVarietyUrls.id, id))
      .returning();
    return updatedUrl;
  },

  async deleteCropVarietyUrl(id) {
    try {
      const db = getDatabase();
      const result = await db.delete(cropVarietyUrls).where(eq(cropVarietyUrls.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting crop-variety URL:', error);
      return false;
    }
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

    function normalizeProductData(data) {
      const numericFields = [
    "mrp",
    "unitSalePrice",
    "noOfPkts",
    "totalPkts",
    "gb",
    "remainingQuantity",
    "normalGermination",
    "gerAve",
    "gotPercent",
    "gotAve",
      ];
    
      for (const field of numericFields) {
        if (data[field] === "" || data[field] === undefined) {
          data[field] = null;
        } else if (!isNaN(data[field])) {
          // Convert numeric-looking strings to actual numbers
          data[field] = Number(data[field]);
        }
      }
    
      return data;
    }

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
      const normalizedData = normalizeProductData(productData);

      // Validate product data
      const validatedData = insertProductSchema.parse({
        ...normalizedData,
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

      console.log("🔍 Starting Excel Import Process (Production)");
      console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes, MimeType: ${req.file.mimetype}`);

      const { buffer, mimetype, originalname } = req.file;
      let products = [];
      let headers = [];

      // Parse CSV files
      if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
        console.log("📊 Processing CSV file...");
        products = await new Promise((resolve, reject) => {
          const results = [];
          Readable.from(buffer)
            .pipe(csv())
            .on('data', (data) => {
              if (results.length === 0) {
                headers = Object.keys(data);
                console.log("📋 CSV Headers found:", headers);
              }
              results.push(data);
            })
            .on('end', () => resolve(results))
            .on('error', reject);
        });
      }
      // Parse Excel files with enhanced options
      else if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               mimetype === 'application/vnd.ms-excel' ||
               originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
        
        console.log("📊 Processing Excel file...");
        
        // Read workbook with enhanced options to preserve decimal precision
        const workbook = XLSX.read(buffer, { 
          type: 'buffer',
          cellDates: true,      // Convert dates to JS Date objects
          cellNF: false,        // Don't format numbers
          cellText: false,      // Don't convert to text
          raw: false,           // Use formatted values to avoid type issues
          dateNF: 'yyyy-mm-dd'  // Standard date format
        });
        
        console.log("📚 Available sheets:", workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        console.log("📋 Processing sheet:", sheetName);
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        console.log(`📏 Sheet range: ${range.s.r + 1}:${range.e.r + 1} rows, ${range.s.c + 1}:${range.e.c + 1} columns`);
        
        // Extract headers from first row
        headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            headers.push(String(cell.v).trim());
          } else {
            headers.push(`Column_${col + 1}`);
          }
        }
        
        console.log("📋 Excel Headers extracted:", headers);
        console.log("📋 Number of headers:", headers.length);
        
        // Convert to JSON with proper options to preserve decimal precision
        products = XLSX.utils.sheet_to_json(worksheet, {
          header: headers,
          range: 1, // Skip first row (headers)
          defval: "", // Default value for empty cells
          raw: false, // Use formatted values to avoid type issues
          dateNF: 'yyyy-mm-dd'
        });
        
        console.log(`📈 Total rows extracted: ${products.length}`);
        
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload CSV or Excel files." });
      }

      if (products.length === 0) {
        console.log("❌ No data found in the file");
        return res.status(400).json({ message: "No data found in the file" });
      }

      console.log("✅ File parsing completed successfully");
      console.log(`🔢 Total rows to process: ${products.length}`);
      
      // Log first few rows for debugging
      console.log("🔍 Sample data from first 3 rows:");
      for (let i = 0; i < Math.min(3, products.length); i++) {
        console.log(`📝 Row ${i + 1} data:`, JSON.stringify(products[i], null, 2));
      }

      // Process and validate products
      let imported = 0;
      let skipped = 0;
      const errors = [];
 
      for (let i = 0; i < products.length; i++) {
        try {
          const row = products[i];
          console.log(`\n🔄 Processing row ${i + 1}:`);
          console.log(`📄 Raw row data:`, JSON.stringify(row, null, 2));
          
          // Skip empty rows - check if essential fields are missing
          // const hasEssentialData = row['Crop Name'] || row['Location'] || row['Lot No.'] || row['Production Code FF'];
          // if (!hasEssentialData) {
          //   console.log(`⚠️  Row ${i + 1}: Skipping empty row - no essential data found`);
          //   skipped++;
          //   continue;
          // }

          // Enhanced column mapping with exact matches from your Excel structure
          console.log("🗂️ Mapping Excel columns to schema fields...");
          
          const productData = {
            // Core product info - NO FALLBACKS
            company: row.company || row.Company || row.COMPANY || null,
            brand: row.brand || row.Brand || row.BRAND || null,
            product: row['Crop Name'] || row.product || row.Product || row.PRODUCT || row['Product Name'] || row['CROP NAME'] || null,
            description: row.description || row.Description || row.DESCRIPTION || null,
            
            // Pricing info - NO FALLBACKS  
            mrp: parseDecimal(row.mrp || row.MRP || row['MRP (₹)'] || row.price || row.Price),
            unitSalePrice: parseDecimal(row.unitSalePrice || row['Unit Sale Price'] || row['Unit Sale Prize'] || row.unitPrice || row['Unit Price']),
            
            // Quantity and packaging - NO FALLBACKS
            netQty: row.netQty || row['Net Qty'] || row['Net Quantity'] || row.quantity || row.Quantity || row['Qty(kg)'] || null,
            packSize: row.packSize || row['Pack Size'] || row.size || row.Size || null,
            noOfPkts: parseDecimal(row['No. of Bags'] || row.noOfPkts || row['No Of Pkts'] || row['No of Pkts'] || row.packets || row.Packets),
            totalPkts: parseDecimal(row.totalPkts || row['Total Pkts'] || row.totalPackets || row['Total Packets'] || row['Total Pkg']),
            
            // Batch and lot info - NO FALLBACKS
            lotBatch: row.lotBatch || row['Lot/Batch'] || row['Lot Batch'] || row.batch || row.Batch || row['New Lot No'] || null,
            lotNo: row['Lot No.'] || row.lotNo || row['Lot No'] || row.lot || row.Lot || null,
            gb: parseDecimal(row.gb || row.GB || row.Gb),
            
            // Dates - NO FALLBACKS
            mfgDate: excelDateToString(row.mfgDate || row['Mfg Date'] || row['Manufacturing Date'] || row['Date of Packing'] || row['Date Of Packing']),
            expiryDate: excelDateToString(row.expiryDate || row['Expiry Date'] || row['Valid Up To'] || row['Valid Upto']),
            dateOfTest: excelDateToString(row['Date of Test'] || row.dateOfTest || row['Date Of Test'] || row.testDate || row['Test Date']),
            
            // Contact and company info - NO FALLBACKS
            customerCare: row.customerCare || row['Customer Care'] || row.support || row.Support || null,
            email: row.email || row.Email || row.EMAIL || null,
            companyAddress: row.companyAddress || row['Company Address'] || row.address || row.Address || null,
            marketedBy: row.marketedBy || row['Marketed By'] || row.marketer || row.Marketer || null,
            
            // Range and location - NO FALLBACKS
            from: row.from || row.From || row.FROM || row['From'] || null,
            to: row.to || row.To || row.TO || row['To'] || null,
            
            // Codes - CONSOLIDATED MAPPING (Marketing Code and Market Code treated as same)
            marketingCode: row['Market Code FF'] || row.marketingCode || row['Marketing Code'] || row.code || row.Code || null,
            unitOfMeasureCode: row.unitOfMeasureCode || row['Unit of Measure Code'] || row.unit || row.Unit || null,
            marketCode: row.marketCode || row['Market Code'] || row.market || row.Market || row['Market Code FF'] || row.marketingCode || row['Marketing Code'] || row.code || row.Code || null,
            prodCode: row['Production Code FF'] || row.prodCode || row['Prod. Co*'] || row['Prod. Code'] || row['Prod Code'] || row.productCode || row['Product Code'] || null,
            
            // NEW COLUMNS FROM EXCEL
            location: row['Location'] || row.location || null,
            stageCode: row['Stage Code'] || row.stageCode || null,
            remainingQuantity: parseDecimal(row['Remaining Quantity'] || row.remainingQuantity),
            stackNo: row['STACK NO'] || row.stackNo || null,
            normalGermination: parseDecimal(row['Normal Germination %'] || row.normalGermination),
            gerAve: parseDecimal(row['GER AVE'] || row.gerAve),
            gotPercent: parseDecimal(row['GOT %'] || row.gotPercent),
            gotAve: parseDecimal(row['GOT AVE'] || row.gotAve),
            
            // Generate unique ID
            uniqueId: generateUniqueId(),
            submittedBy: req.user.id,
          };

          console.log("✨ Mapped product data:");
          console.log(`   Company: "${productData.company}"`);
          console.log(`   Brand: "${productData.brand}"`);
          console.log(`   Product: "${productData.product}"`);
          console.log(`   Description: "${productData.description}"`);
          console.log(`   Location: "${productData.location}"`);
          console.log(`   Stage Code: "${productData.stageCode}"`);
          console.log(`   Remaining Quantity: "${productData.remainingQuantity}"`);
          console.log(`   Stack No: "${productData.stackNo}"`);
          console.log(`   Normal Germination %: "${productData.normalGermination}"`);
          console.log(`   Unique ID: "${productData.uniqueId}"`);

          // Basic validation - NO FALLBACKS ALLOWED
          if (!productData.product) {
            console.log(`❌ Row ${i + 1}: Missing product name, skipping row`);
            skipped++;
            errors.push(`Row ${i + 1}: Missing product name (Crop Name)`);
            continue;
          }

          console.log(`🔍 Validating row ${i + 1} against schema...`);
          
          // Validate and create product
          const validatedData = insertProductSchema.parse(productData);
          console.log(`✅ Row ${i + 1}: Schema validation passed`);
          
          await storage.createProduct(validatedData);
          console.log(`✅ Row ${i + 1}: Product created successfully`);
          
          imported++;

        } catch (error) {
          console.log(`❌ Row ${i + 1}: Error occurred -`, error instanceof Error ? error.message : 'Unknown error');
          skipped++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log("\n📊 Import Summary:");
      console.log(`✅ Successfully imported: ${imported} products`);
      console.log(`⚠️  Skipped: ${skipped} products`);
      console.log(`📝 Total processed: ${products.length} rows`);
      console.log("🔚 Import process completed");

      res.json({
        message: "Import completed",
        imported,
        skipped,
        total: products.length,
        errors: errors.slice(0, 10) // Limit errors shown to first 10
      });

    } catch (error) {
      console.error("❌ Import error:", error);
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

  // Get all crops with their varieties
  app.get("/api/crops", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const crops = await storage.getAllCropsWithVarieties();
      res.json(crops);
    } catch (error) {
      console.error("Get crops error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new crop (admin only)
  app.post("/api/crops", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ message: "Crop name is required" });
      }

      const crop = await storage.createCrop({ name: name.trim() });
      res.status(201).json(crop);
    } catch (error) {
      console.error("Create crop error:", error);
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(400).json({ message: "Crop name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete crop (admin only)
  app.delete("/api/crops/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { id } = req.params;
      const success = await storage.deleteCrop(id);

      if (!success) {
        return res.status(404).json({ message: "Crop not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete crop error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new variety (admin only)
  app.post("/api/varieties", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { code, cropId } = req.body;
      if (!code || typeof code !== "string" || code.trim() === "") {
        return res.status(400).json({ message: "Variety code is required" });
      }
      if (!cropId || typeof cropId !== "string") {
        return res.status(400).json({ message: "Crop ID is required" });
      }

      const variety = await storage.createVariety({ 
        code: code.trim(), 
        cropId 
      });
      res.status(201).json(variety);
    } catch (error) {
      console.error("Create variety error:", error);
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(400).json({ message: "Variety code already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete variety (admin only)
  app.delete("/api/varieties/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { id } = req.params;
      const success = await storage.deleteVariety(id);

      if (!success) {
        return res.status(404).json({ message: "Variety not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete variety error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Extract crops and varieties from existing products (admin only)
  app.get("/api/products/extract-crops-varieties", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const allProducts = await storage.getAllProducts();
      
      // Extract unique crops and their varieties
      const cropVarietyMap = new Map();
      
      allProducts.forEach(product => {
        const cropName = product.product?.trim();
        const varietyCode = product.marketCode?.trim();
        
        if (cropName) {
          if (!cropVarietyMap.has(cropName)) {
            cropVarietyMap.set(cropName, new Set());
          }
          
          if (varietyCode) {
            cropVarietyMap.get(cropName).add(varietyCode);
          }
        }
      });

      // Convert to array format
      const extractedData = Array.from(cropVarietyMap.entries()).map(([cropName, varietiesSet]) => ({
        cropName,
        varieties: Array.from(varietiesSet).sort()
      }));

      res.json({
        totalProducts: allProducts.length,
        extractedCrops: extractedData.length,
        cropsWithVarieties: extractedData
      });
    } catch (error) {
      console.error("Extract crops/varieties error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed crops and varieties from existing product data (admin only)
  app.post("/api/products/seed-crops-varieties", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const allProducts = await storage.getAllProducts();
      
      // Extract unique crops and their varieties
      const cropVarietyMap = new Map();
      
      allProducts.forEach(product => {
        const cropName = product.product?.trim();
        const varietyCode = product.marketCode?.trim();
        
        if (cropName) {
          if (!cropVarietyMap.has(cropName)) {
            cropVarietyMap.set(cropName, new Set());
          }
          
          if (varietyCode) {
            cropVarietyMap.get(cropName).add(varietyCode);
          }
        }
      });

      let createdCrops = 0;
      let createdVarieties = 0;
      let skippedCrops = 0;
      let skippedVarieties = 0;

      // Create crops and varieties
      for (const [cropName, varietiesSet] of Array.from(cropVarietyMap)) {
        try {
          // Try to create crop
          const crop = await storage.createCrop({ name: cropName });
          createdCrops++;
          
          // Create varieties for this crop
          for (const varietyCode of varietiesSet) {
            try {
              await storage.createVariety({ 
                code: varietyCode, 
                cropId: crop.id 
              });
              createdVarieties++;
            } catch (error) {
              // Skip if variety already exists
              skippedVarieties++;
            }
          }
        } catch (error) {
          // Skip if crop already exists
          skippedCrops++;
          
          // Try to get existing crop and create missing varieties
          try {
            const existingCrops = await storage.getAllCropsWithVarieties();
            const existingCrop = existingCrops.find(c => c.name === cropName);
            
            if (existingCrop) {
              const existingVarietyCodes = existingCrop.varieties.map(v => v.code);
              
              for (const varietyCode of varietiesSet) {
                if (!existingVarietyCodes.includes(varietyCode)) {
                  try {
                    await storage.createVariety({ 
                      code: varietyCode, 
                      cropId: existingCrop.id 
                    });
                    createdVarieties++;
                  } catch (error) {
                    skippedVarieties++;
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error processing existing crop:", error);
          }
        }
      }

      res.json({
        success: true,
        totalProducts: allProducts.length,
        results: {
          createdCrops,
          skippedCrops,
          createdVarieties,
          skippedVarieties
        }
      });
    } catch (error) {
      console.error("Seed crops/varieties error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Crop-variety URL management endpoints

  // Get all crop-variety URLs (admin only)
  app.get("/api/crop-variety-urls", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const cropVarietyUrls = await storage.getAllCropVarietyUrls();
      res.json(cropVarietyUrls);
    } catch (error) {
      console.error("Get crop-variety URLs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get crop-variety URL by crop name and variety code (for operators)
  app.get("/api/crop-variety-urls/by-names/:cropName/:varietyCode", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { cropName, varietyCode } = req.params;
      const cropVarietyUrl = await storage.getCropVarietyUrlByCropAndVarietyNames(cropName, varietyCode);
      
      if (!cropVarietyUrl) {
        return res.status(404).json({ message: "No URL found for this crop-variety combination" });
      }

      res.json(cropVarietyUrl);
    } catch (error) {
      console.error("Get crop-variety URL by names error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new crop-variety URL (admin only)
  app.post("/api/crop-variety-urls", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { cropId, varietyId, url, description } = req.body;
      
      if (!cropId || typeof cropId !== "string") {
        return res.status(400).json({ message: "Crop ID is required" });
      }
      
      if (!varietyId || typeof varietyId !== "string") {
        return res.status(400).json({ message: "Variety ID is required" });
      }
      
      if (!url || typeof url !== "string" || url.trim() === "") {
        return res.status(400).json({ message: "URL is required" });
      }

      // Validate the data with Zod schema
      const validatedData = insertCropVarietyUrlSchema.parse({
        cropId,
        varietyId,
        url: url.trim(),
        description: description ? description.trim() : undefined,
      });

      const cropVarietyUrl = await storage.createCropVarietyUrl(validatedData);
      res.status(201).json(cropVarietyUrl);
    } catch (error) {
      console.error("Create crop-variety URL error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      // Handle unique constraint violation
      if (error.message && error.message.includes('duplicate key value') || error.code === '23505') {
        return res.status(409).json({ message: "A URL already exists for this crop-variety combination. Please update the existing URL instead." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update crop-variety URL (admin only)
  app.put("/api/crop-variety-urls/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { id } = req.params;
      const { url, description } = req.body;

      if (!url || typeof url !== "string" || url.trim() === "") {
        return res.status(400).json({ message: "URL is required" });
      }

      // Validate the URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const updates = {
        url: url.trim(),
        description: description ? description.trim() : null,
      };

      const updatedUrl = await storage.updateCropVarietyUrl(id, updates);
      
      if (!updatedUrl) {
        return res.status(404).json({ message: "Crop-variety URL not found" });
      }

      res.json(updatedUrl);
    } catch (error) {
      console.error("Update crop-variety URL error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete crop-variety URL (admin only)
  app.delete("/api/crop-variety-urls/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { id } = req.params;
      const success = await storage.deleteCropVarietyUrl(id);

      if (!success) {
        return res.status(404).json({ message: "Crop-variety URL not found" });
      }

      res.json({ message: "Crop-variety URL deleted successfully" });
    } catch (error) {
      console.error("Delete crop-variety URL error:", error);
      res.status(500).json({ message: "Internal server error" });
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