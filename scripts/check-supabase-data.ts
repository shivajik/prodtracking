import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { products, users } from '../shared/schema.js';
import { desc } from 'drizzle-orm';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const supabaseUrl = "postgresql://postgres.rxwtyauwneiqnwmrubio:greengold1234@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";

async function checkSupabaseData() {
  const pool = new Pool({ connectionString: supabaseUrl });
  const db = drizzle({ client: pool });

  try {
    console.log("🔍 Checking Supabase database content...");
    
    // Check products
    const productsData = await db
      .select({
        uniqueId: products.uniqueId,
        product: products.product,
        status: products.status,
        submissionDate: products.submissionDate
      })
      .from(products)
      .orderBy(desc(products.submissionDate));
    
    console.log("\n📦 Products in Supabase Database:");
    console.table(productsData);
    
    console.log(`\n📊 Summary:`);
    console.log(`Total Products: ${productsData.length}`);
    console.log(`Approved: ${productsData.filter(p => p.status === 'approved').length}`);
    console.log(`Pending: ${productsData.filter(p => p.status === 'pending').length}`);
    console.log(`Rejected: ${productsData.filter(p => p.status === 'rejected').length}`);
    
    // Check users
    const usersData = await db
      .select({
        username: users.username,
        email: users.email,
        role: users.role
      })
      .from(users);
    
    console.log("\n👥 Users in Supabase Database:");
    console.table(usersData);
    
  } catch (error) {
    console.error("❌ Error checking Supabase data:", error);
  } finally {
    await pool.end();
  }
}

checkSupabaseData();