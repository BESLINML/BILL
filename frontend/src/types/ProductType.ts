export interface Product {
  id: number;
  name: string;
  sku: string;
  hsn: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  active: boolean;
}

export interface ProductRequest {
  name: string;
  sku: string;
  hsn: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
}