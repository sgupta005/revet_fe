import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // shadcn CLI-generated primitives — authored to shadcn's standards, not
    // hand-edited (see architecture.md invariant #5).
    "components/ui/**",
    "hooks/use-mobile.ts",
  ]),
]);

export default eslintConfig;
