import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { Add, Delete, Edit, Search } from "@mui/icons-material";
import StateAutocomplete from "../Shared/StateAutocomplete";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../../api/customerApi";
import type { Customer, CustomerRequest } from "../../types/CustomerType";
import { isValidEmail, isValidGstin, isValidPhone } from "../../utils/validation";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const emptyCustomer: CustomerRequest = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  gstin: "",
  address: "",
  state: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerRequest>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomerRequest, string>>>({});

  const updateField = <K extends keyof CustomerRequest>(field: K, value: CustomerRequest[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  useEffect(() => {
    let cancelled = false;
    getCustomers()
      .then((data) => { if (!cancelled) setCustomers(data); })
      .catch(() => { if (!cancelled) setError("Could not load customers. Check that the API is available."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const refreshCustomers = async () => {
    setLoading(true);
    try {
      setCustomers(await getCustomers());
      setError("");
    } catch {
      setError("Could not refresh the customer list.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setForm(emptyCustomer);
    setFieldErrors({});
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      companyName: customer.companyName ?? "",
      gstin: customer.gstin ?? "",
      address: customer.address ?? "",
      state: customer.state ?? "",
    });
    setFieldErrors({});
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const nextErrors: Partial<Record<keyof CustomerRequest, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Enter the customer's name.";
    if (!form.state.trim()) nextErrors.state = "Enter the customer state for GST calculation.";
    if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!isValidPhone(form.phone)) nextErrors.phone = "Enter a valid phone number with 8–15 digits.";
    if (!isValidGstin(form.gstin)) nextErrors.gstin = "GSTIN must be 15 characters in a valid GSTIN format.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError("Please correct the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        address: form.address.trim(),
        state: form.state.trim(),
      };
      if (editingCustomer) await updateCustomer(editingCustomer.id, payload);
      else await createCustomer(payload);
      setDialogOpen(false);
      await refreshCustomers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : editingCustomer ? "Could not update customer." : "Could not create customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    setError("");
    try {
      await deleteCustomer(customer.id);
      await refreshCustomers();
    } catch {
      setError("Could not delete customer.");
    }
  };

  const searchText = debouncedSearch.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    [customer.name, customer.email, customer.phone, customer.companyName, customer.gstin]
      .some((value) => value?.toLowerCase().includes(searchText)),
  );

  return (
    <Box>
      <Stack sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Customers</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage your customer contact and billing details.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>Add customer</Button>
      </Stack>

      {error && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, p: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Customer list</Typography>
            <Typography variant="body2" color="text.secondary">{customers.length} customer{customers.length === 1 ? "" : "s"}</Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: "100%", sm: 300 } }}
            slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> } }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : filteredCustomers.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{customers.length ? "No matching customers" : "No customers yet"}</Typography>
            <Typography color="text.secondary">{customers.length ? "Try a different name, email, phone, or GSTIN." : "Add a customer to keep their billing details in one place."}</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.50" }}>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>GSTIN</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{customer.name}</Typography>
                      {customer.companyName && <Typography variant="body2" color="text.secondary">{customer.companyName}</Typography>}
                    </TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>{customer.email || "—"}</TableCell>
                    <TableCell>{customer.gstin || "—"}</TableCell>
                    <TableCell align="center">
                      <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: 0.5 }}>
                        <IconButton aria-label={`Edit ${customer.name}`} title="Edit" size="small" onClick={() => openEditDialog(customer)}><Edit fontSize="small" /></IconButton>
                        <IconButton aria-label={`Delete ${customer.name}`} title="Delete" size="small" color="error" onClick={() => void handleDelete(customer)}><Delete fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingCustomer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack sx={{ display: "flex", gap: 2, pt: 1 }}>
              <TextField label="Customer name" required fullWidth value={form.name} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} onChange={(event) => updateField("name", event.target.value)} />
              <TextField label="Company name" fullWidth value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
              <TextField label="Email" type="email" fullWidth value={form.email} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} onChange={(event) => updateField("email", event.target.value)} />
              <TextField label="Phone" type="tel" fullWidth value={form.phone} error={Boolean(fieldErrors.phone)} helperText={fieldErrors.phone} onChange={(event) => updateField("phone", event.target.value)} slotProps={{ htmlInput: { maxLength: 20, inputMode: "tel" } }} />
              <TextField label="GSTIN" fullWidth value={form.gstin} error={Boolean(fieldErrors.gstin)} helperText={fieldErrors.gstin} onChange={(event) => updateField("gstin", event.target.value.toUpperCase())} slotProps={{ htmlInput: { maxLength: 15 } }} />
              <StateAutocomplete value={form.state} error={Boolean(fieldErrors.state)} helperText={fieldErrors.state} onChange={(value) => updateField("state", value)} />
              <TextField label="Billing address" multiline minRows={2} fullWidth value={form.address} onChange={(event) => updateField("address", event.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? "Saving..." : editingCustomer ? "Save changes" : "Save customer"}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
