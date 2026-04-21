import { builtinModules } from "node:module";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  build: {
    target: "node22",
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: [
        "node-pty",
        "vite",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
