import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Product } from "@shared/schema";
import { z } from "zod";

const editProductSchema = z.object({
  company: z.string().min(1, "Company is required"),
  brand: z.string().min(1, "Brand is required"),
  product: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  mrp: z.string().min(1, "MRP is required"),
  netQty: z.string().min(1, "Net quantity is required"),
  lotBatch: z.string().min(1, "Lot/Batch is required"),
  mfgDate: z.string().min(1, "Manufacturing date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  customerCare: z.string().min(1, "Customer care is required"),
  email: z.string().email("Invalid email format"),
  companyAddress: z.string().min(1, "Company address is required"),
  marketedBy: z.string().min(1, "Marketed by is required"),
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
  const editForm = useForm<EditProductData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      company: product.company || "",
      brand: product.brand || "",
      product: product.product || "",
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
    },
  });

  const handleSave = (data: EditProductData) => {
    onSave(data);
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
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-product" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={editForm.control}
                name="lotBatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot/Batch Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-lot-batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="mfgDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturing Date</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD" data-testid="input-edit-mfg-date" />
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
                      <Input {...field} placeholder="YYYY-MM-DD" data-testid="input-edit-expiry-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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