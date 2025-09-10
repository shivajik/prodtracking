import { db } from "../server/db";
import { users, products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function debugVercelIssue() {
  try {
    console.log("🔍 Debugging Vercel data fetching issue...");

    // Check admin user
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (adminUser) {
      console.log(`👑 Admin user found: ${adminUser.id} (${adminUser.email})`);
    }

    // Check products by status with exact counts
    const pendingProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "pending"));

    const approvedProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "approved"));

    const rejectedProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "rejected"));

    console.log(`\n📊 Product Status Breakdown:`);
    console.log(`  - Pending: ${pendingProducts.length}`);
    console.log(`  - Approved: ${approvedProducts.length}`);
    console.log(`  - Rejected: ${rejectedProducts.length}`);

    console.log(`\n📋 Pending Products Details:`);
    if (pendingProducts.length === 0) {
      console.log("  ❌ NO PENDING PRODUCTS FOUND");
      console.log("  🔍 This explains why Vercel shows no products in 'Pending Products' section");
    } else {
      pendingProducts.forEach(product => {
        console.log(`  - ${product.uniqueId}: ${product.product}`);
      });
    }

    console.log(`\n📋 All Products Status:`);
    const allProducts = await db.select().from(products);
    allProducts.forEach(product => {
      console.log(`  - ${product.uniqueId}: ${product.product} (${product.status})`);
    });

  } catch (error) {
    console.error("❌ Error debugging:", error);
  }
}

debugVercelIssue().then(() => process.exit(0));