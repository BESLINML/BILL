import { API_BASE_URL } from "./ofsApi";
import type { Customer, CustomerRequest } from "../types/CustomerType";

const CUSTOMERS_URL = `${API_BASE_URL}/customers`;

async function throwResponseError(response: Response, fallback: string): Promise<never> {
  let body: { error?: string };
  try {
    body = await response.json() as { error?: string };
  } catch (error) {
    throw new Error(`${fallback} (HTTP ${response.status})`, { cause: error });
  }
  throw new Error(body.error || fallback);
}

export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(CUSTOMERS_URL);
  if (!response.ok) await throwResponseError(response, "Failed to fetch customers");
  return response.json();
}

export async function createCustomer(customer: CustomerRequest): Promise<void> {
  const response = await fetch(CUSTOMERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!response.ok) await throwResponseError(response, "Failed to create customer");
}

export async function updateCustomer(id: number, customer: CustomerRequest): Promise<void> {
  const response = await fetch(`${CUSTOMERS_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!response.ok) await throwResponseError(response, "Failed to update customer");
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`${CUSTOMERS_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) await throwResponseError(response, "Failed to delete customer");
}
