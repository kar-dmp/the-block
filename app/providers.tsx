"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#0b5cff", dark: "#073bb3", light: "#eaf1ff" },
    success: { main: "#0e9f6e" },
    warning: { main: "#e29324" },
    text: { primary: "#0c1930", secondary: "#5f6b7c" },
    background: { default: "#f4f6fa", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-geist), Arial, sans-serif",
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { MenuProps: { disableScrollLock: true } } },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
