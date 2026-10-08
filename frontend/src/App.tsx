  import { lazy, Suspense } from "react";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import Box from "@mui/material/Box";
  import CircularProgress from "@mui/material/CircularProgress";

  import ResponsiveDrawer from "./components/Layout/ResponsiveDrawer";

  const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
  const Products = lazy(() => import("./components/Products/Products"));
  const ProductCreate = lazy(() => import("./components/Products/ProductCreate"));
  const ProductDetails = lazy(() => import("./components/Products/ProductDetails"));
  const Customers = lazy(() => import("./components/Customers/Customers"));
  const Invoices = lazy(() => import("./components/Invoices/Invoices"));
  const InvoiceCreate = lazy(() => import("./components/Invoices/InvoiceCreate"));
  const InvoiceDetails = lazy(() => import("./components/Invoices/InvoiceDetails"));
  const Settings = lazy(() => import("./components/Settings/Settings"));
  const CompanyDetails = lazy(() => import("./components/CompanyDetails/CompanyDetails"));


  function App() {
    return (
      <BrowserRouter>
        <ResponsiveDrawer>
          <Suspense fallback={<Box sx={{ display: "grid", minHeight: 240, placeItems: "center" }}><CircularProgress /></Box>}>
          <Routes>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/products"
              element={<Products />}
            />
    <Route
              path="/products/create"
              element={<ProductCreate />}
            />  
            <Route path="/products/:id/edit" element={<ProductCreate />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route
              path="/customers"
              element={<Customers />}
            />

            <Route
              path="/invoices"
              element={<Invoices />}
            />
            <Route path="/invoices/create" element={<InvoiceCreate />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />

  
            <Route
              path="/settings"
              element={<Settings />}
            />
            <Route path="/company" element={<CompanyDetails />} />
            <Route path="*" element={<main><h1>Page not found</h1></main>} />
          </Routes>
          </Suspense>
        </ResponsiveDrawer>
      </BrowserRouter>
    );
  }

  export default App;
