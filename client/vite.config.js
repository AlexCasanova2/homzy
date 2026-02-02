import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  css: {
    // Avoid auto-loading PostCSS config from disk.
    postcss: {
      plugins: [],
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5177",
    },
  },
});
