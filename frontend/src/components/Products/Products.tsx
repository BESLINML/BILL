import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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

import {
  Add,
  Delete,
  Edit,
  Search,
  Visibility,
} from "@mui/icons-material";

import { deleteProduct, getProducts } from "../../api/productApi";
import type { Product } from "../../types/ProductType";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

function ProductView() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setError("Failed to load products.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await deleteProduct(id);

      setProducts((prev) =>
        prev.filter((product) => product.id !== id)
      );
    } catch (error) {
      console.error(error);
      setError("Failed to delete product.");
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchText = debouncedSearch.toLowerCase().trim();

    return (
      product.name.toLowerCase().includes(searchText) ||
      product.sku.toLowerCase().includes(searchText) ||
      product.hsn.toLowerCase().includes(searchText)
    );
  });

  return (
    <Box>
      {/* Page Header */}
      <Stack
        sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Products
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Manage your products, pricing and GST information.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/products/create")}
        >
          Add Product
        </Button>
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Product Card */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Card Header */}
        <Stack
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 2, p: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Product List
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {products.length} product
              {products.length !== 1 ? "s" : ""} available
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: {
                xs: "100%",
                md: 300,
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                ),
              },
            }}
          />
        </Stack>

        {/* Loading */}
        {loading ? (
          <Box
            sx={{
              py: 10,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <Box
            sx={{
              py: 10,
              textAlign: "center",
              px: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600 }}
              gutterBottom
            >
              {products.length === 0
                ? "No products added"
                : "No matching products"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {products.length === 0
                ? "Create your first product to get started."
                : "Try searching with another product name, SKU or HSN/SAC."}
            </Typography>

            {products.length === 0 && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate("/products/create")}
              >
                Create Product
              </Button>
            )}
          </Box>
        ) : (
          /* Product Table */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "grey.50",
                  }}
                >
                  <TableCell>
                    <strong>Product</strong>
                  </TableCell>

                  <TableCell>
                    <strong>SKU</strong>
                  </TableCell>

                  <TableCell>
                    <strong>HSN/SAC</strong>
                  </TableCell>

                  <TableCell align="right">
                    <strong>Purchase</strong>
                  </TableCell>

                  <TableCell align="right">
                    <strong>Selling</strong>
                  </TableCell>

                  <TableCell>
                    <strong>GST</strong>
                  </TableCell>

                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>

                  <TableCell align="center">
                    <strong>Actions</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                  >
                    {/* Product */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                      >
                        {product.name}
                      </Typography>

                      {product.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            maxWidth: 250,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.description}
                        </Typography>
                      )}
                    </TableCell>

                    {/* SKU */}
                    <TableCell>
                      {product.sku}
                    </TableCell>

                    {/* HSN */}
                    <TableCell>
                      {product.hsn}
                    </TableCell>

                    {/* Purchase */}
                    <TableCell align="right">
                      ₹
                      {Number(
                        product.purchasePrice
                      ).toFixed(2)}
                    </TableCell>

                    {/* Selling */}
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 600 }}>
                        ₹
                        {Number(
                          product.sellingPrice
                        ).toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* GST */}
                    <TableCell>
                      <Chip
                        label={`${product.gstRate}%`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={
                          product.active
                            ? "Active"
                            : "Inactive"
                        }
                        size="small"
                        color={
                          product.active
                            ? "success"
                            : "default"
                        }
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Stack
                        sx={{ display: "flex", flexDirection: "row", gap: 0.5, justifyContent: "center" }}
                      >
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            navigate(
                              `/products/${product.id}`
                            )
                          }
                          title="View"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            navigate(
                              `/products/${product.id}/edit`
                            )
                          }
                          title="Edit"
                        >
                          <Edit fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDelete(product.id)
                          }
                          title="Delete"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
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

export default ProductView;
