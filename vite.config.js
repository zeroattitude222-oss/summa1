import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      // Allow serving files from WASM modules
      allow: ['..']
    }
  },
  build: {
    // Ensure WASM files are included in build
    assetsInclude: ['**/*.wasm'],
    rollupOptions: {
      output: {
        // Keep WASM files in assets directory
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'wasm/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@rustup/wasm']
  },
  define: {
    // Define environment variables for WASM paths
    __WASM_PYTHON_PATH__: JSON.stringify('/wasm/python/'),
    __WASM_RUST_PATH__: JSON.stringify('/wasm/rust/')
  }
});