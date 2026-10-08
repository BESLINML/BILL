import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import BusinessIcon from "@mui/icons-material/Business";
import InventoryIcon from "@mui/icons-material/Inventory";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Button from "@mui/material/Button";
import { Link } from "react-router-dom";

const pages = [
  { title: "Products", path: "/products", description: "Manage your products and inventory.", icon: <InventoryIcon fontSize="large" /> },
  { title: "Customers", path: "/customers", description: "View and manage your customers.", icon: <PeopleIcon fontSize="large" /> },
  { title: "Invoices", path: "/invoices", description: "Create and track invoices.", icon: <ReceiptIcon fontSize="large" /> },
  { title: "Company Details", path: "/company", description: "Manage your company information.", icon: <BusinessIcon fontSize="large" /> },
  { title: "Settings", path: "/settings", description: "Configure your billing workspace.", icon: <SettingsIcon fontSize="large" /> },
];

export default function Dashboard() {
  return (
    <Box>
      <Card sx={{
        overflow: "hidden",
        mb: 3,
        color: "text.primary",
        background: (theme) => `linear-gradient(115deg, ${theme.palette.primary.light} 0%, #ffffff 82%)`,
        borderColor: "primary.light",
        boxShadow: (theme) => `0 14px 36px ${theme.palette.primary.main}12`,
      }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 }, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
          <Box>
            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: ".12em" }}>BILLING OVERVIEW</Typography>
            <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 750, mt: 0.5 }}>Your business, in good order.</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Manage products, customers and invoices from one place.</Typography>
          </Box>
          <Button component={Link} to="/invoices/create" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ px: 2.5 }}>
            Create invoice
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 750 }}>Workspace</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Choose where you want to work.</Typography>
      </Box>

      <Grid container spacing={2}>
        {pages.map((page) => (
          <Grid key={page.title} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card variant="outlined" sx={{ height: "100%", borderRadius: 3, transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease", "&:hover": { transform: "translateY(-2px)", borderColor: "primary.light", boxShadow: "0 10px 26px rgba(16,24,40,.08)" } }}>
              <CardActionArea
                component={Link}
                to={page.path}
                sx={{ height: "100%" }}
              >
                <CardContent sx={{ minHeight: 174, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, p: 2.5, textAlign: "center" }}>
                  <Box sx={{
                    width: 52,
                    height: 52,
                    flexShrink: 0,
                    alignSelf: "center",
                    borderRadius: 2.5,
                    bgcolor: "primary.light",
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { display: "block", margin: "auto" },
                  }}>
                    {page.icon}
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 650 }}>
                      {page.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {page.description}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
