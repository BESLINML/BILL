import { createContext } from "react";
import type { ColorThemeId, TextThemeId } from "./theme";

export interface Appearance {
  colorTheme: ColorThemeId;
  textTheme: TextThemeId;
}

export interface AppearanceContextValue extends Appearance {
  setColorTheme: (value: ColorThemeId) => void;
  setTextTheme: (value: TextThemeId) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);
