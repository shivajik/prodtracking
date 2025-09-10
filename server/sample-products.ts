import { storage } from "./storage";

export async function createSampleProducts() {
  try {
    console.log("Creating sample products...");

    // Check if we have any operators to assign products to
    const users = await storage.getAllUsers();
    const operators = users.filter(user => user.role === "operator");
    
    if (operators.length === 0) {
      console.log("No operators found. Please create operator accounts first.");
      return;
    }

    const operator = operators[0]; // Use first operator

    const sampleProducts = [
      {
        company: "NIRMAL SEEDS PRIVATE LIMITED",
        brand: "Mustard NML-64",
        product: "Mustard NML-64",
        description: "High yielding mustard variety suitable for all agro-climatic conditions. Disease resistant and early maturing.",
        mrp: "650.00",
        netQty: "1.000 kg",
        lotBatch: "T341746",
        mfgDate: "2024-08-29",
        expiryDate: "2026-04-28",
        uniqueId: "GGS-2024-001001",
        customerCare: "02596-244366, 244396",
        email: "legal@nirmalseedsindia.com",
        companyAddress: "Nirmal Seeds Pvt. Ltd. (An ISO 9001-2015 Certified Company) P.O. Box No. 63, Bhadgaon Road, Pachora-424201 Dist: Jalgaon (Maharashtra) India",
        marketedBy: "Nirmal Seeds Pvt. Ltd.",
        submittedBy: operator.id,
        status: "approved" as const,
        approvalDate: new Date(),
      },
      {
        company: "GREEN GOLD SEEDS PVT LTD",
        brand: "Golden Wheat",
        product: "Golden Wheat GW-2024",
        description: "Premium quality wheat seeds with high protein content and excellent germination rate. Suitable for Rabi season.",
        mrp: "580.00",
        netQty: "2.000 kg",
        lotBatch: "GW240915",
        mfgDate: "2024-09-01",
        expiryDate: "2026-03-01",
        uniqueId: "GGS-2024-001002",
        customerCare: "+91 88888 66031",
        email: "greengoldseeds@rediffmail.com",
        companyAddress: "Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001",
        marketedBy: "Green Gold Seeds Pvt. Ltd.",
        submittedBy: operator.id,
        status: "approved" as const,
        approvalDate: new Date(),
      },
      {
        company: "GREEN GOLD SEEDS PVT LTD",
        brand: "Superstar Tomato",
        product: "Superstar Tomato Hybrid Seeds",
        description: "High yielding hybrid tomato variety with excellent disease resistance. Perfect for greenhouse and open field cultivation.",
        mrp: "1250.00",
        netQty: "10 grams",
        lotBatch: "ST240820",
        mfgDate: "2024-08-20",
        expiryDate: "2026-02-20",
        uniqueId: "GGS-2024-001003",
        customerCare: "+91 88888 66031",
        email: "greengoldseeds@rediffmail.com",
        companyAddress: "Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001",
        marketedBy: "Green Gold Seeds Pvt. Ltd.",
        submittedBy: operator.id,
        status: "pending" as const,
      },
      {
        company: "SUPREME SEEDS CORPORATION",
        brand: "Royal Rice",
        product: "Royal Basmati Rice Seeds",
        description: "Premium Basmati rice variety with excellent aroma and long grain characteristics. High market value.",
        mrp: "890.00",
        netQty: "5.000 kg",
        lotBatch: "RR240725",
        mfgDate: "2024-07-25",
        expiryDate: "2026-01-25",
        uniqueId: "GGS-2024-001004",
        customerCare: "0240-2567890",
        email: "info@supremeseeds.com",
        companyAddress: "Supreme Seeds Corporation, Plot No. 45, Industrial Area, Pune-411001, Maharashtra, India",
        marketedBy: "Supreme Seeds Corporation",
        submittedBy: operator.id,
        status: "approved" as const,
        approvalDate: new Date(),
      },
      {
        company: "AGRO TECH SEEDS LTD",
        brand: "Power Cotton",
        product: "Power Cotton BT Hybrid",
        description: "BT Cotton hybrid with superior bollworm resistance and high fiber quality. Suitable for irrigated conditions.",
        mrp: "2150.00",
        netQty: "450 grams",
        lotBatch: "PC240810",
        mfgDate: "2024-08-10",
        expiryDate: "2026-02-10",
        uniqueId: "GGS-2024-001005",
        customerCare: "022-67896543",
        email: "support@agrotechseeds.in",
        companyAddress: "AgroTech Seeds Ltd., 12th Floor, Business Tower, Andheri East, Mumbai-400069, Maharashtra",
        marketedBy: "AgroTech Seeds Ltd.",
        submittedBy: operator.id,
        status: "rejected" as const,
        rejectionReason: "Documentation incomplete - missing test certificate",
      }
    ];

    console.log(`Creating ${sampleProducts.length} sample products...`);

    for (const product of sampleProducts) {
      await storage.createProduct(product);
      console.log(`✅ Created product: ${product.product}`);
    }

    console.log("✅ All sample products created successfully!");
    console.log("📊 Summary:");
    console.log(`  - Total products: ${sampleProducts.length}`);
    console.log(`  - Approved: ${sampleProducts.filter(p => p.status === "approved").length}`);
    console.log(`  - Pending: ${sampleProducts.filter(p => p.status === "pending").length}`);
    console.log(`  - Rejected: ${sampleProducts.filter(p => p.status === "rejected").length}`);
    
  } catch (error) {
    console.error("❌ Error creating sample products:", error);
    throw error;
  }
}

// Note: Run this file directly with `npx tsx sample-products.ts` to create sample data