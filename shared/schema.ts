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
