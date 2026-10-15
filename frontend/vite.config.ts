import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  root: ".",
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.BACKEND_URL ?? "http://127.0.0.1:3000",
    },
  },
});
