import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { include: ["src/lib/domain/**", "src/lib/data/catalog-shared.ts"], exclude: ["**/__tests__/**"] },
  },
});
