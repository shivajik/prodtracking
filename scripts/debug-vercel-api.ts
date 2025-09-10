import { db } from "../server/db";
import { users, products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function debugVercelAPI() {
  try {
    console.log("🔍 Debugging Vercel API Issue...");
    console.log("🔗 Database URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");

    // Test database connection
    console.log("\n1️⃣ Testing Database Connection...");
    const allProducts = await db.select().from(products);
    console.log(`✅ Connected! Found ${allProducts.length} products`);

    // Test user authentication
    console.log("\n2️⃣ Testing Admin User...");
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));
    
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.email} (ID: ${adminUser.id})`);
    } else {
      console.log("❌ Admin user NOT found!");
    }

    // Simulate API endpoint logic
    console.log("\n3️⃣ Simulating /api/products endpoint...");
    
    // Test getAllProducts (what admin should see)
    console.log("📋 Admin should see ALL products:");
    allProducts.forEach(product => {
      console.log(`  - ${product.uniqueId}: ${product.product} (${product.status})`);
    });

    // Test getProductsByStatus for each status
    console.log("\n📊 Products by status:");
    const pendingProducts = allProducts.filter(p => p.status === "pending");
    const approvedProducts = allProducts.filter(p => p.status === "approved");
    const rejectedProducts = allProducts.filter(p => p.status === "rejected");
    
    console.log(`  - Pending: ${pendingProducts.length}`);
    console.log(`  - Approved: ${approvedProducts.length}`);
    console.log(`  - Rejected: ${rejectedProducts.length}`);

    // Check for data inconsistencies
    console.log("\n4️⃣ Checking for data inconsistencies...");
    const uniqueIds = allProducts.map(p => p.uniqueId);
    const hasTestProduct = uniqueIds.includes("TEST-001");
    const hasGGSProducts = uniqueIds.some(id => id.startsWith("GGS-2024"));
    
    console.log(`  - Has 'TEST-001' product: ${hasTestProduct}`);
    console.log(`  - Has 'GGS-2024' products: ${hasGGSProducts}`);
    
    if (hasTestProduct && hasGGSProducts) {
      console.log("⚠️  WARNING: Database has both test and demo products!");
    } else if (hasTestProduct && !hasGGSProducts) {
      console.log("❌ ISSUE: Database only has test product, missing demo products");
    } else if (!hasTestProduct && hasGGSProducts) {
      console.log("✅ CORRECT: Database has demo products, no test products");
    }

    // Check if there are any null/empty values
    console.log("\n5️⃣ Checking for data quality issues...");
    allProducts.forEach(product => {
      if (!product.product || !product.company || !product.status) {
        console.log(`❌ Product ${product.uniqueId} has missing required fields`);
      }
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error);
    
    // Check if it's a connection issue
    if (error.message?.includes("ENOTFOUND") || error.message?.includes("connect")) {
      console.log("\n🔧 Possible fixes:");
      console.log("1. Check DATABASE_URL environment variable");
      console.log("2. Verify Supabase credentials");
      console.log("3. Check network connectivity");
    }
  }
}

debugVercelAPI().then(() => process.exit(0));