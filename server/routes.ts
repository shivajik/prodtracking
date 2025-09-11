import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";

// Setup multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload configuration for product brochures
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

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Generate unique ID for products
  function generateUniqueId(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `GGS-${year}-${timestamp}`;
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, search } = req.query;
      let products;

      if (req.user?.role === "admin") {
        if (search && typeof search === "string") {
          // Search across all products for admin
          products = await storage.searchProducts(search, status as string);
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
      let products: any[] = [];

      // Parse CSV files
      if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
        products = await new Promise((resolve, reject) => {
          const results: any[] = [];
          Readable.from(buffer)
            .pipe(csv())
            .on('data', (data: any) => results.push(data))
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
      const errors: string[] = [];

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
          // if (!productData.company || !productData.brand || !productData.product || !productData.description) {
          //   skipped++;
          //   errors.push(`Row ${i + 1}: Missing required fields (company, brand, product, description)`);
          //   continue;
          // }

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
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
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

  const httpServer = createServer(app);
  return httpServer;
}
