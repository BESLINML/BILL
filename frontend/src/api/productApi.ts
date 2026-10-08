import { API_BASE_URL } from "./ofsApi";
import type { Product, ProductRequest } from "../types/ProductType";

const PRODUCT_URL = `${API_BASE_URL}/products`;

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: { error?: string } = await response.json();
    return body.error || `${fallback} (HTTP ${response.status})`;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(PRODUCT_URL);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch products"));
  }

  return response.json();
}

export async function getProductById(
  id: number
): Promise<Product> {
  const response = await fetch(`${PRODUCT_URL}/${id}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch product"));
  }

  return response.json();
}

export async function createProduct(
  product: ProductRequest
): Promise<Product> {
  const response = await fetch(PRODUCT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create product"));
  }

  return response.json();
}

export async function updateProduct(
  id: number,
  product: ProductRequest
): Promise<Product> {
  const response = await fetch(`${PRODUCT_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update product"));
  }

  return response.json();
}

export async function deleteProduct(
  id: number
): Promise<void> {
  const response = await fetch(`${PRODUCT_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete product"));
  }
}
