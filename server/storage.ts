import { users, products, type User, type InsertUser, type Product, type InsertProduct } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  createProduct(product: InsertProduct): Promise<Product>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductByUniqueId(uniqueId: string): Promise<Product | undefined>;
  getProductsByStatus(status: string): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProductsBySubmitter(submitterId: string): Promise<Product[]>;
  searchProducts(searchTerm: string, status?: string): Promise<Product[]>;
  searchProductsBySubmitter(submitterId: string, searchTerm: string): Promise<Product[]>;
  updateProductStatus(id: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<Product | undefined>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(users.createdAt);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByUniqueId(uniqueId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.uniqueId, uniqueId));
    return product || undefined;
  }

  async getProductsByStatus(status: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.status, status))
      .orderBy(desc(products.submissionDate));
  }

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.submissionDate));
  }

  async getProductsBySubmitter(submitterId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.submittedBy, submitterId))
      .orderBy(desc(products.submissionDate));
  }

  async searchProducts(searchTerm: string, status?: string): Promise<Product[]> {
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
  }

  async searchProductsBySubmitter(submitterId: string, searchTerm: string): Promise<Product[]> {
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

  async updateProductStatus(
    id: string, 
    status: string, 
    approvedBy?: string, 
    rejectionReason?: string
  ): Promise<Product | undefined> {
    const updates: any = { 
      status,
      approvalDate: new Date()
    };
    
    if (approvedBy) {
      updates.approvedBy = approvedBy;
    }
    
    if (rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }

    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    
    return product || undefined;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id));
    
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
