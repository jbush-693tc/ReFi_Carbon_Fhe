import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  },
  esbuild: {
    target: "es2022",
    supported: {
      'import-assertions': true
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
      supported: {
        'import-assertions': true
      }
    }
  }
});