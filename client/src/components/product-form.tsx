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
import { useCropNames, useVarietiesForCrop } from "@/hooks/use-crops-varieties";
import { useCropVarietyUrl } from "@/hooks/use-crop-variety-url";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { CloudUpload, Send, RotateCcw, Upload } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Dynamic crop and variety data will be fetched from API

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
  classType: z.string().optional(),
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
  const [selectedVariety, setSelectedVariety] = useState<string>("");

  // Fetch dynamic crop and variety data
  const { data: cropNames, isLoading: cropsLoading } = useCropNames();
  const { data: availableVarieties, isLoading: varietiesLoading } = useVarietiesForCrop(selectedCrop);
  
  // Fetch crop-variety URL when both crop and variety are selected
  const { data: cropVarietyUrl, isLoading: urlLoading } = useCropVarietyUrl(selectedCrop, selectedVariety);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      company: "Green Gold Seeds Pvt. Ltd.",
      brand: "",
      cropName: "",
      description: "",
      mrp: "",
      netQty: "",
      lotBatch: "",
      mfgDate: "",
      expiryDate: "",
      uniqueId: "",
      customerCare: "+91 88888 66031",
      email: "greengoldseeds@rediffmail.com",
      companyAddress: "Gut No. 65, Narayanpur Shivar, Waluj, Gangapur Dist: Chh. Sambhajinagar-431001",
      marketedBy: "Green Gold Seeds Pvt. Ltd.",
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
      classType: "",
    },
  });

  // No longer needed - varieties are fetched dynamically based on selectedCrop

  const handleCropChange = (cropName: string) => {
    setSelectedCrop(cropName);
    setSelectedVariety(""); // Reset variety when crop changes
    form.setValue("cropName", cropName);
    form.setValue("marketCode", ""); // Reset market code when crop changes
  };

  const handleVarietyChange = (varietyCode: string) => {
    setSelectedVariety(varietyCode);
    form.setValue("marketCode", varietyCode);
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
        <CardHeader className="pb-4">
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
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Product Information - Arranged in user specified order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {cropsLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading crops...</div>
                          ) : cropNames?.length ? (
                            cropNames.map((crop) => (
                              <SelectItem key={crop} value={crop}>
                                {crop}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-muted-foreground">No crops available</div>
                          )}
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
              {/* {/* Variety form field - commented out as requested */}
              <FormField
                control={form.control}
                name="marketCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variety</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={handleVarietyChange}>
                        <SelectTrigger data-testid="select-variety">
                          <SelectValue placeholder="Select variety" />
                        </SelectTrigger>
                        <SelectContent>
                          {varietiesLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading varieties...</div>
                          ) : !selectedCrop ? (
                            <div className="p-2 text-center text-muted-foreground">Please select a crop first</div>
                          ) : availableVarieties?.length ? (
                            availableVarieties.map((variety) => (
                              <SelectItem key={variety} value={variety}>
                                {variety}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-muted-foreground">No varieties available for selected crop</div>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              <FormField
                control={form.control}
                name="classType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-class-type">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trustful">Trustful</SelectItem>
                          <SelectItem value="certified">Certified</SelectItem>
                          <SelectItem value="foundation">Foundation</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
            </div>
            

            
            {/* Main product fields - removed variety since it's now with crop name above */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="prodCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-product-code" />
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
                name="gb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GB</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-gb" />
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
                    <FormLabel>Qty(kg) *</FormLabel>
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
              
              <FormField
                control={form.control}
                name="noOfPkts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No Of Pkts</FormLabel>
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
                    <FormLabel>Total Pkts</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-total-pkts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lotBatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Lot No</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-lot-batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label No. From</FormLabel>
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
                    <FormLabel>Label No. To</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-to" />
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
                    <FormLabel>Date Of Test</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-date-of-test" />
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
                    <FormLabel>Valid Up To</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-expiry-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mfgDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Of Packing</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-mfg-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-mrp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unitSalePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Sale Prize</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-unit-sale-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commented out fields - keeping for reference as requested 
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
              */}
              
              {/* Final fields as requested */}
              {/* <FormField
              //   control={form.control}
              //   name="stageCode"
              //   render={({ field }) => (
              //     <FormItem>
              //       <FormLabel>Stage Code</FormLabel>
              //       <FormControl>
              //         <Input {...field} data-testid="input-stage-code" />
              //       </FormControl>
              //       <FormMessage />
              //     </FormItem>
              //   )}
              // />
              
              // <FormField
              //   control={form.control}
              //   name="remainingQuantity"
              //   render={({ field }) => (
              //     <FormItem>
              //       <FormLabel>Remaining Quantity</FormLabel>
              //       <FormControl>
              //         <Input {...field} data-testid="input-remaining-quantity" />
              //       </FormControl>
              //       <FormMessage />
              //     </FormItem>
              //   )}
              // />
              
              // <FormField
              //   control={form.control}
              //   name="unitOfMeasureCode"
              //   render={({ field }) => (
              //     <FormItem>
              //       <FormLabel>Unit of Measure Code</FormLabel>
              //       <FormControl>
              //         <Input {...field} data-testid="input-unit-of-measure-code" />
              //       </FormControl>
              //       <FormMessage />
              //     </FormItem>
              //   )}
              // /> */}
            </div>
            
            {/* Contact Information - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            </div>
{/*             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            </div> */}
            
            {/* Codes and Technical Information */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> */}
              {/* <FormField
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
              /> */}
              
              
              {/* <FormField
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
              /> */}
            {/* </div> */}
            
          
            
            {/* Quality and Testing Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            {/* Brochure Section - URL or File Upload */}
            <div>
              <Label>Brochure (Attachment)</Label>
              
              {/* Show predefined URL if available */}
              {cropVarietyUrl && !urlLoading ? (
                <div className="mt-1 p-4 border-2 border-green-200 rounded-md bg-green-50">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Predefined URL Available</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <strong>URL:</strong> 
                      <a 
                        href={cropVarietyUrl.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 hover:text-blue-800 underline break-all"
                        data-testid="predefined-url-link"
                      >
                        {cropVarietyUrl.url}
                      </a>
                    </div>
                    {cropVarietyUrl.description && (
                      <div className="text-sm text-green-700">
                        <strong>Description:</strong> {cropVarietyUrl.description}
                      </div>
                    )}
                  </div>
                </div>
              ) : urlLoading ? (
                <div className="mt-1 p-4 border-2 border-gray-200 rounded-md bg-gray-50">
                  <div className="text-center text-sm text-muted-foreground">
                    Checking for predefined URL...
                  </div>
                </div>
              ) : (
                /* Show file upload if no URL is available */
                <div className="mt-1 flex justify-center px-6 py-4 border-2 border-border border-dashed rounded-md hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <CloudUpload className="h-8 w-8 text-muted-foreground mx-auto" />
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
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
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
)
}
