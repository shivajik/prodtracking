import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
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
        if (existingProduct.submittedBy !== req.user.email) {
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

  // Debug endpoint for Vercel authentication testing
  app.get("/api/debug/auth", async (req, res) => {
    try {
      console.log("🔍 Debug auth endpoint called");
      
      const debugInfo = {
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role
        } : null,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        timestamp: new Date().toISOString()
      };

      // Also test direct database access
      const productCount = await storage.getAllProducts();
      debugInfo.directProductCount = productCount.length;

      console.log("🔍 Debug info:", JSON.stringify(debugInfo, null, 2));
      res.json(debugInfo);
    } catch (error) {
      console.error("❌ Debug auth error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
