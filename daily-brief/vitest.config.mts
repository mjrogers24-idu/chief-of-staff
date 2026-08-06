import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // functions/ is a separate deployable with its own package.json,
    // node_modules, and vitest config — don't let this project's `npm test`
    // wander into it (or vice versa).
    exclude: ["**/node_modules/**", "functions/**"],
  },
});
