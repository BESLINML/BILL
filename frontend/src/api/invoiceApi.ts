import { API_BASE_URL } from "./ofsApi";
import type { Invoice, InvoiceDetail, InvoiceRequest } from "../types/InvoiceType";

const INVOICES_URL = `${API_BASE_URL}/invoices`;

async function errorFrom(response: Response, fallback: string): Promise<Error> {
  try {
    const body: { error?: string } = await response.json();
    return new Error(body.error || `${fallback} (HTTP ${response.status})`);
  } catch {
    return new Error(`${fallback} (HTTP ${response.status})`);
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await fetch(INVOICES_URL);
  if (!response.ok) throw await errorFrom(response, "Failed to fetch invoices");
  return response.json();
}

export async function getInvoiceById(id: number): Promise<InvoiceDetail> {
  const response = await fetch(`${INVOICES_URL}/${id}`);
  if (!response.ok) throw await errorFrom(response, "Failed to fetch invoice details");
  return response.json();
}

export async function createInvoice(invoice: InvoiceRequest): Promise<void> {
  const response = await fetch(INVOICES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice),
  });
  if (!response.ok) throw await errorFrom(response, "Failed to create invoice");
}
