import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Daily Brief's brand palette — warm coral (primary) + sage
        // (secondary), chosen to feel like a family app rather than a
        // corporate/professional one.
        brand: {
          50: "#FDF4F1",
          100: "#FBE7E0",
          200: "#F5C7B8",
          300: "#EEA48D",
          400: "#E67F5F",
          500: "#D9633F",
          600: "#BC4C2C",
          700: "#983C23",
          800: "#7A311D",
          900: "#5F2716",
        },
        sage: {
          50: "#F5F7F1",
          100: "#E8EDE0",
          200: "#CFDBBF",
          300: "#B0C598",
          400: "#93AF77",
          500: "#78975C",
          600: "#607B48",
          700: "#4C6239",
          800: "#3D4E2E",
          900: "#313E26",
        },
      },
    },
  },
  plugins: [],
};
export default config;
