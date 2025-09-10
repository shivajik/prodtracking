import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    const existingOperator = await storage.getUserByUsername("operator");

    // Create admin user if doesn't exist
    if (!existingAdmin) {
      const adminPassword = "admin123";
      const hashedPassword = await hashPassword(adminPassword);

      await storage.createUser({
        username: "admin",
        email: "admin@greengoldseeds.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Admin user created");
    }

    // Create operator user if doesn't exist
    if (!existingOperator) {
      const operatorPassword = "operator123";
      const operatorHashedPassword = await hashPassword(operatorPassword);

      await storage.createUser({
        username: "operator",
        email: "operator@greengoldseeds.com",
        password: operatorHashedPassword,
        role: "operator",
      });
      console.log("✅ Operator user created");
    }

    if (existingAdmin && existingOperator) {
      console.log("Demo users already exist, skipping seed.");
      return;
    }

    console.log("✅ Database seeded successfully!");
    console.log("📧 Demo credentials:");
    console.log("   Admin - Username: admin, Password: admin123");
    console.log("   Operator - Username: operator, Password: operator123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();