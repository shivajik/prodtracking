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
  noOfPkts: decimal("no_of_pkts", { precision: 10, scale: 0 }),
  totalPkts: decimal("total_pkts", { precision: 10, scale: 0 }),
  from: text("from"),
  to: text("to"),
  marketingCode: text("marketing_code"),
  unitOfMeasureCode: text("unit_of_measure_code"),
  marketCode: text("market_code"),
  prodCode: text("prod_code"),
  lotNo: text("lot_no"),
  gb: decimal("gb", { precision: 10, scale: 2 }),
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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
