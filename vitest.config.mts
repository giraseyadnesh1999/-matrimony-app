import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": src(""),
      // `server-only` throws outside the Next.js server bundle; neutralise it for unit tests.
      "server-only": src("test/empty.ts"),
    },
  },
});
