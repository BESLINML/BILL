import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  ArrowBack,
  Save,
} from "@mui/icons-material";

import { createProduct, getProductById, updateProduct } from "../../api/productApi";
import type { Product, ProductRequest } from "../../types/ProductType";

type ProductForm = Omit<Product, "id" | "purchasePrice" | "sellingPrice"> & {
  purchasePrice: string;
  sellingPrice: string;
};

const initialForm: ProductForm = {
  name: "",
  sku: "",
  hsn: "",
  purchasePrice: "",
  sellingPrice: "",
  gstRate: 18,
  description: "",
  active: true,
};

function ProductCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = id ? Number(id) : undefined;
  const isEditing = productId !== undefined;
  const invalidProductId = isEditing && (!productId || !Number.isInteger(productId) || productId < 1);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing && !invalidProductId);

  useEffect(() => {
    if (invalidProductId || !productId) return;

    let cancelled = false;
    getProductById(productId)
      .then((product) => {
        if (!cancelled) setForm({
          ...initialForm,
          ...product,
          purchasePrice: String(product.purchasePrice),
          sellingPrice: String(product.sellingPrice),
        });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [invalidProductId, productId]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "gstRate" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");

    if (isEditing && (!productId || !Number.isInteger(productId) || productId < 1)) {
      setError("Invalid product ID.");
      return;
    }

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (!form.hsn.trim()) {
      setError("HSN/SAC is required.");
      return;
    }

    try {
      setSaving(true);

      const payload: ProductRequest = {
        name: form.name,
        sku: form.sku,
        hsn: form.hsn,
        description: form.description ?? "",
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        gstRate: form.gstRate,
      };
      if (isEditing && productId) {
        await updateProduct(productId, payload);
      } else {
        await createProduct(payload);
      }

      navigate("/products");
    } catch (error) {
      console.error(error);
      const fallback = isEditing ? "Failed to update product." : "Failed to create product.";
      setError(error instanceof Error ? error.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack
        sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, mb: 3 }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/products")}
        >
          Back
        </Button>

        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700 }}
          >
            {isEditing ? "Edit Product" : "Create Product"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            {isEditing ? "Update product details." : "Add a new product to your inventory."}
          </Typography>
        </Box>
      </Stack>

      {(error || invalidProductId) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "Invalid product ID."}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography color="text.secondary">Loading product…</Typography>
        </Box>
      ) : <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
          >
            {/* Basic Information */}
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Basic Information
            </Typography>

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Product Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="SKU / Product Code"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="Example: PROD-001"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="HSN / SAC"
                  name="hsn"
                  value={form.hsn}
                  onChange={handleChange}
                  placeholder="Enter HSN/SAC code"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="GST Rate"
                  name="gstRate"
                  value={form.gstRate}
                  onChange={handleChange}
                >
                  <MenuItem value={0}>0%</MenuItem>
                  <MenuItem value={5}>5%</MenuItem>
                  <MenuItem value={12}>12%</MenuItem>
                  <MenuItem value={18}>18%</MenuItem>
                  <MenuItem value={28}>28%</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Pricing */}
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Pricing
            </Typography>

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Purchase Price"
                  name="purchasePrice"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Typography
                          sx={{
                            mr: 1,
                            color: "text.secondary",
                          }}
                        >
                          ₹
                        </Typography>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Selling Price"
                  name="sellingPrice"
                  value={form.sellingPrice}
                  onChange={handleChange}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Typography
                          sx={{
                            mr: 1,
                            color: "text.secondary",
                          }}
                        >
                          ₹
                        </Typography>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Description */}
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Additional Information
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Enter product description"
            />

            {/* Actions */}
            <Stack
              sx={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 2, mt: 4 }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={saving || loading || Boolean(error && isEditing) || invalidProductId}
              >
                {saving
                ? "Saving..."
                  : isEditing ? "Save Changes" : "Save Product"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>}
    </Box>
  );
}

export default ProductCreate;
