// Temporarily switch DATABASE_URL to Supabase for syncing
console.log("🔄 Switching to Supabase database...");

// Update environment variable
process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;

console.log("✅ DATABASE_URL updated to Supabase");
console.log("🔗 Connection string:", process.env.DATABASE_URL?.substring(0, 50) + "...");

export {};