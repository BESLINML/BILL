import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, CircularProgress, GlobalStyles, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { ArrowBack, Print } from "@mui/icons-material";
import { getInvoiceById } from "../../api/invoiceApi";
import type { CompanyDetails } from "../../types/CompanyDetailsType";
import type { InvoiceDetail } from "../../types/InvoiceType";

const COMPANY_STORAGE_KEY = "billing-app-company-details";
const COMPANY_SEAL_KEY = "billing-app-company-seal";
const COMPANY_SIGNATURE_KEY = "billing-app-company-signature";
const emptySeller: CompanyDetails = {
  companyName: "", gstin: "", pan: "", email: "", phone: "", website: "", address: "", city: "", state: "", postalCode: "",
  bankName: "", accountHolderName: "", accountNumber: "", accountType: "", ifscCode: "", bankBranch: "",
};

function readLegacySeller(): CompanyDetails {
  try {
    const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
    return saved ? { ...emptySeller, ...JSON.parse(saved) as Partial<CompanyDetails> } : emptySeller;
  } catch {
    return emptySeller;
  }
}

const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const dateLabel = (value: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN") : "—";
const sameState = (seller: string, customer: string) => seller.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase() === customer.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();

export default function InvoiceDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [legacySeller] = useState(readLegacySeller);
  const [companySeal] = useState(() => localStorage.getItem(COMPANY_SEAL_KEY) || "");
  const [companySignature] = useState(() => localStorage.getItem(COMPANY_SIGNATURE_KEY) || "");
  const invoiceId = Number(id);
  const invalidId = !Number.isInteger(invoiceId) || invoiceId < 1;
  const [result, setResult] = useState<{ id: number; invoice: InvoiceDetail | null; error: string } | null>(null);

  useEffect(() => {
    if (invalidId) return;
    let cancelled = false;
    getInvoiceById(invoiceId)
      .then((data) => { if (!cancelled) setResult({ id: invoiceId, invoice: data, error: "" }); })
      .catch((loadError) => { if (!cancelled) setResult({ id: invoiceId, invoice: null, error: loadError instanceof Error ? loadError.message : "Could not load invoice details. Check that the API is available." }); });
    return () => { cancelled = true; };
  }, [id, invalidId, invoiceId]);

  const loading = !invalidId && result?.id !== invoiceId;
  const error = invalidId ? "Invalid invoice ID." : result?.id === invoiceId ? result.error : "";
  const invoice = result?.id === invoiceId ? result.invoice : null;

  const seller = invoice?.sellerSnapshot || legacySeller;
  const includeDigitalSeal = invoice?.includeDigitalSeal ?? invoice?.sellerSnapshot?.includeDigitalSeal ?? true;
  const invoiceSeal = includeDigitalSeal
    ? invoice?.digitalSeal || invoice?.sellerSnapshot?.digitalSeal || companySeal
    : "";
  const includeDigitalSignature = invoice?.includeDigitalSignature ?? invoice?.sellerSnapshot?.includeDigitalSignature ?? true;
  const invoiceSignature = includeDigitalSignature
    ? invoice?.digitalSignature || invoice?.sellerSnapshot?.digitalSignature || companySignature
    : "";
  const customer = invoice?.customerSnapshot || (invoice ? {
    name: invoice.customerName, email: invoice.customerEmail, phone: invoice.customerPhone,
    companyName: invoice.customerCompanyName, gstin: invoice.customerGstin,
    address: invoice.customerAddress, state: invoice.customerState,
  } : null);
  const gstType = useMemo(() => {
    if (!invoice) return "unknown";
    if (invoice.taxType !== "unknown") return invoice.taxType;
    const sellerState = invoice.sellerSnapshot?.state || legacySeller.state;
    const customerState = invoice.customerSnapshot?.state || invoice.customerState;
    if (!sellerState || !customerState) return "unknown";
    return sameState(sellerState, customerState) ? "intra" : "inter";
  }, [invoice, legacySeller.state]);

  if (invalidId) return <Box><Button startIcon={<ArrowBack />} onClick={() => navigate("/invoices")}>Back to invoices</Button><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Box>;
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  if (!invoice || !customer) return <Box><Button startIcon={<ArrowBack />} onClick={() => navigate("/invoices")}>Back to invoices</Button>{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</Box>;

  const totalCgst = invoice.items.reduce((sum, item) => sum + Number(item.cgstAmount || (gstType === "intra" ? Number((item.lineTax / 2).toFixed(2)) : 0)), 0);
  const totalSgst = invoice.items.reduce((sum, item) => sum + Number(item.sgstAmount || (gstType === "intra" ? Number((item.lineTax - Number((item.lineTax / 2).toFixed(2))).toFixed(2)) : 0)), 0);
  const totalIgst = invoice.items.reduce((sum, item) => sum + Number(item.igstAmount || (gstType === "inter" ? item.lineTax : 0)), 0);
  const unroundedTotalPaise = Math.round((Number(invoice.subtotal) + Number(invoice.taxAmount)) * 100);
  const discountPaise = Math.round(Number(invoice.discountAmount || 0) * 100);
  const payableRupees = Math.floor((unroundedTotalPaise - discountPaise + 50) / 100);
  const roundOff = (payableRupees * 100 - (unroundedTotalPaise - discountPaise)) / 100;
  const sellerAddress = [seller.address, seller.city, seller.state, seller.postalCode].filter(Boolean).join(", ");
  const customerAddress = [customer.address, customer.state].filter(Boolean).join(", ");
  const gstTypeLabel = gstType === "intra" ? "Intra-state (CGST + SGST)" : gstType === "inter" ? "Inter-state (IGST)" : "Not determined";
  const invoiceItemCount = Math.max(invoice.items.length, 1);
  const printFontScale = Math.max(0.84, 1.18 - (invoiceItemCount - 1) * 0.018);

  return (
    <>
      <GlobalStyles styles={{
        "@media print": {
          "@page": { size: "A4 portrait", margin: "6mm" },
          "html, body, #root": { height: "auto !important", minHeight: "0 !important", overflow: "visible !important" },
          "#app-shell": { display: "block !important", minHeight: "0 !important", background: "#fff !important" },
          "#app-header, #app-nav, #app-main-spacer, .no-print": { display: "none !important" },
          "#app-main": { display: "block !important", width: "100% !important", minWidth: "0 !important", margin: "0 !important", padding: "0 !important" },
          "#app-content": { width: "100% !important", maxWidth: "none !important", margin: "0 !important", padding: "0 !important" },
          "body *": { visibility: "hidden !important" },
          "#invoice-print, #invoice-print *": { visibility: "visible !important" },
          "#invoice-print": { position: "static !important", inset: "auto !important", display: "flex !important", flexDirection: "column !important", boxSizing: "border-box", width: "100% !important", height: "285mm !important", minHeight: "285mm !important", maxHeight: "285mm !important", maxWidth: "none !important", margin: "0 !important", padding: "0 !important", overflow: "visible !important", boxShadow: "none !important", border: "0 !important", borderRadius: "0 !important", zoom: "1 !important", color: "#172033 !important", fontSize: "calc(9pt * var(--invoice-font-scale)) !important", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact", breakInside: "avoid !important", pageBreakInside: "avoid !important" },
          "#invoice-print .invoice-parties": { paddingTop: "3px !important", paddingBottom: "3px !important", gap: "8px !important" },
          "#invoice-print .invoice-parties > .MuiBox-root": { padding: "5px !important" },
          "#invoice-print .invoice-items": { position: "relative", display: "flex !important", flexDirection: "column !important", flex: "1 1 auto !important", minHeight: "0 !important", overflow: "visible !important" },
          "#invoice-print .invoice-items::after": { content: "\"\"", position: "absolute", top: 0, bottom: 0, right: 0, borderRight: "1px solid #d7dde7", pointerEvents: "none" },
          "#invoice-print .invoice-items .MuiTable-root": { height: "100% !important" },
          "#invoice-print .invoice-fill-space": { height: "100% !important" },
          "#invoice-print .invoice-fill-space td": { height: "100% !important", padding: "0 3px !important" },
          "#invoice-print .invoice-footer-grid": { display: "flex !important", flexDirection: "row !important", justifyContent: "space-between !important", alignItems: "center !important", gap: "8px !important", marginTop: "8px !important", paddingTop: "6px !important", breakInside: "avoid !important", pageBreakInside: "avoid !important" },
          "#invoice-print .MuiTableContainer-root": { display: "block !important", overflow: "visible !important", width: "100% !important" },
          "#invoice-print .MuiTable-root": { display: "table !important", overflow: "visible !important", width: "100% !important" },
          "#invoice-print table": { borderCollapse: "collapse", borderSpacing: 0, tableLayout: "fixed", width: "100%" },
          "#invoice-print thead": { display: "table-header-group" },
          "#invoice-print tfoot": { display: "table-footer-group" },
          "#invoice-print tbody tr": { height: "auto !important", breakInside: "avoid", pageBreakInside: "avoid" },
          "#invoice-print th, #invoice-print td": { color: "#172033 !important", padding: "2px 3px !important", fontSize: "calc(7.5pt * var(--invoice-font-scale)) !important", lineHeight: "1.1 !important", verticalAlign: "top", overflowWrap: "anywhere", border: "1px solid #d7dde7 !important" },
          "#invoice-print th:last-child, #invoice-print td:last-child": { borderRight: "1px solid #d7dde7 !important" },
          "#invoice-print th": { backgroundColor: "#eef2f8 !important", fontWeight: "700 !important", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" },
          "#invoice-print .MuiTypography-root": { color: "#000 !important" },
          "#invoice-print .MuiTypography-h4": { fontSize: "calc(17pt * var(--invoice-font-scale)) !important", lineHeight: "1.05 !important" },
          "#invoice-print .MuiTypography-h5": { fontSize: "calc(12pt * var(--invoice-font-scale)) !important", lineHeight: "1.1 !important" },
          "#invoice-print .MuiTypography-h6": { fontSize: "calc(9pt * var(--invoice-font-scale)) !important", lineHeight: "1.1 !important" },
          "#invoice-print .MuiTypography-body1, #invoice-print .MuiTypography-body2": { fontSize: "calc(8pt * var(--invoice-font-scale)) !important", lineHeight: "1.15 !important" },
          "#invoice-print .MuiTypography-caption, #invoice-print .MuiTypography-overline": { fontSize: "calc(7pt * var(--invoice-font-scale)) !important", lineHeight: "1.1 !important" },
          "#invoice-print .MuiTableCell-root:nth-of-type(1)": { width: "32%" },
          "#invoice-print .MuiTableCell-root:nth-of-type(2)": { width: "14%" },
          "#invoice-print .MuiTableCell-root:nth-of-type(3)": { width: "8%" },
          "#invoice-print .MuiTableCell-root:nth-of-type(4)": { width: "14%" },
          "#invoice-print .MuiTableCell-root:nth-of-type(5)": { width: "12%" },
          "#invoice-print .MuiTableCell-root:nth-of-type(6)": { width: "20%" },
          "#invoice-print .MuiStack-root": { gap: "3px !important" },
          "#invoice-print img": { maxHeight: "54px !important", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" },
        },
      }} />
      <Stack className="no-print" direction="row" spacing={1.5} sx={{ mb: 2, alignItems: "center" }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/invoices")}>Back</Button>
        <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>Print / Save PDF</Button>
      </Stack>
      {(!seller.companyName || !seller.state || !customer.state) && (
        <Alert severity="warning" className="no-print" sx={{ mb: 2 }} action={<Stack direction="row" spacing={1}>
          {!seller.state && <Button color="inherit" size="small" onClick={() => navigate("/company")}>Company details</Button>}
          {!customer.state && <Button color="inherit" size="small" onClick={() => navigate("/customers")}>Customers</Button>}
        </Stack>}>
          {!seller.state && !customer.state ? "Seller and customer states are missing. Add both to determine the GST type." : !seller.state ? "Seller state is missing. Add it in Company Details." : "Customer state is missing. Edit this customer."}
        </Alert>
      )}
      {error && <Alert severity="error" className="no-print" sx={{ mb: 2 }}>{error}</Alert>}
      {!invoiceSeal && !invoiceSignature && <Alert severity="warning" className="no-print" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate("/company")}>Company details</Button>}>
        No seal or signature image was saved with this invoice. Upload the images in Company Details, then create a new invoice.
      </Alert>}

      <Paper id="invoice-print" variant="outlined" sx={{ "--invoice-font-scale": printFontScale, "--invoice-item-count": invoiceItemCount, maxWidth: 900, mx: "auto", p: { xs: 2, sm: 4 }, borderRadius: 3, color: "#172033" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" }, pb: 2.5, borderBottom: 2, borderColor: "primary.main" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{seller.companyName || "Seller details required"}</Typography>
            {seller.phone && <Typography variant="body2">Phone: {seller.phone}</Typography>}
            {seller.email && <Typography variant="body2">Email: {seller.email}</Typography>}
            {seller.website && <Typography variant="body2">{seller.website}</Typography>}
            {seller.gstin && <Typography variant="body2">GSTIN: {seller.gstin}</Typography>}
            {seller.pan && <Typography variant="body2">PAN: {seller.pan}</Typography>}
            {sellerAddress && <Typography variant="body2" color="text.secondary">Address: {sellerAddress}</Typography>}
          </Box>
          <Box sx={{ textAlign: { sm: "right" }, minWidth: { sm: 210 } }}>
            <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: ".16em" }}>TAX INVOICE</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.75 }}>{invoice.invoiceNumber}</Typography>
            <Typography variant="body2" color="text.secondary">Issue date: {dateLabel(invoice.invoiceDate)}</Typography>
            {invoice.dueDate && <Typography variant="body2" color="text.secondary">Due date: {dateLabel(invoice.dueDate)}</Typography>}
          </Box>
        </Stack>

        <Box className="invoice-parties" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, py: 2.5 }}>
          <Box sx={{ p: 2, bgcolor: "#f5f7fb", borderRadius: 1.5, breakInside: "avoid" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700 }}>BILL TO</Typography>
            <Typography sx={{ fontWeight: 700 }}>{customer.name}</Typography>
            {customer.companyName && <Typography variant="body2">{customer.companyName}</Typography>}
            {customer.phone && <Typography variant="body2" color="text.secondary">Phone: {customer.phone}</Typography>}
            {customer.email && <Typography variant="body2" color="text.secondary">Email: {customer.email}</Typography>}
            {customer.gstin && <Typography variant="body2">GSTIN: {customer.gstin}</Typography>}
            {customerAddress && <Typography variant="body2" color="text.secondary">Address: {customerAddress}</Typography>}
          </Box>
        </Box>

        <Box className="invoice-items" sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ border: 1, borderColor: "divider", "& th": { bgcolor: "#eef2f8", fontWeight: 700 }, "& th, & td": { border: 1, borderStyle: "solid", borderColor: "divider" }, "& th:last-child, & td:last-child": { borderRight: 1, borderRightStyle: "solid", borderRightColor: "divider" }, "& tbody tr:nth-of-type(even)": { bgcolor: "#fafbfd" } }}><TableHead><TableRow>
            <TableCell><strong>Product</strong></TableCell><TableCell><strong>HSN/SAC</strong></TableCell>
            <TableCell align="right"><strong>Qty</strong></TableCell><TableCell align="right"><strong>Rate</strong></TableCell>
            <TableCell align="right"><strong>GST rate</strong></TableCell><TableCell align="right"><strong>Total</strong></TableCell>
          </TableRow></TableHead><TableBody>{invoice.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell><Typography sx={{ fontWeight: 600 }}>{item.productName}</Typography></TableCell>
              <TableCell>{item.hsn}</TableCell><TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">{currency(item.unitPrice)}</TableCell>
              <TableCell align="right">{item.gstRate}%</TableCell>
              <TableCell align="right">{currency(item.lineSubtotal + item.lineTax)}</TableCell>
            </TableRow>
          ))}
            <TableRow className="invoice-fill-space" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <TableCell key={index} />)}
            </TableRow>
          </TableBody></Table>
        </Box>


        <Stack sx={{ alignItems: "flex-end", mt: 2 }}>
          <Box sx={{ width: { xs: "100%", sm: 340 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>GST type: {gstTypeLabel}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Seller state: {seller.state || "Not set"} · Customer state: {customer.state || "Not set"}</Typography>
            <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>Subtotal</Typography><Typography>{currency(invoice.subtotal)}</Typography></Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>Discount{invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : ""}</Typography><Typography>−{currency(invoice.discountAmount || 0)}</Typography></Stack>
            {gstType === "intra" ? <>
              <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>CGST</Typography><Typography>{currency(totalCgst)}</Typography></Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>SGST</Typography><Typography>{currency(totalSgst)}</Typography></Stack>
            </> : gstType === "inter" ? <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>IGST</Typography><Typography>{currency(totalIgst)}</Typography></Stack> : <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>GST</Typography><Typography>{currency(invoice.taxAmount)}</Typography></Stack>}
            <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>Amount before round off</Typography><Typography>{currency(unroundedTotalPaise / 100)}</Typography></Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between", py: 0.5 }}><Typography>Round off</Typography><Typography>{roundOff >= 0 ? "+" : "−"}{currency(Math.abs(roundOff))}</Typography></Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between", py: 1, mt: 0.5, borderTop: 1, borderColor: "divider" }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Amount payable</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{currency(payableRupees)}</Typography></Stack>
          </Box>
        </Stack>
        {invoice.notes && <Box sx={{ mt: 2 }}><Typography sx={{ fontWeight: 700 }}>Notes</Typography><Typography variant="body2">{invoice.notes}</Typography></Box>}
        <Box className="invoice-footer-grid" sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2, mt: 3, pt: 2, borderTop: 1, borderColor: "divider", breakInside: "avoid" }}>
        {(seller.bankName || seller.accountNumber || seller.ifscCode) && <Box sx={{ flex: 1, alignSelf: { xs: "stretch", sm: "center" } }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Bank details</Typography>
          <Typography variant="body2">{[seller.bankName, seller.bankBranch && `Branch: ${seller.bankBranch}`].filter(Boolean).join(" · ")}</Typography>
          {seller.accountHolderName && <Typography variant="body2">Account holder: {seller.accountHolderName}</Typography>}
          {seller.accountNumber && <Typography variant="body2">Account number: {seller.accountNumber}</Typography>}
          {seller.accountType && <Typography variant="body2">Account type: {seller.accountType}</Typography>}
          {seller.ifscCode && <Typography variant="body2">IFSC: {seller.ifscCode}</Typography>}
        </Box>}
        <Box sx={{ width: 210, textAlign: "center", flexShrink: 0 }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: invoiceSeal || invoiceSignature ? 0.5 : "2cm" }}>For {seller.companyName || "Company Name"}</Typography>
            {(invoiceSeal || invoiceSignature) && <Box sx={{ position: "relative", width: 180, height: 76, mx: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "visible" }}>
              {invoiceSeal && <Box component="img" src={invoiceSeal} alt={`${seller.companyName || "Company"} digital seal`} sx={{ width: 72, height: 72, objectFit: "contain" }} />}
              {invoiceSignature && <Box component="img" src={invoiceSignature} alt={`${seller.companyName || "Company"} digital signature`} sx={{ position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", width: 150, height: 52, objectFit: "contain", zIndex: 1 }} />}
            </Box>}
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
              Seal and Sign
            </Typography>
        </Box>
        </Box>
        <Typography className="invoice-thanks" variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: "auto", pt: 1, borderTop: 1, borderColor: "divider" }}>Thank you for your business.</Typography>
      </Paper>
    </>
  );
}
