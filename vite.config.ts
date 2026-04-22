import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const BUILD_HASH = (() => {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
})();
const BUILD_TIME = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __BUILD_MODE__: JSON.stringify(mode),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@student": path.resolve(__dirname, "./src/student"),
      "@admin": path.resolve(__dirname, "./src/admin"),
      "@teacher": path.resolve(__dirname, "./src/teacher"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy vendors into separate chunks for parallel download + better caching.
        // Each chunk is requested only by routes that actually need it.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          // CRITICAL: React must be checked FIRST so it's never bundled into
          // another vendor chunk (e.g. vendor-radix). Otherwise consumers can
          // load before React is initialized → "Cannot read properties of
          // undefined (reading 'forwardRef')".
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react/jsx-runtime") ||
            id.includes("/node_modules/react/jsx-dev-runtime")
          ) {
            return "vendor-react";
          }
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("html2canvas") || id.includes("jspdf")) return "vendor-pdf";
        },
      },
    },
  },
}));
