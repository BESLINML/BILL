import { API_BASE_URL } from "./ofsApi";
import type { CompanyDetails } from "../types/CompanyDetailsType";

const COMPANY_URL = `${API_BASE_URL}/company`;

export async function getCompanyDetails(): Promise<CompanyDetails | null> {
  const response = await fetch(COMPANY_URL);
  if (!response.ok) throw new Error("Could not load company details");
  return response.json();
}

export async function saveCompanyDetails(details: CompanyDetails): Promise<void> {
  const response = await fetch(COMPANY_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  if (!response.ok) throw new Error("Could not save company details");
}
