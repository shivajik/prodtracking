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
import { Clock, CheckCircle, XCircle, List, Eye, Check, X, Users, Plus, BarChart3, Home } from "lucide-react";
import { Product, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProductCard from "@/components/product-card";
import ProductEditDialog from "@/components/product-edit-dialog";
import Sidebar, { SidebarItem } from "@/components/sidebar";

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
    queryKey: ["/api/products", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/products?status=pending", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: approvedProducts = [], isLoading: approvedLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", "approved"],
    queryFn: async () => {
      const res = await fetch("/api/products?status=approved", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: rejectedProducts = [], isLoading: rejectedLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", "rejected"],
    queryFn: async () => {
      const res = await fetch("/api/products?status=rejected", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allProducts = [], isLoading: allLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
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
      id: "pending",
      label: "Pending Products",
      icon: <Clock className="h-4 w-4" />,
      onClick: () => setActiveTab("pending"),
      badge: pendingProducts.length,
      active: activeTab === "pending",
    },
    {
      id: "approved",
      label: "Approved Products",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => setActiveTab("approved"),
      active: activeTab === "approved",
    },
    {
      id: "rejected",
      label: "Rejected Products",
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => setActiveTab("rejected"),
      active: activeTab === "rejected",
    },
    {
      id: "all",
      label: "All Products",
      icon: <List className="h-4 w-4" />,
      onClick: () => setActiveTab("all"),
      active: activeTab === "all",
    },
    {
      id: "users",
      label: "User Management",
      icon: <Users className="h-4 w-4" />,
      onClick: () => setActiveTab("users"),
      active: activeTab === "users",
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
                  {tab === "users" && (
                    <Button 
                      onClick={() => setShowCreateUserDialog(true)}
                      data-testid="button-create-user"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Operator
                    </Button>
                  )}
                </div>

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
                    
                    return (
                      <div className="grid gap-6">
                        {products.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onApprove={tab === "pending" ? () => handleApprove(product.id) : undefined}
                            onReject={tab === "pending" ? () => handleReject(product) : undefined}
                            onViewPublic={product.status === "approved" ? () => handleViewPublicPage(product.uniqueId) : undefined}
                            onEdit={() => handleEdit(product)}
                            isLoading={approveProductMutation.isPending || rejectProductMutation.isPending || editProductMutation.isPending}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )
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
