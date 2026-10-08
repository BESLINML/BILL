import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Clear, Search, Visibility } from "@mui/icons-material";
import { getInvoices } from "../../api/invoiceApi";
import type { Invoice } from "../../types/InvoiceType";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount) || 0);
const dateLabel = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
};

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getInvoices()
      .then((data) => { if (!cancelled) setInvoices(data); })
      .catch(() => { if (!cancelled) setError("Could not load invoices. Check that the invoice API is available."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const searchText = debouncedSearch.trim().toLowerCase();
  const filteredInvoices = invoices.filter((invoice) =>
    [invoice.invoiceNumber, invoice.customerName, invoice.customerCompanyName, invoice.invoiceDate]
      .some((value) => String(value ?? "").toLowerCase().includes(searchText)),
  );

  return (
    <Box>
      <Stack sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Invoices</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Create and track customer invoices.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/invoices/create")}>Create invoice</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, p: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Invoice list</Typography>
            <Typography variant="body2" color="text.secondary">
              {search.trim()
                ? `${filteredInvoices.length} match${filteredInvoices.length === 1 ? "" : "es"} of ${invoices.length} invoices`
                : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Search invoices"
            placeholder="Invoice number, customer or date"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: "100%", sm: 340 } }}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton aria-label="Clear invoice search" edge="end" size="small" onClick={() => setSearch("")}><Clear fontSize="small" /></IconButton></InputAdornment> : undefined,
            } }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : filteredInvoices.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{invoices.length ? "No matching invoices" : "No invoices yet"}</Typography>
            <Typography color="text.secondary">{invoices.length ? "Try another invoice number or customer." : "Create your first invoice to get started."}</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.50" }}>
                  <TableCell><strong>Invoice</strong></TableCell>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align="right"><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>Details</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{invoice.invoiceNumber || `#${invoice.id}`}</TableCell>
                    <TableCell>{invoice.customerName || "—"}</TableCell>
                    <TableCell>{dateLabel(invoice.invoiceDate)}</TableCell>
                    <TableCell align="right">{currency(invoice.totalAmount)}</TableCell>
                    <TableCell align="right"><Button size="small" startIcon={<Visibility />} onClick={() => navigate(`/invoices/${invoice.id}`)}>View / print</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
