import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Product } from "@shared/schema";
import { useCropNames, useVarietiesForCrop } from "@/hooks/use-crops-varieties";
import { z } from "zod";

// Dynamic crop and variety data will be fetched from API

const editProductSchema = z.object({
  // Required fields
  company: z.string().optional(),
  brand: z.string().optional(),
  cropName: z.string().min(1, "Crop name is required"),
  marketCode: z.string().min(1, "Market code is required"),
  lotNo: z.string().min(1, "Lot number is required"),
  // Optional fields
  description: z.string().optional(),
  mrp: z.string().optional(),
  netQty: z.string().optional(),
  lotBatch: z.string().optional(),
  mfgDate: z.string().optional(),
  expiryDate: z.string().optional(),
  customerCare: z.string().optional(),
  email: z.string().optional(),
  companyAddress: z.string().optional(),
  marketedBy: z.string().optional(),
  // Additional fields
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

type EditProductData = z.infer<typeof editProductSchema>;

interface ProductEditDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Product>) => void;
  isLoading?: boolean;
}

export default function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSave,
  isLoading = false
}: ProductEditDialogProps) {
  const [selectedCrop, setSelectedCrop] = useState<string>(product.product || "");
  
  // Fetch dynamic crop and variety data
  const { data: cropNames, isLoading: cropsLoading } = useCropNames();
  const { data: availableVarieties, isLoading: varietiesLoading } = useVarietiesForCrop(selectedCrop);

  const editForm = useForm<EditProductData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      company: product.company || "",
      brand: product.brand || "",
      cropName: product.product || "",
      description: product.description || "",
      mrp: product.mrp?.toString() || "",
      netQty: product.netQty || "",
      lotBatch: product.lotBatch || "",
      mfgDate: product.mfgDate || "",
      expiryDate: product.expiryDate || "",
      customerCare: product.customerCare || "",
      email: product.email || "",
      companyAddress: product.companyAddress || "",
      marketedBy: product.marketedBy || "",
      packSize: product.packSize || "",
      dateOfTest: product.dateOfTest || "",
      unitSalePrice: product.unitSalePrice ? product.unitSalePrice.toString() : "",
      noOfPkts: product.noOfPkts ? product.noOfPkts.toString() : "",
      totalPkts: product.totalPkts ? product.totalPkts.toString() : "",
      from: product.from || "",
      to: product.to || "",
      unitOfMeasureCode: product.unitOfMeasureCode || "",
      marketCode: product.marketCode || "",
      prodCode: product.prodCode || "",
      lotNo: product.lotNo || "",
      gb: product.gb ? product.gb.toString() : "",
      location: product.location || "",
      stageCode: product.stageCode || "",
      remainingQuantity: product.remainingQuantity ? product.remainingQuantity.toString() : "",
      stackNo: product.stackNo || "",
      normalGermination: product.normalGermination ? product.normalGermination.toString() : "",
      gerAve: product.gerAve ? product.gerAve.toString() : "",
      gotPercent: product.gotPercent ? product.gotPercent.toString() : "",
      gotAve: product.gotAve ? product.gotAve.toString() : "",
      labelNumber: product.labelNumber || "",
    },
  });

  // No longer needed - varieties are fetched dynamically based on selectedCrop

  // Reset form when product changes
  useEffect(() => {
    const cropName = product.product || "";
    setSelectedCrop(cropName);
    editForm.reset({
      company: product.company || "",
      brand: product.brand || "",
      cropName: cropName,
      description: product.description || "",
      mrp: product.mrp?.toString() || "",
      netQty: product.netQty || "",
      lotBatch: product.lotBatch || "",
      mfgDate: product.mfgDate || "",
      expiryDate: product.expiryDate || "",
      customerCare: product.customerCare || "",
      email: product.email || "",
      companyAddress: product.companyAddress || "",
      marketedBy: product.marketedBy || "",
      packSize: product.packSize || "",
      dateOfTest: product.dateOfTest || "",
      unitSalePrice: product.unitSalePrice ? product.unitSalePrice.toString() : "",
      noOfPkts: product.noOfPkts ? product.noOfPkts.toString() : "",
      totalPkts: product.totalPkts ? product.totalPkts.toString() : "",
      from: product.from || "",
      to: product.to || "",
      unitOfMeasureCode: product.unitOfMeasureCode || "",
      marketCode: product.marketCode || "",
      prodCode: product.prodCode || "",
      lotNo: product.lotNo || "",
      gb: product.gb ? product.gb.toString() : "",
      location: product.location || "",
      stageCode: product.stageCode || "",
      remainingQuantity: product.remainingQuantity ? product.remainingQuantity.toString() : "",
      stackNo: product.stackNo || "",
      normalGermination: product.normalGermination ? product.normalGermination.toString() : "",
      gerAve: product.gerAve ? product.gerAve.toString() : "",
      gotPercent: product.gotPercent ? product.gotPercent.toString() : "",
      gotAve: product.gotAve ? product.gotAve.toString() : "",
      labelNumber: product.labelNumber || "",
    });
  }, [product, editForm]);

  const handleCropChange = (cropName: string) => {
    setSelectedCrop(cropName);
    editForm.setValue("cropName", cropName);
    // Reset market code when crop changes
    editForm.setValue("marketCode", "");
  };

  const handleSave = (data: EditProductData) => {
    // Extract cropName separately and prepare the rest of the data
    const { cropName, ...restData } = data;
    
    // Process the data - decimal fields stay as strings (as per Product schema)
    const processedData: Partial<Product> = {
      ...restData,
      // Map cropName back to product field for backward compatibility
      product: cropName,
      // Keep decimal fields as strings but ensure they're properly formatted or undefined
      mrp: data.mrp && data.mrp.trim() !== '' ? data.mrp : undefined,
      unitSalePrice: data.unitSalePrice && data.unitSalePrice.trim() !== '' ? data.unitSalePrice : undefined,
      noOfPkts: data.noOfPkts && data.noOfPkts.trim() !== '' ? data.noOfPkts : undefined,
      totalPkts: data.totalPkts && data.totalPkts.trim() !== '' ? data.totalPkts : undefined,
      gb: data.gb && data.gb.trim() !== '' ? data.gb : undefined,
      remainingQuantity: data.remainingQuantity && data.remainingQuantity.trim() !== '' ? data.remainingQuantity : undefined,
      normalGermination: data.normalGermination && data.normalGermination.trim() !== '' ? data.normalGermination : undefined,
      gerAve: data.gerAve && data.gerAve.trim() !== '' ? data.gerAve : undefined,
      gotPercent: data.gotPercent && data.gotPercent.trim() !== '' ? data.gotPercent : undefined,
      gotAve: data.gotAve && data.gotAve.trim() !== '' ? data.gotAve : undefined,
    };
    
    onSave(processedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-product">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleSave)} className="space-y-6">
            {/* Basic Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-brand" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="cropName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crop Name *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={handleCropChange}>
                        <SelectTrigger data-testid="select-edit-crop-name">
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
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Pricing and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-mrp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="unitSalePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Sale Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-unit-sale-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="netQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Quantity</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 1.000 kg" data-testid="input-edit-net-qty" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="labelNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-label-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="packSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack Size</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-pack-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="noOfPkts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. of Packets</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-edit-no-of-pkts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="totalPkts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Packets</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-edit-total-pkts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Batch and Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="lotBatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot/Batch Number *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-lot-batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="lotNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot No *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-lot-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="stackNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stack No</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-stack-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="mfgDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturing Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-mfg-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-expiry-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="dateOfTest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Test</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-date-of-test" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="customerCare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Care</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+91 88888 66031" data-testid="input-edit-customer-care" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={editForm.control}
              name="marketedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marketed By</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-marketed-by" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Distribution Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. From</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-from" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. To</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Codes and Technical Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="unitOfMeasureCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-unit-of-measure-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="marketCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variety *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!selectedCrop}>
                        <SelectTrigger data-testid="select-edit-market-code">
                          <SelectValue placeholder={selectedCrop ? "Select variety" : "Select crop first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {varietiesLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading varieties...</div>
                          ) : availableVarieties?.length ? (
                            availableVarieties.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))
                          ) : selectedCrop ? (
                            <div className="p-2 text-center text-muted-foreground">No varieties available for {selectedCrop}</div>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="prodCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-prod-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="stageCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-stage-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="remainingQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remaining Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-remaining-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Quality and Testing Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={editForm.control}
                name="normalGermination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Normal Germination (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-normal-germination" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="gerAve"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Germination Average</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-ger-ave" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="gb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GB</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-edit-gb" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="gotPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GOT Percent</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00000001" {...field} data-testid="input-edit-got-percent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="gotAve"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GOT Average</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} data-testid="input-edit-got-ave" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={editForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      placeholder="Enter product description..."
                      data-testid="textarea-edit-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={editForm.control}
              name="companyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={2}
                      placeholder="Enter complete company address..."
                      data-testid="textarea-edit-company-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
                data-testid="button-save-edit"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}