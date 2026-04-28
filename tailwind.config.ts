import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6a5c51",
        "primary-dim": "#5e5046",
        "primary-container": "#f3dfd1",
        "on-primary": "#fff6f2",
        "on-primary-container": "#5d4f45",
        secondary: "#665d59",
        "secondary-container": "#ece0da",
        "on-secondary": "#fff7f4",
        "on-secondary-container": "#58504c",
        tertiary: "#705c37",
        "tertiary-container": "#fde2b3",
        "on-tertiary-container": "#63512d",
        background: "#fff8f5",
        "on-background": "#36322e",
        surface: "#fff8f5",
        "surface-dim": "#e2d8d2",
        "surface-bright": "#fff8f5",
        "surface-variant": "#eae1db",
        "surface-container": "#f4ece8",
        "surface-container-low": "#f9f2ef",
        "surface-container-high": "#efe7e2",
        "surface-container-highest": "#eae1db",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#36322e",
        "on-surface-variant": "#645e5a",
        outline: "#807975",
        "outline-variant": "#b8b0ac",
        error: "#9e422c",
        "error-container": "#fe8b70",
        "on-error": "#fff7f6",
        "on-error-container": "#742410",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
