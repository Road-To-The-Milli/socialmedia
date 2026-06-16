import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
  preview: {
    allowedHosts: ["chill.samuelrilos.com", "the.nouschill.fr", "nouschill.fr", "app.nouschill.fr"],
    port: 3000,
    host: "0.0.0.0",
  },
  server: {
    allowedHosts: ["the.nouschill.fr", "nouschill.fr", "app.nouschill.fr"],
    host: "0.0.0.0",
    port: 3000,
  },
});
