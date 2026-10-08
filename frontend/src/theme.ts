import { createTheme } from "@mui/material/styles";

export const colorThemes = [
  { id: "indigo", name: "Indigo & Sage", description: "Bright indigo with a fresh green accent.", main: "#4f6bed", dark: "#354fc2", light: "#e8edff", secondary: "#13a88a" },
  { id: "ocean", name: "Ocean & Sky", description: "Clear ocean blue with a lively sky accent.", main: "#0b82b8", dark: "#09658f", light: "#e1f5fd", secondary: "#00a7c4" },
  { id: "forest", name: "Green & Spring", description: "Fresh green paired with a bright spring accent.", main: "#168956", dark: "#0d6b43", light: "#e4f6ec", secondary: "#25a88a" },
  { id: "violet", name: "Violet & Rose", description: "Vivid violet balanced with a warm rose accent.", main: "#8155d9", dark: "#6540ad", light: "#f0eafe", secondary: "#d95b90" },
  { id: "slate", name: "Slate & Amber", description: "Clean slate with a cheerful amber accent.", main: "#526579", dark: "#34475a", light: "#eaf1f7", secondary: "#e4a23b" },
] as const;

export const textThemes = [
  { id: "modern", name: "Modern Sans", description: "Crisp headings and comfortable reading.", bodyFont: 'Inter, "Segoe UI", Roboto, Arial, sans-serif', headingFont: 'Inter, "Segoe UI", Roboto, Arial, sans-serif', bodySize: "1rem", lineHeight: 1.5, headingWeight: 750, tracking: "-0.035em" },
  { id: "classic", name: "Classic Roboto", description: "Familiar, neutral, and easy to scan.", bodyFont: 'Roboto, Arial, sans-serif', headingFont: 'Roboto, Arial, sans-serif', bodySize: "1rem", lineHeight: 1.5, headingWeight: 700, tracking: "-0.015em" },
  { id: "humanist", name: "Friendly Humanist", description: "Open letterforms and relaxed spacing.", bodyFont: '"Trebuchet MS", "Segoe UI", sans-serif', headingFont: '"Trebuchet MS", "Segoe UI", sans-serif', bodySize: "1rem", lineHeight: 1.62, headingWeight: 700, tracking: "-0.01em" },
  { id: "editorial", name: "Editorial Serif", description: "Serif titles paired with a clean interface face.", bodyFont: '"Segoe UI", Arial, sans-serif', headingFont: 'Georgia, "Times New Roman", serif', bodySize: "1rem", lineHeight: 1.55, headingWeight: 700, tracking: "-0.02em" },
  { id: "compact", name: "Compact System", description: "A space-efficient system font for dense work.", bodyFont: 'system-ui, -apple-system, "Segoe UI", sans-serif', headingFont: 'system-ui, -apple-system, "Segoe UI", sans-serif', bodySize: "0.94rem", lineHeight: 1.42, headingWeight: 700, tracking: "-0.02em" },
] as const;

export type ColorThemeId = (typeof colorThemes)[number]["id"];
export type TextThemeId = (typeof textThemes)[number]["id"];

export function createAppTheme(colorId: ColorThemeId, textId: TextThemeId) {
  const colors = colorThemes.find((theme) => theme.id === colorId) ?? colorThemes[0];
  const type = textThemes.find((theme) => theme.id === textId) ?? textThemes[0];

  return createTheme({
    palette: {
      mode: "light",
      primary: { main: colors.main, dark: colors.dark, light: colors.light },
      secondary: { main: colors.secondary },
      background: { default: "#f9fbff", paper: "#ffffff" },
      text: { primary: "#172033", secondary: "#667085" },
      divider: "#e6eaf0",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: type.bodyFont,
      fontSize: Number.parseFloat(type.bodySize) * 16,
      body1: { fontFamily: type.bodyFont, lineHeight: type.lineHeight },
      body2: { fontFamily: type.bodyFont, lineHeight: type.lineHeight },
      h1: { fontFamily: type.headingFont, fontWeight: type.headingWeight, letterSpacing: type.tracking },
      h2: { fontFamily: type.headingFont, fontWeight: type.headingWeight, letterSpacing: type.tracking },
      h3: { fontFamily: type.headingFont, fontWeight: type.headingWeight, letterSpacing: type.tracking },
      h4: { fontFamily: type.headingFont, fontSize: "1.8rem", fontWeight: type.headingWeight, letterSpacing: type.tracking },
      h5: { fontFamily: type.headingFont, fontWeight: type.headingWeight, letterSpacing: type.tracking },
      h6: { fontFamily: type.headingFont, fontWeight: type.headingWeight, letterSpacing: type.tracking },
      button: { fontFamily: type.bodyFont, textTransform: "none", fontWeight: 650 },
    },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 10, minHeight: 40 } } },
      MuiCard: { styleOverrides: { root: { boxShadow: "0 1px 3px rgba(16,24,40,.04)" } } },
      MuiPaper: { styleOverrides: { outlined: { borderColor: "#e6eaf0" } } },
      MuiTableCell: { styleOverrides: { head: { color: "#667085", fontWeight: 700, backgroundColor: "#f8f9fc" } } },
      MuiTextField: { defaultProps: { size: "small" } },
    },
  });
}
