import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import BusinessIcon from "@mui/icons-material/Business";
import { NavLink } from "react-router-dom";
import { getCompanyDetails } from "../../api/companyApi";

const drawerWidth = 252;

interface ResponsiveDrawerProps { children: React.ReactNode; }
interface MenuItem { text: string; path: string; icon: React.ReactNode; }

const menuItems: MenuItem[] = [
  { text: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { text: "Products", path: "/products", icon: <InventoryIcon /> },
  { text: "Customers", path: "/customers", icon: <PeopleIcon /> },
  { text: "Invoices", path: "/invoices", icon: <ReceiptIcon /> },
  { text: "Company details", path: "/company", icon: <BusinessIcon /> },
  { text: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export default function ResponsiveDrawer({ children }: ResponsiveDrawerProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [companyName, setCompanyName] = React.useState(() => {
    try {
      const saved = localStorage.getItem("billing-app-company-details");
      return saved ? (JSON.parse(saved) as { companyName?: string }).companyName?.trim() ?? "" : "";
    } catch {
      return "";
    }
  });

  React.useEffect(() => {
    let cancelled = false;
    getCompanyDetails()
      .then((details) => {
        if (!cancelled && details?.companyName?.trim()) setCompanyName(details.companyName.trim());
      })
      .catch(() => { /* Keep the cached name if the API is unavailable. */ });
    return () => { cancelled = true; };
  }, []);
  const drawer = (
    <Box sx={{ height: "100%", bgcolor: "background.paper" }}>
      <Toolbar sx={{ minHeight: "76px !important", px: 2.5, gap: 1.5 }}>
        <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "#fff", borderRadius: 2, fontWeight: 800, fontSize: 20 }}>B</Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>YazSba</Typography>
          <Typography variant="caption" color="text.secondary">Business workspace</Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ display: "block", px: 2.5, pt: 2.5, pb: 1, fontWeight: 700, letterSpacing: ".08em" }}>Workspace</Typography>
      <List sx={{ px: 1.5, pt: 0 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                minHeight: 44,
                borderRadius: 2,
                color: "text.secondary",
                "& .MuiListItemIcon-root": { color: "inherit", minWidth: 38 },
                "&.active": { bgcolor: "primary.light", color: "primary.dark", fontWeight: 700 },
                "&.active .MuiListItemIcon-root": { color: "primary.main" },
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} sx={{ "& .MuiListItemText-primary": { fontSize: 14, fontWeight: 600 } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ position: "absolute", bottom: 0, width: "100%", px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">Billing workspace</Typography>
      </Box>
    </Box>
  );

  return (
    <Box id="app-shell" sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <AppBar id="app-header" position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider", width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
        <Toolbar sx={{ minHeight: "68px !important", px: { xs: 2, md: 3 } }}>
          <IconButton aria-label="Open navigation" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5, display: { sm: "none" } }}><MenuIcon /></IconButton>
          <Box>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, maxWidth: { xs: 240, sm: 520 } }}>{companyName || "Billing workspace"}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>Manage your products, customers and invoices</Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box id="app-nav" component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="Main navigation">
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}>{drawer}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: "none", sm: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, borderRight: 1, borderColor: "divider" } }}>{drawer}</Drawer>
      </Box>
      <Box id="app-main" component="main" sx={{ flexGrow: 1, minWidth: 0, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar id="app-main-spacer" sx={{ minHeight: "68px !important" }} />
        <Box id="app-content" sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1520, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
