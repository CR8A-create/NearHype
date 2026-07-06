import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Decisión documentada en docs/adr/001-imagenes-img-vs-next-image.md:
      // las imágenes del feed vienen de dominios arbitrarios y next/image
      // agotaría la cuota de optimización del free tier de Vercel.
      // Se usa <img loading="lazy" decoding="async"> en su lugar.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
