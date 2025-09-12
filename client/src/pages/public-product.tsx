import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, Phone, Mail, Download, Calendar, Package, QrCode } from "lucide-react";
import { Product } from "@shared/schema";

export default function PublicProduct() {
  const { uniqueId } = useParams();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["/api/track", uniqueId],
    queryFn: () => fetch(`/api/track/${uniqueId}`).then(res => {
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    }),
    enabled: !!uniqueId,
  });

  // Generate QR code when product loads
  useEffect(() => {
    const generateQRCode = async () => {
      if (product?.uniqueId) {
        try {
          const QRCode = await import('qrcode');
          const trackingUrl = `${window.location.origin}/track/${product.uniqueId}`;
          const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(qrDataUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    };

    generateQRCode();
  }, [product]);

  const handleDownloadBrochure = () => {
    if (product?.brochureUrl) {
      window.open(product.brochureUrl, "_blank");
    }
  };

  const handleDownloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qr-code-${product?.uniqueId}.png`;
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading product information...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Product Not Found</h1>
            <p className="text-muted-foreground">
              The product you're looking for doesn't exist or hasn't been approved yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Green Gold Seeds Pvt. Ltd.</h1>
                <p className="text-sm text-muted-foreground">Product Tracking System</p>
              </div>
            </div>
            
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>+91 88888 66031</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Mail className="h-4 w-4" />
                <span>greengoldseeds@rediffmail.com</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Product Information */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Product Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2" data-testid="text-product-name">
                  {product.product}
                </CardTitle>
                <p className="text-lg text-muted-foreground mb-4" data-testid="text-product-description">
                  {product.description}
                </p>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-primary/10 text-primary" data-testid="badge-verified">
                    Verified Product
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Product ID: <span className="font-mono" data-testid="text-product-id">{product.uniqueId}</span>
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-primary" data-testid="text-product-price">
                  ₹{product.mrp}
                </p>
                <p className="text-sm text-muted-foreground">Inclusive of all taxes</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Product Details Grid */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Basic Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Brand</h4>
                <p className="text-muted-foreground" data-testid="text-brand">{product.brand}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Net Quantity</h4>
                <p className="text-muted-foreground" data-testid="text-net-qty">{product.netQty}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Pack Size</h4>
                <p className="text-muted-foreground" data-testid="text-pack-size">{product.packSize || "N/A"}</p>
              </div>
              
              {product.location && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Location</h4>
                  <p className="text-muted-foreground" data-testid="text-location">{product.location}</p>
                </div>
              )}
            </div>
            
            {/* Pricing Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">MRP (₹)</h4>
                <p className="text-muted-foreground text-lg font-semibold" data-testid="text-mrp-detailed">₹{product.mrp}</p>
              </div>
              
              {product.unitSalePrice && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Unit Sale Price (₹)</h4>
                  <p className="text-muted-foreground" data-testid="text-unit-sale-price">₹{product.unitSalePrice}</p>
                </div>
              )}
              
              {(product.noOfPkts || product.totalPkts) && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Package Count</h4>
                  <p className="text-muted-foreground" data-testid="text-package-count">
                    {product.noOfPkts && `${product.noOfPkts} packets`}
                    {product.noOfPkts && product.totalPkts && " / "}
                    {product.totalPkts && `${product.totalPkts} total`}
                  </p>
                </div>
              )}
            </div>
            
            {/* Batch and Lot Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Batch No.</h4>
                <p className="text-muted-foreground font-mono" data-testid="text-batch-no">{product.lotBatch}</p>
              </div>
              
              {product.lotNo && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Lot No.</h4>
                  <p className="text-muted-foreground font-mono" data-testid="text-lot-no">{product.lotNo}</p>
                </div>
              )}
              
              {product.stackNo && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Stack No.</h4>
                  <p className="text-muted-foreground font-mono" data-testid="text-stack-no">{product.stackNo}</p>
                </div>
              )}
            </div>
            
            {/* Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Manufacturing Date</h4>
                <p className="text-muted-foreground" data-testid="text-mfg-date">{product.mfgDate}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Expiry Date</h4>
                <p className="text-muted-foreground" data-testid="text-expiry-date">{product.expiryDate}</p>
              </div>
              
              {product.dateOfTest && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Date of Test</h4>
                  <p className="text-muted-foreground" data-testid="text-date-of-test">{product.dateOfTest}</p>
                </div>
              )}
            </div>
            
            {/* Marketing and Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Marketed By</h4>
                <p className="text-muted-foreground" data-testid="text-marketed-by">{product.marketedBy}</p>
              </div>
              
              {(product.from || product.to) && (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Distribution Range</h4>
                  <p className="text-muted-foreground" data-testid="text-distribution-range">
                    {product.from && `From: ${product.from}`}
                    {product.from && product.to && " | "}
                    {product.to && `To: ${product.to}`}
                  </p>
                </div>
              )}
            </div>
            
            {/* Product Codes */}
            {(product.marketingCode || product.unitOfMeasureCode || product.marketCode || product.prodCode || product.stageCode) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {product.marketingCode && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">Marketing Code</h4>
                    <p className="text-muted-foreground font-mono" data-testid="text-marketing-code">{product.marketingCode}</p>
                  </div>
                )}
                
                {product.marketCode && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">Market Code</h4>
                    <p className="text-muted-foreground font-mono" data-testid="text-market-code">{product.marketCode}</p>
                  </div>
                )}
                
                {product.prodCode && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">Product Code</h4>
                    <p className="text-muted-foreground font-mono" data-testid="text-prod-code">{product.prodCode}</p>
                  </div>
                )}
                
                {product.unitOfMeasureCode && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">Unit of Measure Code</h4>
                    <p className="text-muted-foreground font-mono" data-testid="text-unit-of-measure-code">{product.unitOfMeasureCode}</p>
                  </div>
                )}
                
                {product.stageCode && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">Stage Code</h4>
                    <p className="text-muted-foreground font-mono" data-testid="text-stage-code">{product.stageCode}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Quality Information */}
            {(product.normalGermination || product.gerAve || product.gotPercent || product.gotAve || product.gb || product.remainingQuantity) && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Quality & Testing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {product.normalGermination && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Normal Germination</h4>
                      <p className="text-muted-foreground" data-testid="text-normal-germination">{product.normalGermination}%</p>
                    </div>
                  )}
                  
                  {product.gerAve && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Germination Average</h4>
                      <p className="text-muted-foreground" data-testid="text-ger-ave">{product.gerAve}</p>
                    </div>
                  )}
                  
                  {product.gb && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">GB</h4>
                      <p className="text-muted-foreground" data-testid="text-gb">{product.gb}</p>
                    </div>
                  )}
                  
                  {product.gotPercent && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">GOT Percent</h4>
                      <p className="text-muted-foreground" data-testid="text-got-percent">{product.gotPercent}%</p>
                    </div>
                  )}
                  
                  {product.gotAve && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">GOT Average</h4>
                      <p className="text-muted-foreground" data-testid="text-got-ave">{product.gotAve}</p>
                    </div>
                  )}
                  
                  {product.remainingQuantity && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Remaining Quantity</h4>
                      <p className="text-muted-foreground" data-testid="text-remaining-quantity">{product.remainingQuantity}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Company Address</h4>
                <p className="text-muted-foreground whitespace-pre-line" data-testid="text-company-address">
                  {product.companyAddress}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-muted-foreground" data-testid="text-customer-care">
                      {product.customerCare}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-muted-foreground" data-testid="text-email">
                      {product.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {qrCodeDataUrl ? (
                    <div className="h-20 w-20 bg-white rounded-lg p-1 flex items-center justify-center">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Product QR Code"
                        className="w-full h-full object-contain"
                        data-testid="img-qr-code"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 bg-muted-foreground/20 rounded-lg flex items-center justify-center">
                      <QrCode className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">Share this Product</h4>
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code to access this product's information
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                      {window.location.origin}/track/{product.uniqueId}
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDownloadQRCode} 
                  disabled={!qrCodeDataUrl}
                  data-testid="button-download-qr"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Brochure */}
        {product.brochureUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Product Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Product Brochure</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.brochureFilename || "Detailed product information and cultivation guide"}
                    </p>
                  </div>
                </div>
                
                <Button onClick={handleDownloadBrochure} data-testid="button-download-brochure">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This product information has been verified and approved by Green Gold Seeds Pvt. Ltd.</p>
          <p className="mt-2">For any queries, please contact our customer care team.</p>
        </div>
      </div>
    </div>
  );
}
