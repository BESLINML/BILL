import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Switch,
  Typography,
} from "@mui/material";
import { Add, ArrowBack, Delete, Save } from "@mui/icons-material";
import { createInvoice } from "../../api/invoiceApi";
import { getCompanyDetails } from "../../api/companyApi";
import { getCustomers } from "../../api/customerApi";
import { getProducts } from "../../api/productApi";
import type { Customer } from "../../types/CustomerType";
import type { Product } from "../../types/ProductType";
import type { InvoiceItemRequest } from "../../types/InvoiceType";

interface DraftItem {
  productId: number | "";
  quantity: number;
}

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
const COMPANY_SEAL_KEY = "billing-app-company-seal";
const COMPANY_SIGNATURE_KEY = "billing-app-company-signature";

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyReady, setCompanyReady] = useState(false);
  const [savedDigitalSeal] = useState(() => localStorage.getItem(COMPANY_SEAL_KEY) || "");
  const [savedDigitalSignature] = useState(() => localStorage.getItem(COMPANY_SIGNATURE_KEY) || "");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [includeDigitalSeal, setIncludeDigitalSeal] = useState(() => Boolean(localStorage.getItem(COMPANY_SEAL_KEY)));
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([{ productId: "", quantity: 1 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCustomers(), getProducts(), getCompanyDetails()])
      .then(([customerData, productData, companyData]) => {
        if (cancelled) return;
        setCustomers(customerData);
        setProducts(productData.filter((product) => product.active));
        setCompanyReady(Boolean(companyData?.companyName && companyData.state));
      })
      .catch(() => { if (!cancelled) setError("Could not load customers and products. Check that the API is available."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [customers],
  );
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [products],
  );

  const totalsInPaise = useMemo(() => items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return sum;
    const taxablePaise = Math.round(product.sellingPrice * item.quantity * 100);
    const taxPaise = Math.round(taxablePaise * product.gstRate / 100);
    return { subtotal: sum.subtotal + taxablePaise, tax: sum.tax + taxPaise };
  }, { subtotal: 0, tax: 0 }), [items, products]);
  const totals = {
    subtotal: totalsInPaise.subtotal / 100,
    tax: totalsInPaise.tax / 100,
    total: (totalsInPaise.subtotal + totalsInPaise.tax) / 100,
  };
  const grossPaise = totalsInPaise.subtotal + totalsInPaise.tax;
  const discountPaise = discountType === "percent"
    ? Math.min(grossPaise, Math.round(grossPaise * Math.min(100, Math.max(0, discountAmount)) / 100))
    : Math.min(grossPaise, Math.max(0, Math.round(discountAmount * 100)));
  const roundedTotal = Math.floor((totalsInPaise.subtotal + totalsInPaise.tax - discountPaise + 50) / 100);
  const roundOff = (roundedTotal * 100 - (totalsInPaise.subtotal + totalsInPaise.tax - discountPaise)) / 100;

  const updateItem = (index: number, change: Partial<DraftItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!customerId) {
      setError("Select a customer for this invoice.");
      return;
    }
    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    if (!companyReady) {
      setError("Save your company name and state in Company Details before creating an invoice.");
      return;
    }
    if (includeDigitalSeal && !savedDigitalSeal) {
      setError("No saved company seal was found. Upload a seal in Company Details, then create the invoice again.");
      return;
    }
    if (includeDigitalSignature && !savedDigitalSignature) {
      setError("No saved digital signature was found. Upload a signature in Company Details, then create the invoice again.");
      return;
    }
    if (!selectedCustomer?.state) {
      setError("Add a state to the selected customer before creating an invoice so GST can be calculated correctly.");
      return;
    }
    if (!items.length || items.some((item) => !item.productId || item.quantity < 1)) {
      setError("Choose a product and quantity for each invoice line.");
      return;
    }
    if (new Set(items.map((item) => item.productId).filter(Boolean)).size !== items.filter((item) => item.productId).length) {
      setError("Each product can only be added once. Change its quantity on the existing line.");
      return;
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0 || (discountType === "percent" ? discountAmount > 100 : discountAmount * 100 > grossPaise)) {
      setError(discountType === "percent" ? "Discount must be between 0% and 100%." : "Discount must be between ₹0 and the invoice amount.");
      return;
    }

    const invoiceItems: InvoiceItemRequest[] = items.map((item) => ({ productId: Number(item.productId), quantity: item.quantity }));
    setSaving(true);
    try {
      await createInvoice({
        customerId,
        invoiceDate,
        dueDate: null,
        notes: notes.trim(),
        discountType,
        discountValue: discountAmount,
        includeDigitalSeal,
        includeDigitalSignature,
        digitalSeal: includeDigitalSeal ? savedDigitalSeal : "",
        digitalSignature: includeDigitalSignature ? savedDigitalSignature : "",
        items: invoiceItems,
      });
      navigate("/invoices");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create invoice. Please check the invoice API and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/invoices")}>Back</Button>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Create invoice</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Select a customer and add products to bill.</Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Invoice information</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" }, gap: 2 }}>
              <TextField select required label="Customer" value={customerId} onChange={(event) => setCustomerId(Number(event.target.value))}>
                {sortedCustomers.map((customer) => <MenuItem key={customer.id} value={customer.id}>{customer.name}{customer.companyName ? ` — ${customer.companyName}` : ""}</MenuItem>)}
              </TextField>
              <TextField required type="date" label="Invoice date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            {customers.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>Add a customer before creating an invoice.</Alert>}
            {!companyReady && <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate("/company")}>Company details</Button>}>Set your company name and state before creating invoices.</Alert>}
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 2.5 }}>
            <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Items</Typography>
                <Typography variant="body2" color="text.secondary">Prices and GST rates come from your product catalog.</Typography>
              </Box>
            </Stack>

            <Stack sx={{ display: "flex", gap: 1.5 }}>
              {items.map((item, index) => {
                const selectedProduct = products.find((product) => product.id === item.productId);
                const lineTaxablePaise = selectedProduct ? Math.round(selectedProduct.sellingPrice * item.quantity * 100) : 0;
                const lineTaxPaise = selectedProduct ? Math.round(lineTaxablePaise * selectedProduct.gstRate / 100) : 0;
                const lineTotalPaise = lineTaxablePaise + lineTaxPaise;
                return (
                  <Box key={index} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr auto", md: "2fr 1fr 1fr 1fr auto" }, gap: 1.5, alignItems: "center" }}>
                    <TextField select required label="Product" value={item.productId} onChange={(event) => updateItem(index, { productId: Number(event.target.value) })} sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
                      {sortedProducts.map((product) => <MenuItem key={product.id} value={product.id} disabled={items.some((other, otherIndex) => otherIndex !== index && other.productId === product.id)}>{product.name} — {formatCurrency(product.sellingPrice)}</MenuItem>)}
                    </TextField>
                    <TextField type="number" label="Qty" required value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.target.value)) })} slotProps={{ htmlInput: { min: 1 } }} />
                    <Typography color="text.secondary">{selectedProduct ? `${selectedProduct.gstRate}% GST` : "GST —"}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formatCurrency(lineTotalPaise / 100)}</Typography>
                    <IconButton aria-label="Remove invoice item" color="error" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Delete /></IconButton>
                  </Box>
                );
              })}
            </Stack>
            {products.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>Add an active product before creating an invoice.</Alert>}
            {products.length > 0 && <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}><Button startIcon={<Add />} disabled={items.length >= products.length} onClick={() => setItems((current) => [...current, { productId: "", quantity: 1 }])}>Add item</Button></Box>}
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1fr) minmax(260px, 1fr) minmax(300px, 360px)" }, gap: 2.5, alignItems: "start" }}>
            <TextField label="Notes" multiline minRows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional payment terms or notes for the customer" />
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Seal, signature and discount</Typography>
                <Stack sx={{ gap: 2 }}>
                <Stack sx={{ gap: 1.25 }}>
                  <Box>
                    <FormControlLabel
                      control={<Switch checked={includeDigitalSeal} onChange={(event) => setIncludeDigitalSeal(event.target.checked)} />}
                      label="Include company seal"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 1 }}>
                      {savedDigitalSeal ? "Add the saved company seal to this invoice." : "Upload a company seal in Company Details to include it."}
                    </Typography>
                  </Box>
                  <Box>
                    <FormControlLabel
                      control={<Switch checked={includeDigitalSignature} onChange={(event) => setIncludeDigitalSignature(event.target.checked)} />}
                      label="Include digital signature"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 1 }}>
                      {savedDigitalSignature ? "Add the saved signature to this invoice." : "Upload a digital signature in Company Details to include it."}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    <TextField select label="Discount type" value={discountType} onChange={(event) => setDiscountType(event.target.value as "amount" | "percent")}>
                      <MenuItem value="amount">Amount (₹)</MenuItem>
                      <MenuItem value="percent">Percentage (%)</MenuItem>
                    </TextField>
                    <TextField label={discountType === "percent" ? "Discount (%)" : "Discount (₹)"} type="number" value={discountAmount || ""} onChange={(event) => setDiscountAmount(Math.max(0, Number(event.target.value)))} slotProps={{ htmlInput: { min: 0, max: discountType === "percent" ? 100 : totals.total, step: discountType === "percent" ? "0.1" : "0.01" } }} />
                  </Box>
                </Stack>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Summary</Typography>
                <Stack sx={{ display: "flex", gap: 1.25 }}>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}><Typography color="text.secondary">Subtotal</Typography><Typography>{formatCurrency(totals.subtotal)}</Typography></Stack>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}><Typography color="text.secondary">GST</Typography><Typography>{formatCurrency(totals.tax)}</Typography></Stack>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}><Typography color="text.secondary">Amount before round off</Typography><Typography>{formatCurrency(totals.total)}</Typography></Stack>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}><Typography color="text.secondary">Discount</Typography><Typography>−{formatCurrency(discountPaise / 100)}</Typography></Stack>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}><Typography color="text.secondary">Round off</Typography><Typography>{roundOff >= 0 ? "+" : "−"}{formatCurrency(Math.abs(roundOff))}</Typography></Stack>
                <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 1.25 }}><Typography sx={{ fontWeight: 700 }}>Amount payable</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(roundedTotal)}</Typography></Stack>
                </Stack>
              <Button type="submit" fullWidth variant="contained" startIcon={<Save />} disabled={saving || customers.length === 0 || products.length === 0 || !companyReady} sx={{ mt: 2.5 }}>{saving ? "Creating..." : "Create invoice"}</Button>
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}

