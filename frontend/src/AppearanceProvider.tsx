import { useCallback, useEffect, useMemo, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { colorThemes, createAppTheme, textThemes, type ColorThemeId, type TextThemeId } from "./theme";
import { AppearanceContext, type Appearance } from "./appearanceContext";

const STORAGE_KEY = "billing-app-appearance";

const defaults: Appearance = { colorTheme: "indigo", textTheme: "modern" };

function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<Appearance> | null;
    return {
      colorTheme: colorThemes.find((theme) => theme.id === saved?.colorTheme)?.id ?? defaults.colorTheme,
      textTheme: textThemes.find((theme) => theme.id === saved?.textTheme)?.id ?? defaults.textTheme,
    };
  } catch {
    return defaults;
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState(readAppearance);
  const setColorTheme = useCallback((colorTheme: ColorThemeId) => setAppearance((current) => ({ ...current, colorTheme })), []);
  const setTextTheme = useCallback((textTheme: TextThemeId) => setAppearance((current) => ({ ...current, textTheme })), []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance)); } catch { /* Keep the selection active for this session. */ }
  }, [appearance]);

  const theme = useMemo(() => createAppTheme(appearance.colorTheme, appearance.textTheme), [appearance]);
  const value = useMemo(() => ({ ...appearance, setColorTheme, setTextTheme }), [appearance, setColorTheme, setTextTheme]);

  return <AppearanceContext.Provider value={value}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></AppearanceContext.Provider>;
}
