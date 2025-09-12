import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { CloudUpload, Send, RotateCcw, Upload } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const productFormSchema = insertProductSchema.omit({
  submittedBy: true,
}).extend({
  // Override all optional string fields to be required strings for the form
  company: z.string().default(""),
  brand: z.string().default(""),
  product: z.string().default(""),
  description: z.string().default(""),
  mrp: z.string().default(""),
  netQty: z.string().default(""),
  lotBatch: z.string().default(""),
  mfgDate: z.string().default(""),
  expiryDate: z.string().default(""),
  uniqueId: z.string().default(""),
  customerCare: z.string().default(""),
  email: z.string().default(""),
  companyAddress: z.string().default(""),
  marketedBy: z.string().default(""),
  brochureUrl: z.string().default(""),
  brochureFilename: z.string().default(""),
  packSize: z.string().default(""),
  dateOfTest: z.string().default(""),
  unitSalePrice: z.string().default(""),
  noOfPkts: z.string().default(""),
  totalPkts: z.string().default(""),
  from: z.string().default(""),
  to: z.string().default(""),
  marketingCode: z.string().default(""),
  unitOfMeasureCode: z.string().default(""),
  marketCode: z.string().default(""),
  prodCode: z.string().default(""),
  lotNo: z.string().default(""),
  gb: z.string().default(""),
  location: z.string().default(""),
  stageCode: z.string().default(""),
  remainingQuantity: z.string().default(""),
  stackNo: z.string().default(""),
  normalGermination: z.string().default(""),
  gerAve: z.string().default(""),
  gotPercent: z.string().default(""),
  gotAve: z.string().default(""),
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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      company: "",
      brand: "",
      product: "",
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
      marketingCode: "",
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
    },
  });

  const submitProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value?.toString() || "");
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
                    <FormLabel>Company *</FormLabel>
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
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-brand" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-product" />
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
                  <FormLabel>Description *</FormLabel>
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
                    <FormLabel>MRP Rs. (Inclusive of All Taxes) *</FormLabel>
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
            </div>
            
            {/* Batch and Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="lotBatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot/Batch No *</FormLabel>
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
                    <FormLabel>Lot No</FormLabel>
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
                    <FormLabel>From</FormLabel>
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
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Codes and Technical Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="marketingCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketing Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-marketing-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                    <FormLabel>Market Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-market-code" />
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
              <FormField
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
              />
              
              <FormField
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
              />
              
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
              <FormField
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
              />
              
              <FormField
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
              />
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
