export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstin: string;
  address: string;
  state: string;
}

export type CustomerRequest = Omit<Customer, "id">;
