import { db } from "../server/db";
import { users, products } from "../shared/schema";

async function checkProductionData() {
  try {
    console.log("🔍 Checking production database data...");

    // Check users
    const allUsers = await db.select().from(users);
    console.log(`👥 Total users: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });

    // Check products
    const allProducts = await db.select().from(products);
    console.log(`\n📦 Total products: ${allProducts.length}`);
    
    const statusCounts = allProducts.reduce((acc, product) => {
      acc[product.status] = (acc[product.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("📊 Products by status:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    console.log("\n📋 Product details:");
    allProducts.forEach(product => {
      console.log(`  - ${product.uniqueId}: ${product.product} (${product.status})`);
    });

  } catch (error) {
    console.error("❌ Error checking production data:", error);
  }
}

checkProductionData().then(() => process.exit(0));