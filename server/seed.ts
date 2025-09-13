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

    // Check if users already exist
    const existingAdmin = await storage.getUserByUsername("admin");
    const existingOp2 = await storage.getUserByUsername("op2");

    // Create admin user if doesn't exist
    if (!existingAdmin) {
      const adminPassword = "admin123";
      const hashedPassword = await hashPassword(adminPassword);

      await storage.createUser({
        username: "admin",
        email: "admin@test.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Admin user created");
    }

    // Create operator user with username "op2" if doesn't exist
    if (!existingOp2) {
      const operatorPassword = "test123";
      const operatorHashedPassword = await hashPassword(operatorPassword);

      await storage.createUser({
        username: "op2",
        email: "op@test.com",
        password: operatorHashedPassword,
        role: "operator",
      });
      console.log("✅ Operator user (op2) created");
    }

    // Add sample products
    console.log("Adding sample products...");
    
    // Sample products for testing
    const sampleProducts = [
      {
        company: "Green Gold Agro",
        brand: "Power Cotton",
        product: "Power Cotton BT Hybrid",
        description: "High yield cotton seeds with BT technology for superior pest resistance",
        mrp: "2150.00",
        netQty: "450 grams",
        lotBatch: "PC2408010",
        mfgDate: "2024-08-01",
        expiryDate: "2025-07-31",
        customerCare: "+91 88888 66031",
        email: "support@greengoldagro.com",
        companyAddress: "Green Gold Agro Ltd, Plot No. 45, Industrial Area, Nashik - 422001, Maharashtra, India",
        marketedBy: "Green Gold Agro Limited",
        uniqueId: "GGS-2024-001005",
        status: "rejected",
        rejectionReason: "Documentation incomplete - missing test certificate",
        submittedBy: "op@test.com",
        submissionDate: new Date("2024-10-09")
      },
      {
        company: "Royal Seeds Co.",
        brand: "Royal Rice",
        product: "Royal Basmati Rice Seeds",
        description: "Premium basmati rice seeds for aromatic long grain rice production",
        mrp: "890.00",
        netQty: "5.000 kg",
        lotBatch: "RR240716",
        mfgDate: "2024-07-16",
        expiryDate: "2025-06-15",
        customerCare: "+91 77777 55042",
        email: "info@royalseeds.com",
        companyAddress: "Royal Seeds Co., Sector 12, Panchkula - 134109, Haryana, India",
        marketedBy: "Royal Seeds Company",
        uniqueId: "GGS-2024-001004",
        status: "approved",
        submittedBy: "op@test.com",
        submissionDate: new Date("2024-10-09"),
        approvalDate: new Date("2024-10-09"),
        approvedBy: "admin@test.com"
      },
      {
        company: "Superstar Agri",
        brand: "Superstar Tomato",
        product: "Superstar Tomato Hybrid Seeds",
        description: "Disease resistant tomato hybrid seeds for commercial cultivation",
        mrp: "1250.00",
        netQty: "10 grams",
        lotBatch: "ST240830",
        mfgDate: "2024-08-30",
        expiryDate: "2025-07-29",
        customerCare: "+91 99999 88773",
        email: "care@superstatagri.com",
        companyAddress: "Superstar Agri Solutions, Agra Road, Mathura - 281001, Uttar Pradesh, India",
        marketedBy: "Superstar Agri Solutions",
        uniqueId: "GGS-2024-001003",
        status: "approved",
        submittedBy: "op@test.com",
        submissionDate: new Date("2024-10-09"),
        approvalDate: new Date("2024-10-09"),
        approvedBy: "admin@test.com"
      },
      {
        company: "Golden Wheat Co.",
        brand: "Golden Wheat",
        product: "Golden Wheat GW-2024",
        description: "High protein wheat variety suitable for all soil types",
        mrp: "580.00",
        netQty: "2.000 kg",
        lotBatch: "GW240915",
        mfgDate: "2024-09-15",
        expiryDate: "2025-08-14",
        customerCare: "+91 66666 77884",
        email: "support@goldenwheat.com",
        companyAddress: "Golden Wheat Co., Industrial Estate, Ludhiana - 141003, Punjab, India",
        marketedBy: "Golden Wheat Company",
        uniqueId: "GGS-2024-001002",
        status: "approved",
        submittedBy: "op@test.com",
        submissionDate: new Date("2024-10-09"),
        approvalDate: new Date("2024-10-09"),
        approvedBy: "admin@test.com"
      },
      {
        company: "NML Seeds",
        brand: "Mustard NML-64",
        product: "Mustard NML-64",
        description: "Early maturing mustard variety with high oil content",
        mrp: "650.00",
        netQty: "1.000 kg",
        lotBatch: "T347746",
        mfgDate: "2024-09-20",
        expiryDate: "2025-08-19",
        customerCare: "+91 55555 99665",
        email: "info@nmlseeds.com",
        companyAddress: "NML Seeds Pvt. Ltd., Kota Road, Bundi - 323001, Rajasthan, India",
        marketedBy: "NML Seeds Private Limited",
        uniqueId: "GGS-2024-001001",
        status: "approved",
        submittedBy: "op@test.com",
        submissionDate: new Date("2024-10-09"),
        approvalDate: new Date("2024-10-09"),
        approvedBy: "admin@test.com"
      }
    ];

    // Create sample products
    for (const productData of sampleProducts) {
      try {
        await storage.createProduct(productData);
        console.log(`✅ Created product: ${productData.product}`);
      } catch (error) {
        console.log(`⚠️  Product ${productData.product} might already exist, skipping...`);
      }
    }

    console.log("✅ Database seeded successfully!");
    console.log("📧 Demo credentials:");
    console.log("   Admin - Username: admin, Password: admin123");
    console.log("   Operator - Username: op2, Password: test123");
    console.log("📦 Sample products added with various statuses for testing");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();