import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Calendar, Package, Edit } from "lucide-react";
import { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onApprove?: () => void;
  onReject?: () => void;
  onViewPublic?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
}

export default function ProductCard({ 
  product, 
  onApprove, 
  onReject, 
  onViewPublic, 
  onEdit,
  isLoading = false 
}: ProductCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-primary/10 text-primary">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="shadow-sm" data-testid={`card-product-${product.id}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" data-testid="text-product-name">
              {product.product}
            </h3>
            <p className="text-sm text-muted-foreground">
              <span data-testid="text-brand">{product.brand}</span> • 
              <span data-testid="text-company"> {product.company}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Submitted on {formatDate(product.submissionDate || "")} • 
              ID: <span className="font-mono" data-testid="text-unique-id">{product.uniqueId}</span>
            </p>
          </div>
          <div data-testid="badge-status">
            {getStatusBadge(product.status)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-foreground">MRP</p>
            <p className="text-sm text-muted-foreground" data-testid="text-mrp">₹{product.mrp}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Net Quantity</p>
            <p className="text-sm text-muted-foreground" data-testid="text-net-qty">{product.netQty}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Batch No</p>
            <p className="text-sm text-muted-foreground font-mono" data-testid="text-batch-no">{product.lotBatch}</p>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid="text-description">
            {product.description}
          </p>
        )}

        {product.status === "rejected" && product.rejectionReason && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
            <p className="text-sm text-destructive/80" data-testid="text-rejection-reason">
              {product.rejectionReason}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // TODO: Implement view details modal or navigation
              console.log("View details for", product.id);
            }}
            data-testid="button-view-details"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {onViewPublic && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewPublic}
              data-testid="button-view-public"
            >
              <Package className="h-4 w-4 mr-2" />
              View Public Page
            </Button>
          )}
          
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onEdit}
              disabled={isLoading}
              data-testid="button-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          
          {onReject && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onReject}
              disabled={isLoading}
              data-testid="button-reject"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}
          
          {onApprove && (
            <Button 
              size="sm"
              onClick={onApprove}
              disabled={isLoading}
              data-testid="button-approve"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
