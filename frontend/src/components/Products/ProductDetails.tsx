import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { ArrowBack, Edit } from "@mui/icons-material";
import { getProductById } from "../../api/productApi";
import type { Product } from "../../types/ProductType";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = Number(id);
  const invalidProductId = !Number.isInteger(productId) || productId < 1;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invalidProductId) return;
    let cancelled = false;
    getProductById(productId)
      .then((result) => { if (!cancelled) setProduct(result); })
      .catch(() => { if (!cancelled) setError("Failed to load product."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, invalidProductId, productId]);

  return (
    <Box>
      <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Product details</Typography>
          <Typography color="text.secondary">View inventory and pricing information.</Typography>
        </Box>
        <Stack sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate("/products")}>Back</Button>
          {product && <Button variant="contained" startIcon={<Edit />} onClick={() => navigate(`/products/${product.id}/edit`)}>Edit</Button>}
        </Stack>
      </Stack>
      {(error || invalidProductId) && <Alert severity="error">{error || "Invalid product ID."}</Alert>}
      {loading && !invalidProductId && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}
      {product && <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{product.name}</Typography>
        {product.description && <Typography color="text.secondary" sx={{ mt: 1 }}>{product.description}</Typography>}
        <Stack sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 2 }}>
          <Chip label={product.active ? "Active" : "Inactive"} color={product.active ? "success" : "default"} />
          <Chip label={`GST ${product.gstRate}%`} variant="outlined" />
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 3 }}>
          <Typography><strong>SKU:</strong> {product.sku}</Typography>
          <Typography><strong>HSN/SAC:</strong> {product.hsn}</Typography>
          <Typography><strong>Purchase price:</strong> ₹{Number(product.purchasePrice).toFixed(2)}</Typography>
          <Typography><strong>Selling price:</strong> ₹{Number(product.sellingPrice).toFixed(2)}</Typography>
        </Box>
      </Paper>}
    </Box>
  );
}
