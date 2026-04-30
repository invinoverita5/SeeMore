import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      importSource: "react",
      runtime: "automatic"
    }
  },
  test: {
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts", "tests/**/*.test.ts"]
  }
});
