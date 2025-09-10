import { db } from "../server/db";
import { users, products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function vercelDiagnostic() {
  try {
    console.log("🔍 Vercel Deployment Diagnostic");
    console.log("================================");
    
    // Environment check
    console.log("\n📋 Environment Variables:");
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      console.log(`Database Host: ${dbUrl.includes('supabase.com') ? 'Supabase' : 'Other'}`);
      console.log(`Connection Type: ${dbUrl.includes('pooler') ? 'Pooler' : 'Direct'}`);
    }

    // Database connectivity test
    console.log("\n🔗 Database Connection Test:");
    const start = Date.now();
    const allProducts = await db.select().from(products);
    const connectionTime = Date.now() - start;
    console.log(`✅ Connected in ${connectionTime}ms`);
    console.log(`📦 Total products found: ${allProducts.length}`);

    // User authentication test
    console.log("\n👤 User Authentication Test:");
    const allUsers = await db.select().from(users);
    console.log(`👥 Total users: ${allUsers.length}`);
    
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.role}): ${user.email}`);
    });

    // API simulation test
    console.log("\n🔍 API Endpoint Simulation:");
    
    // Simulate admin login
    const [adminUser] = allUsers.filter(u => u.role === 'admin');
    if (adminUser) {
      console.log(`✅ Admin user available: ${adminUser.username}`);
      
      // Simulate different API calls
      console.log("\n📡 Simulating API calls:");
      
      // 1. Get all products (admin view)
      console.log("1. GET /api/products (admin, no filter):");
      console.log(`   Expected: ${allProducts.length} products`);
      
      // 2. Get products by status
      const pendingProducts = allProducts.filter(p => p.status === 'pending');
      const approvedProducts = allProducts.filter(p => p.status === 'approved');
      const rejectedProducts = allProducts.filter(p => p.status === 'rejected');
      
      console.log("2. GET /api/products?status=pending:");
      console.log(`   Expected: ${pendingProducts.length} products`);
      
      console.log("3. GET /api/products?status=approved:");
      console.log(`   Expected: ${approvedProducts.length} products`);
      
      console.log("4. GET /api/products?status=rejected:");
      console.log(`   Expected: ${rejectedProducts.length} products`);
      
    } else {
      console.log("❌ No admin user found!");
    }

    // Data integrity check
    console.log("\n🧪 Data Integrity Check:");
    allProducts.forEach((product, index) => {
      const missing = [];
      if (!product.uniqueId) missing.push('uniqueId');
      if (!product.product) missing.push('product');
      if (!product.company) missing.push('company');
      if (!product.status) missing.push('status');
      
      if (missing.length > 0) {
        console.log(`❌ Product ${index + 1} missing: ${missing.join(', ')}`);
      }
    });
    
    if (allProducts.every(p => p.uniqueId && p.product && p.company && p.status)) {
      console.log("✅ All products have required fields");
    }

    // Summary
    console.log("\n📊 Summary:");
    console.log(`Database: ${process.env.DATABASE_URL?.includes('supabase') ? 'Supabase' : 'Unknown'}`);
    console.log(`Products: ${allProducts.length} total`);
    console.log(`Users: ${allUsers.length} total`);
    console.log(`Admin available: ${allUsers.some(u => u.role === 'admin') ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
    
    if (error.message?.includes('connect') || error.message?.includes('ENOTFOUND')) {
      console.log("\n🔧 Database connection issue detected!");
      console.log("Possible causes:");
      console.log("1. DATABASE_URL environment variable not properly set");
      console.log("2. Network connectivity issue");
      console.log("3. Database credentials incorrect");
    }
  }
}

vercelDiagnostic().then(() => process.exit(0));