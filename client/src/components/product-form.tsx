import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { CloudUpload, Send, RotateCcw, Upload } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Crop and Market Code data mapping
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

const productFormSchema = insertProductSchema.omit({
  submittedBy: true,
}).extend({
  // Required fields
  company: z.string().optional(),
  brand: z.string().optional(),
  cropName: z.string().min(1, "Crop name is required"),
  marketCode: z.string().min(1, "Market code is required"),
  lotNo: z.string().min(1, "Lot number is required"),
  // All other fields are optional
  description: z.string().optional(),
  mrp: z.string().optional(),
  netQty: z.string().optional(),
  lotBatch: z.string().optional(),
  mfgDate: z.string().optional(),
  expiryDate: z.string().optional(),
  uniqueId: z.string().optional(),
  customerCare: z.string().optional(),
  email: z.string().optional(),
  companyAddress: z.string().optional(),
  marketedBy: z.string().optional(),
  brochureUrl: z.string().optional(),
  brochureFilename: z.string().optional(),
  packSize: z.string().optional(),
  dateOfTest: z.string().optional(),
  unitSalePrice: z.string().optional(),
  noOfPkts: z.string().optional(),
  totalPkts: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  unitOfMeasureCode: z.string().optional(),
  prodCode: z.string().optional(),
  gb: z.string().optional(),
  location: z.string().optional(),
  stageCode: z.string().optional(),
  remainingQuantity: z.string().optional(),
  stackNo: z.string().optional(),
  normalGermination: z.string().optional(),
  gerAve: z.string().optional(),
  gotPercent: z.string().optional(),
  gotAve: z.string().optional(),
  labelNumber: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSuccess?: () => void;
}

export default function ProductForm({ onSuccess }: ProductFormProps = {}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [availableMarketCodes, setAvailableMarketCodes] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      company: "",
      brand: "",
      cropName: "",
      description: "",
      mrp: "",
      netQty: "",
      lotBatch: "",
      mfgDate: "",
      expiryDate: "",
      uniqueId: "",
      customerCare: "",
      email: "",
      companyAddress: "",
      marketedBy: "",
      brochureUrl: "",
      brochureFilename: "",
      packSize: "",
      dateOfTest: "",
      unitSalePrice: "",
      noOfPkts: "",
      totalPkts: "",
      from: "",
      to: "",
      unitOfMeasureCode: "",
      marketCode: "",
      prodCode: "",
      lotNo: "",
      gb: "",
      location: "",
      stageCode: "",
      remainingQuantity: "",
      stackNo: "",
      normalGermination: "",
      gerAve: "",
      gotPercent: "",
      gotAve: "",
      labelNumber: "",
    },
  });

  // Update available market codes when crop changes
  useEffect(() => {
    if (selectedCrop && cropMarketData[selectedCrop as keyof typeof cropMarketData]) {
      setAvailableMarketCodes(cropMarketData[selectedCrop as keyof typeof cropMarketData]);
    } else {
      setAvailableMarketCodes([]);
    }
  }, [selectedCrop]);

  const handleCropChange = (cropName: string) => {
    setSelectedCrop(cropName);
    form.setValue("cropName", cropName);
    // Reset market code when crop changes
    form.setValue("marketCode", "");
  };

  const submitProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formData = new FormData();
      
      // Process each field, mapping cropName to product for backward compatibility
      Object.entries(data).forEach(([key, value]) => {
        if (key === "cropName") {
          formData.append("product", value?.toString() || "");
        } else {
          formData.append(key, value?.toString() || "");
        }
      });
      
      if (file) {
        formData.append("brochure", file);
      }

      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit product");
      }

      return response.json();
    },
    onSuccess: (product) => {
      toast({
        title: "Product submitted successfully",
        description: `Product "${product.product}" has been submitted for approval.`,
      });
      form.reset();
      setFile(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    submitProductMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, DOC, DOCX, JPG, JPEG, or PNG file",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleReset = () => {
    form.reset();
    setFile(null);
  };

  const importProductsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to import products');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Import successful",
        description: `Successfully imported ${data.imported} products. ${data.skipped || 0} rows were skipped.`,
      });
      setShowImportDialog(false);
      setImportFile(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV or Excel file to import.",
        variant: "destructive",
      });
      return;
    }
    
    importProductsMutation.mutate(importFile);
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Product Information Entry</CardTitle>
              <p className="text-muted-foreground">Fill in all required product details for approval</p>
            </div>
            <Button 
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Products
            </Button>
          </div>
        </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-brand" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cropName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crop Name *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={handleCropChange}>
                        <SelectTrigger data-testid="select-crop-name">
                          <SelectValue placeholder="Select crop name" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(cropMarketData).map((crop) => (
                            <SelectItem key={crop} value={crop}>
                              {crop}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="uniqueId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unique ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Auto-generated if empty" data-testid="input-unique-id" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Leave empty for auto-generation</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="textarea-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Pricing and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP Rs. (Inclusive of All Taxes)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-mrp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="netQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Qty *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-net-qty" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="packSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack Size</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-pack-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Additional Pricing Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="unitSalePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Sale Price</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-unit-sale-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="noOfPkts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. of Packets</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-no-of-pkts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="totalPkts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Packets</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-total-pkts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="labelNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-label-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Batch and Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="lotBatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot/Batch No</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-lot-batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lotNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot No *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-lot-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stackNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stack No</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-stack-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="mfgDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mfg Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-mfg-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-expiry-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateOfTest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Test</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-date-of-test" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerCare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Care Contact *</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" data-testid="input-customer-care" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Address and Marketing */}
            <FormField
              control={form.control}
              name="companyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Address *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} data-testid="textarea-company-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="marketedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketed By *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-marketed-by" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Distribution Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. From</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-from" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. To</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Codes and Technical Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="unitOfMeasureCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-unit-of-measure-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="marketCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variety *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-market-code">
                          <SelectValue placeholder="Select market code" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMarketCodes.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="prodCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-prod-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="stageCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-stage-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="remainingQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remaining Quantity</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-remaining-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Quality and Testing Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* <FormField
                control={form.control}
                name="normalGermination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Normal Germination (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-normal-germination" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              
              {/* <FormField
                control={form.control}
                name="gerAve"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Germination Average</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-ger-ave" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              
              <FormField
                control={form.control}
                name="gb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GB</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-gb" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* <FormField
                control={form.control}
                name="gotPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GOT Percent</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.00000001" data-testid="input-got-percent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              
              {/* <FormField
                control={form.control}
                name="gotAve"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GOT Average</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.0001" data-testid="input-got-ave" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>
            
            {/* File Upload */}
            <div>
              <Label htmlFor="brochure">Brochure (Attachment)</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md hover:border-primary/50 transition-colors">
                <div className="space-y-1 text-center">
                  <CloudUpload className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div className="flex text-sm text-muted-foreground">
                    <label htmlFor="brochure" className="relative cursor-pointer bg-background rounded-md font-medium text-primary hover:text-primary/80">
                      <span>Upload a file</span>
                      <input 
                        id="brochure" 
                        name="brochure" 
                        type="file" 
                        className="sr-only" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        data-testid="input-brochure"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, DOC, JPG up to 10MB</p>
                  {file && (
                    <p className="text-sm text-primary font-medium">{file.name}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
              <Button 
                type="submit" 
                disabled={submitProductMutation.isPending}
                data-testid="button-submit"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitProductMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>

    {/* Import Products Dialog */}
    <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import products. The file should contain columns for company, brand, product, description, MRP, net quantity, lot/batch, manufacturing date, expiry date, customer care, email, company address, and marketed by.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-file">Select File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>
          {importFile && (
            <div className="text-sm">
              <strong>Selected file:</strong> {importFile.name}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!importFile || importProductsMutation.isPending}
          >
            {importProductsMutation.isPending ? "Importing..." : "Import Products"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
