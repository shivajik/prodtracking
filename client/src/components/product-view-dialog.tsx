import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product } from "@shared/schema";
import { Calendar, Package, FileText, MapPin, User } from "lucide-react";

interface ProductViewDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductViewDialog({
  product,
  open,
  onOpenChange,
}: ProductViewDialogProps) {
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "Not specified";
    return `₹${price}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-product-view">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl" data-testid="dialog-title">
                {product.product}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Product ID: {product.uniqueId}
              </DialogDescription>
            </div>
            {getStatusBadge(product.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Product Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="font-medium" data-testid="view-company">{product.company || "Not specified"}</p>
              </div>
              {/* {product.classType && ( */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class</p>
                  <p className="font-medium capitalize" data-testid="text-class-type">
                    {product.classType || "Not specified"}
                  </p>
                </div>
              {/* )} */}
              {/* <div>
                <p className="text-sm font-medium text-muted-foreground">Brand</p>
                <p className="font-medium" data-testid="view-brand">{product.brand || "Not specified"}</p>
              </div> */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variety</p>
                <p className="font-medium font-mono" data-testid="view-market-code">{product.marketCode || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Product Code</p>
                <p className="font-medium font-mono" data-testid="view-prod-code">{product.prodCode || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">MRP</p>
                <p className="font-medium text-lg" data-testid="view-mrp">{formatPrice(product.mrp)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unit Sale Price (₹) Per Kg.</p>
                <p className="font-medium" data-testid="view-unit-sale-price">{formatPrice(product.unitSalePrice)}</p>
              </div>
            </div>

            {product.description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm" data-testid="view-description">{product.description}</p>
              </div>
            )}
          </section>

          <Separator />

          {/* Packaging & Quantity Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Packaging & Quantity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Quantity</p>
                <p className="font-medium" data-testid="view-net-qty">{product.netQty || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pack Size (KG)</p>
                <p className="font-medium" data-testid="view-pack-size">{product.packSize || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No. of Packets</p>
                <p className="font-medium" data-testid="view-no-of-pkts">{product.noOfPkts || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Packets</p>
                <p className="font-medium" data-testid="view-total-pkts">{product.totalPkts || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Label No. From</p>
                <p className="font-medium" data-testid="view-from">{product.from || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Label No. To</p>
                <p className="font-medium" data-testid="view-to">{product.to || "Not specified"}</p>
              </div>
              {/* <div>
                <p className="text-sm font-medium text-muted-foreground">GB</p>
                <p className="font-medium" data-testid="view-gb">{product.gb || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stack Number</p>
                <p className="font-medium" data-testid="view-stack-no">{product.stackNo || "Not specified"}</p>
              </div> */}
            </div>
          </section>

          <Separator />

          {/* Batch & Date Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Batch & Date Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lot/Batch</p>
                <p className="font-medium font-mono" data-testid="view-lot-batch">{product.lotBatch || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lot Number</p>
                <p className="font-medium font-mono" data-testid="view-lot-no">{product.lotNo || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Packing</p>
                <p className="font-medium" data-testid="view-mfg-date">{(product.mfgDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valid Upto</p>
                <p className="font-medium" data-testid="view-expiry-date">{(product.expiryDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Test</p>
                <p className="font-medium" data-testid="view-date-of-test">{(product.dateOfTest)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                <p className="font-medium" data-testid="view-submission-date">{formatDate(product.submissionDate)}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Contact & Company Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Contact & Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Care</p>
                <p className="font-medium" data-testid="view-customer-care">{product.customerCare || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="view-email">{product.email || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marketed By</p>
                <p className="font-medium" data-testid="view-marketed-by">{product.marketedBy || "Not specified"}</p>
              </div>
            </div>
            
            {product.companyAddress && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Company Address</p>
                <p className="text-sm" data-testid="view-company-address">{product.companyAddress}</p>
              </div>
            )}
          </section>

          {/* Comments about hidden fields that were requested to be commented out */}
          {/* 
          <Separator />
          
          <section>
            <h3 className="text-lg font-semibold mb-3">Quality & Testing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Normal Germination (%)</p>
                <p className="font-medium" data-testid="view-normal-germination">{product.normalGermination || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Germination Average</p>
                <p className="font-medium" data-testid="view-ger-ave">{product.gerAve || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">GOT Percent</p>
                <p className="font-medium" data-testid="view-got-percent">{product.gotPercent || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">GOT Average</p>
                <p className="font-medium" data-testid="view-got-ave">{product.gotAve || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unit of Measure Code</p>
                <p className="font-medium" data-testid="view-unit-of-measure-code">{product.unitOfMeasureCode || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stage Code</p>
                <p className="font-medium" data-testid="view-stage-code">{product.stageCode || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="font-medium" data-testid="view-location">{product.location || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Remaining Quantity</p>
                <p className="font-medium" data-testid="view-remaining-quantity">{product.remainingQuantity || "Not specified"}</p>
              </div>
            </div>
          </section>
          */}

          {/* Additional Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Remaining Quantity</p>
                <p className="font-medium" data-testid="view-remaining-quantity">{product.remainingQuantity || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Label Number</p>
                <p className="font-medium" data-testid="view-label-number">{product.labelNumber || "Not specified"}</p>
              </div>
            </div>
          </section>

          {/* Status Information */}
          {(product.status === "rejected" && product.rejectionReason) && (
            <>
              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 text-destructive">Rejection Information</h3>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive mb-2">Rejection Reason:</p>
                  <p className="text-sm text-destructive/80" data-testid="view-rejection-reason">
                    {product.rejectionReason}
                  </p>
                </div>
              </section>
            </>
          )}

          {(product.status === "approved" && product.approvalDate) && (
            <>
              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">Approval Information</h3>
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Approved Date:</p>
                  <p className="text-sm text-green-700 dark:text-green-400" data-testid="view-approval-date">
                    {formatDate(product.approvalDate)}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Brochure Information */}
          {product.brochureUrl && (
            <>
              <Separator />
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documents
                </h3>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brochure</p>
                  <a 
                    href={product.brochureUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                    data-testid="link-brochure"
                  >
                    {product.brochureFilename || "View Brochure"}
                  </a>
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}