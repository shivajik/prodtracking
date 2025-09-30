import { users, products, crops, varieties, cropVarietyUrls, type User, type InsertUser, type Product, type InsertProduct, type Crop, type InsertCrop, type Variety, type InsertVariety, type CropVarietyUrl, type InsertCropVarietyUrl } from "@shared/schema";
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
  
  // Crop and variety management
  getAllCropsWithVarieties(): Promise<(Crop & { varieties: Variety[] })[]>;
  createCrop(crop: InsertCrop): Promise<Crop>;
  deleteCrop(id: string): Promise<boolean>;
  createVariety(variety: InsertVariety): Promise<Variety>;
  deleteVariety(id: string): Promise<boolean>;
  
  // Crop-variety URL management
  getCropVarietyUrl(cropId: string, varietyId: string): Promise<CropVarietyUrl | undefined>;
  getAllCropVarietyUrls(): Promise<CropVarietyUrl[]>;
  createCropVarietyUrl(cropVarietyUrl: InsertCropVarietyUrl): Promise<CropVarietyUrl>;
  updateCropVarietyUrl(id: string, updates: Partial<CropVarietyUrl>): Promise<CropVarietyUrl | undefined>;
  deleteCropVarietyUrl(id: string): Promise<boolean>;
  getCropVarietyUrlByCropAndVarietyNames(cropName: string, varietyCode: string): Promise<CropVarietyUrl | undefined>;
  
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

  // Crop and variety management implementations
  async getAllCropsWithVarieties(): Promise<(Crop & { varieties: Variety[] })[]> {
    const result = await db
      .select({
        crop: crops,
        variety: varieties,
      })
      .from(crops)
      .leftJoin(varieties, eq(varieties.cropId, crops.id))
      .orderBy(crops.name, varieties.code);

    const cropsMap = new Map<string, Crop & { varieties: Variety[] }>();
    
    for (const row of result) {
      if (!cropsMap.has(row.crop.id)) {
        cropsMap.set(row.crop.id, {
          ...row.crop,
          varieties: []
        });
      }
      
      if (row.variety) {
        cropsMap.get(row.crop.id)!.varieties.push(row.variety);
      }
    }
    
    return Array.from(cropsMap.values());
  }

  async createCrop(crop: InsertCrop): Promise<Crop> {
    const [newCrop] = await db
      .insert(crops)
      .values(crop)
      .returning();
    return newCrop;
  }

  async deleteCrop(id: string): Promise<boolean> {
    try {
      const result = await db.delete(crops).where(eq(crops.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting crop:', error);
      return false;
    }
  }

  async createVariety(variety: InsertVariety): Promise<Variety> {
    const [newVariety] = await db
      .insert(varieties)
      .values(variety)
      .returning();
    return newVariety;
  }

  async deleteVariety(id: string): Promise<boolean> {
    try {
      const result = await db.delete(varieties).where(eq(varieties.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting variety:', error);
      return false;
    }
  }

  // Crop-variety URL management methods
  async getCropVarietyUrl(cropId: string, varietyId: string): Promise<CropVarietyUrl | undefined> {
    const [cropVarietyUrl] = await db
      .select()
      .from(cropVarietyUrls)
      .where(and(eq(cropVarietyUrls.cropId, cropId), eq(cropVarietyUrls.varietyId, varietyId)));
    return cropVarietyUrl || undefined;
  }

  async getAllCropVarietyUrls(): Promise<CropVarietyUrl[]> {
    return await db.select().from(cropVarietyUrls);
  }

  async createCropVarietyUrl(cropVarietyUrl: InsertCropVarietyUrl): Promise<CropVarietyUrl> {
    const [newCropVarietyUrl] = await db
      .insert(cropVarietyUrls)
      .values(cropVarietyUrl)
      .returning();
    return newCropVarietyUrl;
  }

  async updateCropVarietyUrl(id: string, updates: Partial<CropVarietyUrl>): Promise<CropVarietyUrl | undefined> {
    const [updated] = await db
      .update(cropVarietyUrls)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cropVarietyUrls.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCropVarietyUrl(id: string): Promise<boolean> {
    try {
      const result = await db.delete(cropVarietyUrls).where(eq(cropVarietyUrls.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting crop-variety URL:', error);
      return false;
    }
  }

  async getCropVarietyUrlByCropAndVarietyNames(cropName: string, varietyCode: string): Promise<CropVarietyUrl | undefined> {
    const [result] = await db
      .select({
        id: cropVarietyUrls.id,
        cropId: cropVarietyUrls.cropId,
        varietyId: cropVarietyUrls.varietyId,
        url: cropVarietyUrls.url,
        description: cropVarietyUrls.description,
        createdAt: cropVarietyUrls.createdAt,
        updatedAt: cropVarietyUrls.updatedAt,
      })
      .from(cropVarietyUrls)
      .innerJoin(crops, eq(cropVarietyUrls.cropId, crops.id))
      .innerJoin(varieties, eq(cropVarietyUrls.varietyId, varieties.id))
      .where(and(eq(crops.name, cropName), eq(varieties.code, varietyCode)));
    return result || undefined;
  }
}

export const storage = new DatabaseStorage();
