import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, List, Eye, Home, FileCheck, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProductForm from "@/components/product-form";
import ProductEditDialog from "@/components/product-edit-dialog";
import { Product } from "@shared/schema";
import Sidebar, { SidebarItem } from "@/components/sidebar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<Product> }) => {
      return apiRequest("PATCH", `/api/products/${productId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowEditDialog(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
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

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      },
    });
  };

  if (user?.role === "admin") {
    setLocation("/admin");
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-IN');
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
      id: "submit",
      label: "Submit Product",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => setActiveTab("submit"),
      active: activeTab === "submit",
    },
    {
      id: "products",
      label: "My Products",
      icon: <List className="h-4 w-4" />,
      onClick: () => setActiveTab("products"),
      badge: products.length,
      active: activeTab === "products",
    },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Plus className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{products.filter(p => p.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{products.filter(p => p.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved Products</p>
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
        subtitle="Product Tracking System"
        userName={user?.username || "Operator"}
        items={sidebarItems}
        onLogout={handleLogout}
        isLoggingOut={logoutMutation.isPending}
      />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="container mx-auto p-6">
          
          {activeTab === "overview" && renderOverview()}
          
          {activeTab === "submit" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Submit Product</h2>
              <ProductForm onSuccess={() => refetch()} />
            </div>
          )}
          
          {activeTab === "products" && (
            <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-foreground">My Submitted Products</h2>
              <Button onClick={() => refetch()} variant="outline" size="sm" data-testid="button-refresh">
                Refresh
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Products Submitted</h3>
                  <p className="text-muted-foreground mb-4">You haven't submitted any products yet.</p>
                  <Button variant="outline" onClick={() => setActiveTab("submit")} data-testid="button-submit-first">
                    Submit Your First Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow" data-testid={`card-product-${product.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                          {product.product}
                        </CardTitle>
                        <Badge 
                          className={`${getStatusColor(product.status)} text-white text-xs`}
                          data-testid={`status-${product.status}`}
                        >
                          {product.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Unique ID:</span> {product.uniqueId}</p>
                        <p><span className="font-medium">MRP:</span> ₹{product.mrp}</p>
                        <p><span className="font-medium">Net Qty:</span> {product.netQty}</p>
                        <p><span className="font-medium">Batch:</span> {product.lotBatch}</p>
                        <p><span className="font-medium">Submitted:</span> {product.submissionDate ? formatDate(product.submissionDate) : 'N/A'}</p>
                        {product.status === "approved" && product.approvalDate && (
                          <p><span className="font-medium">Approved:</span> {formatDate(product.approvalDate)}</p>
                        )}
                        {product.status === "rejected" && product.rejectionReason && (
                          <p className="text-red-600"><span className="font-medium">Reason:</span> {product.rejectionReason}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        {(product.status === "pending" || product.status === "rejected") && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(product)}
                            className="flex-1"
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {product.status === "approved" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => window.open(`/track/${product.uniqueId}`, '_blank')}
                            className="flex-1"
                            data-testid={`button-view-${product.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Public
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
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
