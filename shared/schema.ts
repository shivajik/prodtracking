import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'operator' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
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
  labelNumber: text("label_number"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  submissionDate: timestamp("submission_date").defaultNow(),
  approvalDate: timestamp("approval_date"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
});

export const productsRelations = relations(products, ({ one }) => ({
  submittedByUser: one(users, {
    fields: [products.submittedBy],
    references: [users.id],
    relationName: "submittedProducts",
  }),
  approvedByUser: one(users, {
    fields: [products.approvedBy],
    references: [users.id],
    relationName: "approvedProducts",
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  submittedProducts: many(products, { relationName: "submittedProducts" }),
  approvedProducts: many(products, { relationName: "approvedProducts" }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  submissionDate: true,
  approvalDate: true,
  submittedBy: true,
  approvedBy: true,
  status: true,
}).extend({
  submittedBy: z.string().optional(),
  company: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  marketingCode: z.string().nullable().optional(),
  unitOfMeasureCode: z.string().nullable().optional(),
  marketCode: z.string().nullable().optional(),
  prodCode: z.string().nullable().optional(),
  lotNo: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  stageCode: z.string().nullable().optional(),
  stackNo: z.string().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
