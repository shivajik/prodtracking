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
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { CloudUpload, Send, RotateCcw } from "lucide-react";

const productFormSchema = insertProductSchema.omit({
  submittedBy: true,
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSuccess?: () => void;
}

export default function ProductForm({ onSuccess }: ProductFormProps = {}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Product Information Entry</CardTitle>
        <p className="text-muted-foreground">Fill in all required product details for approval</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  );
}
