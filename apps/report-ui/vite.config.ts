import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: "../../packages/cli/ui-dist",
    emptyOutDir: true,
  },
});
