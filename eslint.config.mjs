import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Weniger strikte Regeln für bessere Entwicklererfahrung
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
    }
  },
  {
    // Spezielle Regeln für Legacy JavaScript-Dateien
    files: ["*.js", "scripts/**/*.js", "test-*.js", "check-*.js", "clear-*.js", "debug-*.js", "migrate-*.js", "set-*.js", "update-*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    }
  },
  {
    // Ignoriere generierte Dateien
    ignores: [
      "dataconnect-generated/**/*",
      "firebase_functions/lib/**/*",
      "node_modules/**/*",
      ".next/**/*",
      "out/**/*",
    ]
  }
];

export default eslintConfig;
