import { db } from "../server/db";
import { users, products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedDemoData() {
  try {
    console.log("🌱 Starting demo data seeding...");

    // First, find the demo operator user (op2)
    const [operatorUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, "op2"));

    if (!operatorUser) {
      console.error("❌ Demo operator user 'op2' not found. Please ensure user exists.");
      return;
    }

    console.log(`✅ Found operator user: ${operatorUser.email}`);

    // Check if demo products already exist
    const existingProducts = await db
      .select()
      .from(products)
      .where(eq(products.uniqueId, "GGS-2024-001001"));

    if (existingProducts.length > 0) {
      console.log("⚠️  Demo products already exist. Skipping seed.");
      return;
    }

    // Demo products data
    const demoProducts = [
      {
        uniqueId: "GGS-2024-001001",
        company: "Green Gold Seeds Pvt Ltd",
        brand: "Green Gold",
        product: "Mustard NML-64",
        description: "High yielding mustard variety with excellent oil content and disease resistance.",
        mrp: "850.00",
        netQty: "1 kg",
        lotBatch: "GGS-MUS-001",
        mfgDate: "2024-01-15",
        expiryDate: "2025-01-14",
        customerCare: "+91-9876543210",
        email: "support@greengoldseeds.com",
        companyAddress: "123 Agricultural Park, Green Valley, Punjab 147001",
        marketedBy: "Green Gold Seeds Pvt Ltd",
        status: "approved",
        submittedBy: operatorUser.id,
      },
      {
        uniqueId: "GGS-2024-001002",
        company: "Green Gold Seeds Pvt Ltd",
        brand: "Green Gold",
        product: "Golden Wheat GW-2024",
        description: "Premium wheat seeds with high protein content and superior grain quality.",
        mrp: "950.00",
        netQty: "2 kg",
        lotBatch: "GGS-WHT-002",
        mfgDate: "2024-02-01",
        expiryDate: "2025-01-31",
        customerCare: "+91-9876543210",
        email: "support@greengoldseeds.com",
        companyAddress: "123 Agricultural Park, Green Valley, Punjab 147001",
        marketedBy: "Green Gold Seeds Pvt Ltd",
        status: "approved",
        submittedBy: operatorUser.id,
      },
      {
        uniqueId: "GGS-2024-001003",
        company: "Green Gold Seeds Pvt Ltd",
        brand: "Green Gold",
        product: "Superstar Tomato Hybrid Seeds",
        description: "High yielding hybrid tomato variety suitable for greenhouse and open field cultivation.",
        mrp: "1200.00",
        netQty: "10 grams",
        lotBatch: "GGS-TOM-003",
        mfgDate: "2024-03-10",
        expiryDate: "2025-03-09",
        customerCare: "+91-9876543210",
        email: "support@greengoldseeds.com",
        companyAddress: "123 Agricultural Park, Green Valley, Punjab 147001",
        marketedBy: "Green Gold Seeds Pvt Ltd",
        status: "approved",
        submittedBy: operatorUser.id,
      },
      {
        uniqueId: "GGS-2024-001004",
        company: "Green Gold Seeds Pvt Ltd",
        brand: "Green Gold",
        product: "Royal Basmati Rice Seeds",
        description: "Premium basmati rice variety with exceptional aroma and cooking quality.",
        mrp: "1500.00",
        netQty: "5 kg",
        lotBatch: "GGS-RIC-004",
        mfgDate: "2024-04-05",
        expiryDate: "2025-04-04",
        customerCare: "+91-9876543210",
        email: "support@greengoldseeds.com",
        companyAddress: "123 Agricultural Park, Green Valley, Punjab 147001",
        marketedBy: "Green Gold Seeds Pvt Ltd",
        status: "approved",
        submittedBy: operatorUser.id,
      },
      {
        uniqueId: "GGS-2024-001005",
        company: "Green Gold Seeds Pvt Ltd",
        brand: "Test Brand",
        product: "Power Cotton BT Hybrid",
        description: "Bollworm resistant cotton hybrid with high fiber quality and yield potential.",
        mrp: "1800.00",
        netQty: "450 grams",
        lotBatch: "GGS-COT-005",
        mfgDate: "2024-05-20",
        expiryDate: "2025-05-19",
        customerCare: "+91-9876543210",
        email: "support@greengoldseeds.com",
        companyAddress: "123 Agricultural Park, Green Valley, Punjab 147001",
        marketedBy: "Green Gold Seeds Pvt Ltd",
        status: "rejected",
        submittedBy: operatorUser.id,
        rejectionReason: "Incomplete documentation for BT cotton regulatory approval",
      },
    ];

    // Insert demo products
    console.log(`📦 Inserting ${demoProducts.length} demo products...`);
    
    for (const productData of demoProducts) {
      await db.insert(products).values(productData);
      console.log(`✅ Added product: ${productData.product} (${productData.uniqueId})`);
    }

    console.log("🎉 Demo data seeding completed successfully!");
    console.log(`
📊 Summary:
- ${demoProducts.filter(p => p.status === "approved").length} approved products
- ${demoProducts.filter(p => p.status === "rejected").length} rejected products
- All products assigned to operator: ${operatorUser.email}
`);

  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData().then(() => process.exit(0));
}

export { seedDemoData };