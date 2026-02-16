import type { Config } from "tailwindcss";
const defaultTheme = require("tailwindcss/resolveConfig")(
  require("tailwindcss/defaultConfig")
).theme;
const sansFontFamily = ["Roboto", ...defaultTheme.fontFamily.sans];

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      sans: sansFontFamily,
    },
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        danger: "var(--color-danger)",
        muted: "var(--color-muted)",
        highlight: "var(--color-highlight)",
        body: "var(--color-body)",
        fg: "var(--color-fg)",
        inverse: "var(--color-inverse)",

        default: {
          0: "var(--color-default-0)",
          1: "var(--color-default-1)",
          2: "var(--color-default-2)",
          3: "var(--color-default-3)",
          4: "var(--color-default-4)",
          5: "var(--color-default-5)",
          6: "var(--color-default-6)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
        },
      },
      animation: {
        "fade-in-down": "fadeInDown 250ms linear",
      },
      keyframes: {
        fadeInDown: {
          "0%": { opacity: "0", transform: "translate3d(0, -100%, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
