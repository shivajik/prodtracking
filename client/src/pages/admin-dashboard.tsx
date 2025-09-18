import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Clock, CheckCircle, XCircle, List, Eye, Check, X, Users, Plus, BarChart3, Home, Download, Search, Upload, Grid3X3, LayoutList, Edit } from "lucide-react";
import { Product, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProductCard from "@/components/product-card";
import ProductEditDialog from "@/components/product-edit-dialog";
import CropVarietyManagement from "@/components/crop-variety-management";
import Sidebar, { SidebarItem } from "@/components/sidebar";
import UrlManagement from "@/components/URLManagement";

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateUserData = z.infer<typeof createUserSchema>;

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const createUserForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  if (user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: pendingProducts = [], isLoading: pendingLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", "pending", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "pending" });
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: approvedProducts = [], isLoading: approvedLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", "approved", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "approved" });
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: rejectedProducts = [], isLoading: rejectedLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", "rejected", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "rejected" });
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allProducts = [], isLoading: allLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const url = params.toString() ? `/api/products?${params}` : "/api/products";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const approveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("PATCH", `/api/products/${productId}/status`, {
        status: "approved",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product approved",
        description: "The product has been successfully approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: async ({ productId, reason }: { productId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/products/${productId}/status`, {
        status: "rejected",
        rejectionReason: reason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast({
        title: "Product rejected",
        description: "The product has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateUserDialog(false);
      createUserForm.reset();
      toast({
        title: "User created",
        description: "Operator account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editProductMutation = useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<Product> }) => {
      const res = await apiRequest("PATCH", `/api/products/${productId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowEditDialog(false);
      setSelectedProduct(null);
      toast({
        title: "Product updated",
        description: "The product has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (updates: Partial<Product>) => {
    if (selectedProduct) {
      editProductMutation.mutate({
        productId: selectedProduct.id,
        updates
      });
    }
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: <Home className="h-4 w-4" />,
      onClick: () => setActiveTab("overview"),
      active: activeTab === "overview",
    },
    {
      id: "all",
      label: "All Products",
      icon: <List className="h-4 w-4" />,
      onClick: () => setActiveTab("all"),
      active: activeTab === "all",
    },
    {
      id: "pending",
      label: "Pending Products",
      icon: <Clock className="h-4 w-4" />,
      onClick: () => setActiveTab("pending"),
      badge: pendingProducts.length > 0 ? pendingProducts.length : undefined,
      active: activeTab === "pending",
    },
    {
      id: "approved",
      label: "Approved Products",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => setActiveTab("approved"),
      badge: approvedProducts.length > 0 ? approvedProducts.length : undefined,
      active: activeTab === "approved",
    },
    {
      id: "rejected",
      label: "Rejected Products",
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => setActiveTab("rejected"),
      badge: rejectedProducts.length > 0 ? rejectedProducts.length : undefined,
      active: activeTab === "rejected",
    },
    {
      id: "users",
      label: "User Management",
      icon: <Users className="h-4 w-4" />,
      onClick: () => setActiveTab("users"),
      active: activeTab === "users",
    },
    {
      id: "crops",
      label: "Crop & Variety Management",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => setActiveTab("crops"),
      active: activeTab === "crops",
    },
    {
      id: "url",
      label: "URL Management",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => setActiveTab("url"),
      active: activeTab === "url",
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      },
    });
  };

  const handleApprove = (productId: string) => {
    approveProductMutation.mutate(productId);
  };

  const handleReject = (product: Product) => {
    setSelectedProduct(product);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (selectedProduct && rejectionReason.trim()) {
      rejectProductMutation.mutate({
        productId: selectedProduct.id,
        reason: rejectionReason,
      });
    }
  };

  const handleViewPublicPage = (uniqueId: string) => {
    window.open(`/track/${uniqueId}`, "_blank");
  };

  // Generate QR code data URL for a unique ID
  const generateQRCode = async (uniqueId: string): Promise<string> => {
    try {
      const QRCode = await import('qrcode');
      const trackingUrl = `${window.location.origin}/track/${uniqueId}`;
      return await QRCode.toDataURL(trackingUrl, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
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

  // Excel Export functionality with QR codes and proper formatting
  const exportToExcel = async (products: Product[]) => {
    if (products.length === 0) {
      toast({
        title: "No Data",
        description: "No products available to export.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating Export",
      description: "Creating QR codes and preparing Excel file...",
    });

    try {
      // Dynamic import for ExcelJS
      const { Workbook } = await import('exceljs');
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Products');

      // Define headers with proper styling - including all new fields
      const headers = [
        "Unique ID",
        "Product Name", 
        "Brand",
        "Company",
        "Description",
        "MRP (₹)",
        "Unit Sale Price (₹)",
        "Net Quantity",
        "Pack Size",
        "No. of Packets",
        "Total Packets",
        "Lot/Batch",
        "Lot No",
        // "Stack No",
        "Manufacturing Date",
        "Expiry Date",
        "Date of Test",
        "Customer Care",
        "Email",
        "Company Address",
        "Marketed By",
        "Brochure URL",
        "Brochure Filename",
        // "Location",
        "From",
        "To",
        // "Marketing Code",
        // "Unit of Measure Code",
        "Market Code",
        "Product Code",
        // "Stage Code",
        // "Remaining Quantity",
        // "Normal Germination (%)",
        // "Germination Average",
        "GB",
        // "GOT Percent",
        // "GOT Average",
        "Status",
        "Submission Date",
        "Approval Date",
        "Rejection Reason",
        "QR Code",
        "Tracking URL"
      ];

      // Add headers with styling
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 45;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF366092' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Set column widths for better spacing - dynamically sized to match headers
      const columnWidths = [15, 25, 20, 25, 40, 12, 12, 15, 12, 12, 12, 15, 15, 18, 15, 15, 20, 25, 35, 25, 30, 25, 15, 15, 15, 15, 12, 12, 15, 15, 30, 20, 40];
      headers.forEach((_, index) => {
        const width = columnWidths[index] || 15; // Use default width of 15 if not specified
        worksheet.getColumn(index + 1).width = width;
      });

      // Add data rows with QR codes
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const trackingUrl = `${window.location.origin}/track/${product.uniqueId}`;
        
        // Generate QR code as buffer for embedding
        const qrCodeDataUrl = await generateQRCode(product.uniqueId || '');
        
        const rowData = [
          product.uniqueId || "",
          product.product || "",
          product.brand || "",
          product.company || "",
          product.description || "",
          product.mrp || "",
          product.unitSalePrice || "",
          product.netQty || "",
          product.packSize || "",
          product.noOfPkts || "",
          product.totalPkts || "",
          product.lotBatch || "",
          product.lotNo || "",
          // product.stackNo || "",
          product.mfgDate || "",
          product.expiryDate || "",
          product.dateOfTest || "",
          product.customerCare || "",
          product.email || "",
          product.companyAddress || "",
          product.marketedBy || "",
          product.brochureUrl || "",
          product.brochureFilename || "",
          // product.location || "",
          product.from || "",
          product.to || "",
          // product.marketingCode || "",
          // product.unitOfMeasureCode || "",
          product.marketCode || "",
          product.prodCode || "",
          // product.stageCode || "",
          // product.remainingQuantity || "",
          // product.normalGermination || "",
          // product.gerAve || "",
          product.gb || "",
          // product.gotPercent || "",
          // product.gotAve || "",
          product.status || "",
          product.submissionDate ? new Date(product.submissionDate).toLocaleDateString() : "",
          product.approvalDate ? new Date(product.approvalDate).toLocaleDateString() : "",
          product.rejectionReason || "",
          "", // QR Code column - will be replaced with image
          trackingUrl
        ];

        const row = worksheet.addRow(rowData);
        
        // Add borders to all cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });

        // Dynamically find QR Code and Tracking URL column indices
        const qrCodeColIndex = headers.indexOf("QR Code") + 1; // 1-indexed for Excel
        const trackingUrlColIndex = headers.indexOf("Tracking URL") + 1; // 1-indexed for Excel

        // Add QR code image if available
        if (qrCodeDataUrl && qrCodeColIndex > 0) {
          try {
            // Extract base64 data from data URL
            const base64Data = qrCodeDataUrl.split(',')[1];
            
            const imageId = workbook.addImage({
              base64: base64Data,
              extension: 'png',
            });

            // Add image to the QR Code column (dynamic column, row index + 2 because header is row 1)
            worksheet.addImage(imageId, {
              tl: { col: qrCodeColIndex - 1, row: i + 1 }, // 0-indexed column for image positioning
              ext: { width: 80, height: 80 }
            });

            // Set row height to accommodate QR code
            row.height = 80;
          } catch (error) {
            console.error('Error adding QR code image:', error);
            // Fallback to text if image fails
            if (qrCodeColIndex > 0) {
              row.getCell(qrCodeColIndex).value = "QR Code Error";
            }
          }
        }

        // Make tracking URL a clickable hyperlink
        if (trackingUrlColIndex > 0) {
          const trackingCell = row.getCell(trackingUrlColIndex);
          trackingCell.value = {
            text: trackingUrl,
            hyperlink: trackingUrl
          };
          trackingCell.font = { color: { argb: 'FF0066CC' }, underline: true };
        }
      }

      // Freeze the header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Generate Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create and download file
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `green-gold-seeds-products-${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${products.length} products with QR codes to Excel file.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };


  const renderOverview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingProducts.length}</p>
                <p className="text-sm text-muted-foreground">Pending Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{approvedProducts.length}</p>
                <p className="text-sm text-muted-foreground">Approved Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{rejectedProducts.length}</p>
                <p className="text-sm text-muted-foreground">Rejected Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        title="Green Gold Seeds"
        subtitle="Admin Panel"
        userName={user?.username || "Admin"}
        items={sidebarItems}
        onLogout={handleLogout}
        isLoggingOut={logoutMutation.isPending}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="container mx-auto p-6">

          {activeTab === "overview" && renderOverview()}
          
          {["pending", "approved", "rejected", "all", "users"].map((tab) => 
            activeTab === tab && (
              <div key={tab} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-foreground capitalize">
                    {tab === "all" ? "All Products" : tab === "users" ? "User Management" : `${tab} Products`}
                  </h2>
                  <div className="flex items-center gap-4">
                    {/* View Toggle for Product Tabs */}
                    {tab !== "users" && (
                      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        <Button
                          size="sm"
                          variant={viewMode === "card" ? "secondary" : "ghost"}
                          onClick={() => setViewMode("card")}
                          data-testid="button-card-view"
                          className="h-8 px-3"
                        >
                          <Grid3X3 className="h-4 w-4 mr-1" />
                          Card
                        </Button>
                        <Button
                          size="sm"
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          onClick={() => setViewMode("list")}
                          data-testid="button-list-view"
                          className="h-8 px-3"
                        >
                          <LayoutList className="h-4 w-4 mr-1" />
                          List View
                        </Button>
                      </div>
                    )}
                    
                    {/* User Management Button */}
                    {tab === "users" && (
                      <Button 
                        onClick={() => setShowCreateUserDialog(true)}
                        data-testid="button-create-user"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Operator
                      </Button>
                    )}
                    
                    {/* All Products Action Buttons */}
                    {tab === "all" && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setShowImportDialog(true)}
                          data-testid="button-import"
                          variant="outline"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import
                        </Button>
                        <Button 
                          onClick={() => exportToExcel(allProducts)}
                          data-testid="button-export-excel"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export All
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Input for Products */}
                {tab !== "users" && (
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by product, batch, company, brand..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                )}

                {tab === "users" ? (
                  usersLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading users...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No users found.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {users.map((user) => (
                        <Card key={user.id} data-testid={`card-user-${user.id}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-semibold text-foreground" data-testid="text-username">
                                  {user.username}
                                </h3>
                                <p className="text-sm text-muted-foreground" data-testid="text-email">
                                  {user.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <Badge 
                                variant={user.role === "admin" ? "default" : "secondary"}
                                data-testid="badge-role"
                              >
                                {user.role}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                // ) : tab === "crops" ? (
                //   <CropVarietyManagement />
                ) : (
                  (() => {
                    const isLoading = tab === "pending" ? pendingLoading : 
                                     tab === "approved" ? approvedLoading : 
                                     tab === "rejected" ? rejectedLoading : 
                                     tab === "all" ? allLoading : false;
                    const products = tab === "pending" ? pendingProducts : 
                                    tab === "approved" ? approvedProducts : 
                                    tab === "rejected" ? rejectedProducts : 
                                    tab === "all" ? allProducts : [];
                    
                    if (isLoading) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Loading products...</p>
                        </div>
                      );
                    }
                    
                    if (products.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No {tab === "all" ? "" : tab} products found.
                          </p>
                        </div>
                      );
                    }
                    
                    return viewMode === "card" ? (
                      // Card View - Multiple cards per row on desktop
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {products.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onApprove={tab === "pending" ? () => handleApprove(product.id) : undefined}
                            onReject={tab === "pending" ? () => handleReject(product) : undefined}
                            onViewPublic={() => handleViewPublicPage(product.uniqueId)}
                            onEdit={() => handleEdit(product)}
                            isLoading={approveProductMutation.isPending || rejectProductMutation.isPending || editProductMutation.isPending}
                          />
                        ))}
                      </div>
                    ) : (
                      // List View - Horizontal layout with smaller height
                      <div className="space-y-4">
                        {products.map((product) => (
                          <div key={product.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow" data-testid={`row-product-${product.id}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-foreground truncate" data-testid="text-product-name">
                                      {product.product}
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                      <span data-testid="text-brand">{product.marketCode}</span> • 
                                      <span data-testid="text-company"> {product.company}</span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="text-right">
                                      <p className="font-medium text-foreground">MRP: ₹{product.mrp}</p>
                                      <p className="text-xs">Qty: {product.netQty}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-foreground">Batch: {product.lotBatch}</p>
                                      <p className="text-xs">ID: {product.uniqueId}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div data-testid="badge-status">
                                  {(() => {
                                    switch (product.status) {
                                      case "approved":
                                        return <Badge className="bg-primary/10 text-primary">Approved</Badge>;
                                      case "rejected":
                                        return <Badge variant="destructive">Rejected</Badge>;
                                      default:
                                        return <Badge variant="secondary">Pending</Badge>;
                                    }
                                  })()}
                                </div>
                                
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedProduct(product)}
                                    data-testid="button-view-details"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewPublicPage(product.uniqueId)}
                                    data-testid="button-view-public"
                                  >
                                    View Public Page
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(product)}
                                    data-testid="button-edit"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  {tab === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApprove(product.id)}
                                        disabled={approveProductMutation.isPending}
                                        data-testid="button-approve"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReject(product)}
                                        disabled={rejectProductMutation.isPending}
                                        data-testid="button-reject"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )
          )}
            {/* Separate rendering for crops tab without heading and search */}
          {activeTab === "crops" && (
            <CropVarietyManagement />
          )}
          {activeTab === "url" && (
            < UrlManagement />
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this product. This will be sent to the operator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                data-testid="textarea-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || rejectProductMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectProductMutation.isPending ? "Rejecting..." : "Reject Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>Create Operator Account</DialogTitle>
            <DialogDescription>
              Create a new operator account for product submission.
            </DialogDescription>
          </DialogHeader>
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField
                control={createUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-create-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-create-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowCreateUserDialog(false)}
                  data-testid="button-cancel-create-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-confirm-create-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Products Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent data-testid="dialog-import">
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
                data-testid="input-import-file"
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
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || importProductsMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importProductsMutation.isPending ? "Importing..." : "Import Products"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      {selectedProduct && (
        <ProductEditDialog
          product={selectedProduct}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleSaveEdit}
          isLoading={editProductMutation.isPending}
        />
      )}
    </div>
  );
}
