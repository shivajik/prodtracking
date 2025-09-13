import { db } from "../server/db";
import { crops, varieties } from "@shared/schema";

// Crop and Market Code data mapping from existing forms
const cropMarketData = {
  "Bajra": ["GOLD-28", "GOLD-27", "GOLD-29"],
  "Bhendi": ["GOLD-207", "GOLD-201"],
  "Bittergourd": ["GOLD-900 SANIKA", "GOLD-911 SOMMYA", "GOLD-903"],
  "Bottlegourd": ["GOLD-707 KALYANI"],
  "Chillies": ["GOLD-504 V-SHIELD", "GOLD-507 VIRAGNI", "GOLD-505 TEJAGNI"],
  "Clusterbean": ["GOLD-601", "GOLD-602"],
  "Coriander": ["SUVASINI", "GOLD-225"],
  "Cotton": [
    "GOLD-81 NAMASKAR",
    "GBCH-85 BG II",
    "GBCH-8888 BG II",
    "GBCH-185 BG II",
    "GBCH-9999 (KARTIK)",
    "GBCH-95 BG II ASHOKA",
    "GBCH-90 KAVITA BG II",
    "GBCH-1801 BG II"
  ],
  "Cowpea": ["GOLD-309"],
  "Cucumber": ["GOLD-403"],
  "Gram": ["GOLD-72", "GOLD-75"],
  "Green Pea": ["GOLD-10"],
  "Jowar": ["GOLD-45", "GOLD-54", "GOLD-25 SHEETAL", "GGFSH-103 CHERI GOLD"],
  "Maize": [
    "GOLD-1166",
    "GOLD-1144 ANKUSH",
    "GOLD-1143 TUSKER",
    "GOLD-1152 UNIVERSAL",
    "GOLD-1154 BALIRAJA",
    "GOLD-1121 PANTHER",
    "GOLD-1155 SHUBHRA"
  ],
  "Moong": ["GOLD-9 SHANESHWAR", "GOLD-50 VISHNU", "GOLD-60", "GOLD-39"],
  "Muskmelon": ["GOLD-414"],
  "Mustard": ["GOLD-358", "GOLD-359"],
  "Onion": ["GOLD-853", "GOLD-877"],
  "Paddy": [
    "GOLD-88 SHRIRAM",
    "GOLD-78",
    "GOLD-99 SUPER MOHINI",
    "GOLD-111 ANNAPURNA",
    "GOLD-444 CHAMATKAR",
    "GOLD-333 BHEEM",
    "GOLD-77 MUKTA GOLD"
  ],
  "Radish": ["GOLD-60 RAJ", "GOLD-20 PRATHAM"],
  "Ridgegourd": ["GOLD-VISHWAS", "GOLD-905 ASMITA"],
  "Sesame": ["GOLD-801 SANKRANTI"],
  "Soyabean": [
    "JS-335",
    "JS-9305",
    "GOLD-3344",
    "GOLD-309",
    "KDS-726",
    "KDS-753",
    "G-4182",
    "G-4183",
    "G-4184",
    "G-4186",
    "G-4185",
    "G-4187",
    "G-4188",
    "G-4189",
    "G-4190",
    "G-4135",
    "G-4145",
    "G-4155",
    "G-4126",
    "G-4105",
    "G-4153",
    "GGSV-193",
    "GOLD-301"
  ],
  "Spinach": ["GOLD-243"],
  "Sunflower": ["GOLD-7 SUPERSUN"],
  "Sweet Corn": ["GOLD-1000"],
  "Tur": ["GOLD-100", "GOLD-135", "GOLD-131", "BDN-711"],
  "Udid": ["GOLD-22", "TAU-1"],
  "Watermelon": ["GOLD-441 KING XL"],
  "Wheat": ["GOLD-21", "GOLD-23", "GOLD-71 BHANUDAS", "GOLD-29"]
};

async function seedCropsAndVarieties() {
  console.log("🌱 Starting crop and variety seeding...");
  
  try {
    // Check if data already exists
    const existingCrops = await db.select().from(crops);
    if (existingCrops.length > 0) {
      console.log("📊 Crops already exist in database. Skipping seeding.");
      return;
    }
    
    let totalCrops = 0;
    let totalVarieties = 0;
    
    for (const [cropName, varietyCodes] of Object.entries(cropMarketData)) {
      // Create crop
      const [newCrop] = await db
        .insert(crops)
        .values({ name: cropName })
        .returning();
      
      console.log(`✅ Created crop: ${cropName}`);
      totalCrops++;
      
      // Create varieties for this crop
      for (const varietyCode of varietyCodes) {
        await db
          .insert(varieties)
          .values({
            code: varietyCode,
            cropId: newCrop.id
          });
        
        console.log(`  ➤ Added variety: ${varietyCode}`);
        totalVarieties++;
      }
    }
    
    console.log(`🎉 Seeding complete!`);
    console.log(`📊 Created ${totalCrops} crops and ${totalVarieties} varieties`);
    
  } catch (error) {
    console.error("❌ Error seeding crops and varieties:", error);
    throw error;
  }
}

// Run the seeding function
seedCropsAndVarieties()
  .then(() => {
    console.log("✨ Seeding finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });