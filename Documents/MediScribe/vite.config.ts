import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === 'production', // Source maps uniquement en production
  },
  // Configuration pour éviter les warnings de source maps en développement
  esbuild: {
    sourcemap: false, // Désactiver source maps esbuild en dev
  },
  optimizeDeps: {
    // Ne pas générer de source maps pour les dépendances optimisées
    esbuildOptions: {
      sourcemap: false,
    },
  },
}));
