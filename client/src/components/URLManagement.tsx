import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Edit, Link as LinkIcon, Search } from "lucide-react";
import type { Crop, Variety, CropVarietyUrl } from "@shared/schema";
import { insertCropVarietyUrlSchema } from "@shared/schema";

type CropWithVarieties = Crop & { varieties: Variety[] };

// Form validation schemas
const urlFormSchema = insertCropVarietyUrlSchema.extend({
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
});

const editUrlFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
});

export default function UrlManagement() {
  const { toast } = useToast();
  const [showAddUrlDialog, setShowAddUrlDialog] = useState(false);
  const [showEditUrlDialog, setShowEditUrlDialog] = useState(false);
  const [selectedUrlForEdit, setSelectedUrlForEdit] = useState<CropVarietyUrl | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // URL form validation
  const urlForm = useForm({
    resolver: zodResolver(urlFormSchema),
    defaultValues: {
      cropId: "",
      varietyId: "",
      url: "",
      description: "",
    },
  });

  const editUrlForm = useForm({
    resolver: zodResolver(editUrlFormSchema),
    defaultValues: {
      url: "",
      description: "",
    },
  });

  // Fetch crops with varieties for dropdown selection
  const { data: cropsWithVarieties, isLoading: cropsLoading } = useQuery<CropWithVarieties[]>({
    queryKey: ["/api/crops"],
  });

  // Fetch crop-variety URLs
  const { data: cropVarietyUrls, isLoading: urlsLoading } = useQuery<CropVarietyUrl[]>({
    queryKey: ["/api/crop-variety-urls"],
  });
  
  const getCropName = (cropId: string) => {
    return cropsWithVarieties?.find(crop => crop.id === cropId)?.name || 'Unknown Crop';
  };

    const getVarietyCode = (varietyId: string) => {
    for (const crop of cropsWithVarieties || []) {
      const variety = crop.varieties.find(v => v.id === varietyId);
      if (variety) return variety.code;
    }
    return 'Unknown Variety';
  };
  // Filter URLs based on search term
  const filteredUrls = cropVarietyUrls?.filter((urlEntry) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const cropName = getCropName(urlEntry.cropId).toLowerCase();
    const varietyCode = getVarietyCode(urlEntry.varietyId).toLowerCase();
    const url = urlEntry.url.toLowerCase();
    const description = urlEntry.description?.toLowerCase() || "";
    
    return cropName.includes(searchLower) || 
           varietyCode.includes(searchLower) || 
           url.includes(searchLower) || 
           description.includes(searchLower);
  }) || [];

  // URL management mutations
  const createCropVarietyUrlMutation = useMutation({
    mutationFn: ({ cropId, varietyId, url, description }: { cropId: string; varietyId: string; url: string; description?: string }) =>
      apiRequest("POST", "/api/crop-variety-urls", { cropId, varietyId, url, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crop-variety-urls"] });
      setShowAddUrlDialog(false);
      urlForm.reset({ cropId: "", varietyId: "", url: "", description: "" });
      toast({
        title: "URL created",
        description: "The crop-variety URL has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating URL",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCropVarietyUrlMutation = useMutation({
    mutationFn: ({ id, url, description }: { id: string; url: string; description?: string }) =>
      apiRequest("PUT", `/api/crop-variety-urls/${id}`, { url, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crop-variety-urls"] });
      setShowEditUrlDialog(false);
      setSelectedUrlForEdit(null);
      editUrlForm.reset({ url: "", description: "" });
      toast({
        title: "URL updated",
        description: "The crop-variety URL has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating URL",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCropVarietyUrlMutation = useMutation({
    mutationFn: (urlId: string) => apiRequest("DELETE", `/api/crop-variety-urls/${urlId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crop-variety-urls"] });
      toast({
        title: "URL deleted",
        description: "The crop-variety URL has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting URL",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions




  // URL management handlers
  const handleAddUrl = (data: z.infer<typeof urlFormSchema>) => {
    createCropVarietyUrlMutation.mutate({
      cropId: data.cropId,
      varietyId: data.varietyId,
      url: data.url,
      description: data.description || undefined,
    });
  };

  const handleEditUrl = (urlEntry: CropVarietyUrl) => {
    setSelectedUrlForEdit(urlEntry);
    editUrlForm.reset({
      url: urlEntry.url,
      description: urlEntry.description || "",
    });
    setShowEditUrlDialog(true);
  };

  const handleUpdateUrl = (data: z.infer<typeof editUrlFormSchema>) => {
    if (!selectedUrlForEdit) return;
    
    updateCropVarietyUrlMutation.mutate({
      id: selectedUrlForEdit.id,
      url: data.url,
      description: data.description || undefined,
    });
  };

  const handleDeleteUrl = (urlId: string) => {
    if (window.confirm("Are you sure you want to delete this URL?")) {
      deleteCropVarietyUrlMutation.mutate(urlId);
    }
  };

  const resetAddUrlForm = () => {
    urlForm.reset({ cropId: "", varietyId: "", url: "", description: "" });
    setShowAddUrlDialog(true);
  };

  if (cropsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading URL management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">URL Management</h2>
          <p className="text-muted-foreground">
            Configure predefined URLs for specific crop-variety combinations
          </p>
        </div>
        <Button onClick={resetAddUrlForm} data-testid="button-add-url">
          <Plus className="h-4 w-4 mr-2" />
          Add URL
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by crop, variety, URL, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-urls"
        />
      </div>

      {/* URL List */}
      {urlsLoading ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading URLs...</p>
        </div>
      ) : filteredUrls.length > 0 ? (
        <div className="grid gap-4">
          {filteredUrls.map((urlEntry) => (
            <Card key={urlEntry.id} data-testid={`card-url-${urlEntry.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{getCropName(urlEntry.cropId)}</Badge>
                      <Badge variant="secondary">{getVarietyCode(urlEntry.varietyId)}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={urlEntry.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline break-all"
                        >
                          {urlEntry.url}
                        </a>
                      </div>
                      {urlEntry.description && (
                        <p className="text-sm text-muted-foreground pl-6">{urlEntry.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUrl(urlEntry)}
                      data-testid={`button-edit-url-${urlEntry.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUrl(urlEntry.id)}
                      disabled={deleteCropVarietyUrlMutation.isPending}
                      data-testid={`button-delete-url-${urlEntry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "No URLs match your search" : "No URLs configured"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Try adjusting your search terms or clear the search to see all URLs."
                : "Add URLs for specific crop-variety combinations to display them instead of file uploads."
              }
            </p>
            {!searchTerm && (
              <Button onClick={resetAddUrlForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add First URL
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add URL Dialog */}
      <Dialog open={showAddUrlDialog} onOpenChange={setShowAddUrlDialog}>
        <DialogContent data-testid="dialog-add-url">
          <DialogHeader>
            <DialogTitle>Add Crop-Variety URL</DialogTitle>
            <DialogDescription>
              Configure a predefined URL for a specific crop-variety combination.
            </DialogDescription>
          </DialogHeader>
          <Form {...urlForm}>
            <div className="space-y-4">
              <FormField
                control={urlForm.control}
                name="cropId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crop</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={(value) => {
                        field.onChange(value);
                        urlForm.setValue("varietyId", ""); // Reset variety when crop changes
                      }}>
                        <SelectTrigger data-testid="select-url-crop">
                          <SelectValue placeholder="Select a crop" />
                        </SelectTrigger>
                        <SelectContent>
                          {cropsWithVarieties?.map((crop) => (
                            <SelectItem key={crop.id} value={crop.id}>
                              {crop.name}
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
                control={urlForm.control}
                name="varietyId"
                render={({ field }) => {
                  const selectedCropId = urlForm.watch("cropId");
                  return (
                    <FormItem>
                      <FormLabel>Variety</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={!selectedCropId}
                        >
                          <SelectTrigger data-testid="select-url-variety">
                            <SelectValue placeholder="Select a variety" />
                          </SelectTrigger>
                          <SelectContent>
                            {cropsWithVarieties
                              ?.find(crop => crop.id === selectedCropId)
                              ?.varieties.map((variety) => (
                                <SelectItem key={variety.id} value={variety.id}>
                                  {variety.code}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={urlForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com/document.pdf"
                        data-testid="input-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* <FormField
                control={urlForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Brief description of the document"
                        data-testid="input-url-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUrlDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={urlForm.handleSubmit(handleAddUrl)}
              disabled={createCropVarietyUrlMutation.isPending}
              data-testid="button-create-url"
            >
              {createCropVarietyUrlMutation.isPending ? "Creating..." : "Create URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit URL Dialog */}
      <Dialog open={showEditUrlDialog} onOpenChange={setShowEditUrlDialog}>
        <DialogContent data-testid="dialog-edit-url">
          <DialogHeader>
            <DialogTitle>Edit Crop-Variety URL</DialogTitle>
            <DialogDescription>
              Update the URL and description for this crop-variety combination.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUrlForm}>
            <div className="space-y-4">
              <div>
                <Label>Crop</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">
                    {selectedUrlForEdit ? getCropName(selectedUrlForEdit.cropId) : ''}
                  </span>
                </div>
              </div>
              <div>
                <Label>Variety</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">
                    {selectedUrlForEdit ? getVarietyCode(selectedUrlForEdit.varietyId) : ''}
                  </span>
                </div>
              </div>
              
              <FormField
                control={editUrlForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com/document.pdf"
                        data-testid="input-edit-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* <FormField
                control={editUrlForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Brief description of the document"
                        data-testid="input-edit-url-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
            </div>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUrlDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editUrlForm.handleSubmit(handleUpdateUrl)}
              disabled={updateCropVarietyUrlMutation.isPending}
              data-testid="button-update-url"
            >
              {updateCropVarietyUrlMutation.isPending ? "Updating..." : "Update URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
