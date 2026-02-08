"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2563eb"
    },
    secondary: {
      main: "#7c3aed"
    },
    background: {
      default: "#0b1220",
      paper: "#111827"
    }
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"].join(",")
  }
});

