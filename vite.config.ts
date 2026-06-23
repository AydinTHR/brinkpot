/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the built site works both locally and under the GitHub Pages
// project subpath (https://AydinTHR.github.io/brinkpot/) without a hardcoded prefix.
// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    // Unit tests live next to source as *.test.ts(x). Playwright specs (e2e/*.spec.ts)
    // are intentionally excluded so the two runners never collide.
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Gate the pure, deterministic logic. The React UI is covered by Playwright e2e.
      include: ["src/engine/**", "src/fair/**", "src/bots/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        // Lower than the rest by design: the remaining uncovered branches are
        // defensive guards (crypto unavailable, name-pool exhaustion) not worth
        // contorting tests to reach.
        branches: 80,
        statements: 90,
      },
    },
  },
});
