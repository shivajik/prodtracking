import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Package, Database } from "lucide-react";
import { seedCropsAndVarieties } from "@/utils/seed-data";
import type { Crop, Variety } from "@shared/schema";

type CropWithVarieties = Crop & { varieties: Variety[] };

export default function CropVarietyManagement() {
  const { toast } = useToast();
  const [showAddCropDialog, setShowAddCropDialog] = useState(false);
  const [showAddVarietyDialog, setShowAddVarietyDialog] = useState(false);
  const [newCropName, setNewCropName] = useState("");
  const [newVarietyCode, setNewVarietyCode] = useState("");
  const [selectedCropId, setSelectedCropId] = useState("");
  const [isSeedingLoading, setIsSeedingLoading] = useState(false);

  const { data: cropsWithVarieties, isLoading } = useQuery<CropWithVarieties[]>({
    queryKey: ["/api/crops"],
  });

  const createCropMutation = useMutation({
    mutationFn: (name: string) => apiRequest("/api/crops", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      setShowAddCropDialog(false);
      setNewCropName("");
      toast({
        title: "Crop created",
        description: "The new crop has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating crop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCropMutation = useMutation({
    mutationFn: (cropId: string) => apiRequest(`/api/crops/${cropId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({
        title: "Crop deleted",
        description: "The crop and all its varieties have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting crop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createVarietyMutation = useMutation({
    mutationFn: ({ code, cropId }: { code: string; cropId: string }) => 
      apiRequest("/api/varieties", {
        method: "POST",
        body: JSON.stringify({ code, cropId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      setShowAddVarietyDialog(false);
      setNewVarietyCode("");
      setSelectedCropId("");
      toast({
        title: "Variety created",
        description: "The new variety has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating variety",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVarietyMutation = useMutation({
    mutationFn: (varietyId: string) => apiRequest(`/api/varieties/${varietyId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({
        title: "Variety deleted",
        description: "The variety has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting variety",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCrop = () => {
    if (!newCropName.trim()) {
      toast({
        title: "Validation error",
        description: "Crop name is required.",
        variant: "destructive",
      });
      return;
    }
    createCropMutation.mutate(newCropName.trim());
  };

  const handleCreateVariety = () => {
    if (!newVarietyCode.trim() || !selectedCropId) {
      toast({
        title: "Validation error",
        description: "Both variety code and crop selection are required.",
        variant: "destructive",
      });
      return;
    }
    createVarietyMutation.mutate({ 
      code: newVarietyCode.trim(), 
      cropId: selectedCropId 
    });
  };

  const handleSeedData = async () => {
    setIsSeedingLoading(true);
    try {
      await seedCropsAndVarieties();
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({
        title: "Database seeded successfully!",
        description: "All crops and varieties have been added to the database.",
      });
    } catch (error) {
      toast({
        title: "Seeding failed",
        description: "Failed to seed the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSeedingLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading crops and varieties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Crop & Variety Management</h2>
          <p className="text-muted-foreground">
            Manage crops and their varieties for product forms
          </p>
        </div>
        <div className="space-x-2">
          {(!cropsWithVarieties || cropsWithVarieties.length === 0) && (
            <Button
              onClick={handleSeedData}
              disabled={isSeedingLoading}
              variant="default"
              data-testid="button-seed-data"
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeedingLoading ? "Seeding..." : "Seed Initial Data"}
            </Button>
          )}
          <Button
            onClick={() => setShowAddVarietyDialog(true)}
            variant="outline"
            data-testid="button-add-variety"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variety
          </Button>
          <Button
            onClick={() => setShowAddCropDialog(true)}
            data-testid="button-add-crop"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Crop
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {cropsWithVarieties?.map((crop) => (
          <Card key={crop.id} data-testid={`card-crop-${crop.id}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {crop.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {crop.varieties.length} varieties
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteCropMutation.mutate(crop.id)}
                  disabled={deleteCropMutation.isPending}
                  data-testid={`button-delete-crop-${crop.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Crop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {crop.varieties.map((variety) => (
                  <Badge
                    key={variety.id}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                    data-testid={`badge-variety-${variety.id}`}
                  >
                    {variety.code}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => deleteVarietyMutation.mutate(variety.id)}
                      disabled={deleteVarietyMutation.isPending}
                      data-testid={`button-delete-variety-${variety.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {crop.varieties.length === 0 && (
                  <p className="text-sm text-muted-foreground">No varieties added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {!cropsWithVarieties?.length && (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No crops found</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first crop to manage varieties.
              </p>
              <Button onClick={() => setShowAddCropDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Crop
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Crop Dialog */}
      <Dialog open={showAddCropDialog} onOpenChange={setShowAddCropDialog}>
        <DialogContent data-testid="dialog-add-crop">
          <DialogHeader>
            <DialogTitle>Add New Crop</DialogTitle>
            <DialogDescription>
              Enter the name of the new crop. You can add varieties to it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crop-name">Crop Name</Label>
              <Input
                id="crop-name"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                placeholder="e.g., Maize, Cotton, Wheat"
                data-testid="input-crop-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCropDialog(false);
                setNewCropName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCrop}
              disabled={createCropMutation.isPending}
              data-testid="button-create-crop"
            >
              {createCropMutation.isPending ? "Creating..." : "Create Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variety Dialog */}
      <Dialog open={showAddVarietyDialog} onOpenChange={setShowAddVarietyDialog}>
        <DialogContent data-testid="dialog-add-variety">
          <DialogHeader>
            <DialogTitle>Add New Variety</DialogTitle>
            <DialogDescription>
              Add a new variety code to an existing crop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="crop-select">Select Crop</Label>
              <Select value={selectedCropId} onValueChange={setSelectedCropId}>
                <SelectTrigger data-testid="select-crop-for-variety">
                  <SelectValue placeholder="Choose a crop" />
                </SelectTrigger>
                <SelectContent>
                  {cropsWithVarieties?.map((crop) => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="variety-code">Variety Code</Label>
              <Input
                id="variety-code"
                value={newVarietyCode}
                onChange={(e) => setNewVarietyCode(e.target.value)}
                placeholder="e.g., GOLD-28, JS-335, BDN-711"
                data-testid="input-variety-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddVarietyDialog(false);
                setNewVarietyCode("");
                setSelectedCropId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariety}
              disabled={createVarietyMutation.isPending}
              data-testid="button-create-variety"
            >
              {createVarietyMutation.isPending ? "Creating..." : "Create Variety"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}