export interface InvoiceItemRequest {
  productId: number;
  quantity: number;
}

export interface InvoiceRequest {
  customerId: number;
  invoiceDate: string;
  dueDate: string | null;
  notes: string;
  discountType: "amount" | "percent";
  discountValue: number;
  includeDigitalSeal: boolean;
  includeDigitalSignature: boolean;
  digitalSeal?: string;
  digitalSignature?: string;
  items: InvoiceItemRequest[];
}

export type InvoiceSellerSnapshot = CompanyDetails & {
  includeDigitalSeal?: boolean;
  includeDigitalSignature?: boolean;
  digitalSeal?: string;
  digitalSignature?: string;
};

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerCompanyName?: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  status: string;
}

export interface InvoiceDetail extends Invoice {
  customerId: number;
  customerEmail: string;
  customerPhone: string;
  customerCompanyName: string;
  customerGstin: string;
  customerAddress: string;
  customerState: string;
  notes: string;
  subtotal: number;
  discountAmount: number;
  discountType: "amount" | "percent";
  discountValue: number;
  taxAmount: number;
  items: InvoiceLine[];
  taxType: "intra" | "inter" | "unknown";
  includeDigitalSeal: boolean;
  includeDigitalSignature: boolean;
  sellerSnapshot: InvoiceSellerSnapshot | null;
  customerSnapshot: CustomerSnapshot | null;
  digitalSeal: string;
  digitalSignature: string;
}

export interface CustomerSnapshot {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstin: string;
  address: string;
  state: string;
}

export interface InvoiceLine {
  id: number;
  productId: number | null;
  productName: string;
  sku: string;
  hsn: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineSubtotal: number;
  lineTax: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}
import type { CompanyDetails } from "./CompanyDetailsType";

