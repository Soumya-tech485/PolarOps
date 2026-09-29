import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PolarOps",
        short_name: "PolarOps",
        description: "Offline-first polar expedition logistics (SIH26062)",
        theme_color: "#1f6fb0",
        background_color: "#f4f9fd",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/offline-map-tiles\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "osm-tiles", expiration: { maxEntries: 500 } }
          },
          {
            urlPattern: ({ request, url }) =>
              request.method === "GET" &&
              ["/cargo", "/inventory", "/voyages", "/personnel", "/assets",
               "/forecast", "/emergency", "/audit", "/indents", "/auth/me", "/stations"]
                .some((p) => url.pathname.startsWith(p)),
            handler: "NetworkFirst",
            options: { cacheName: "api-get", networkTimeoutSeconds: 4 }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://localhost:8000", changeOrigin: true },
      "/stations": { target: "http://localhost:8000", changeOrigin: true },
      "/cargo": { target: "http://localhost:8000", changeOrigin: true },
      "/indents": { target: "http://localhost:8000", changeOrigin: true },
      "/inventory": { target: "http://localhost:8000", changeOrigin: true },
      "/voyages": { target: "http://localhost:8000", changeOrigin: true },
      "/personnel": { target: "http://localhost:8000", changeOrigin: true },
      "/assets": { target: "http://localhost:8000", changeOrigin: true },
      "/audit": { target: "http://localhost:8000", changeOrigin: true },
      "/forecast": { target: "http://localhost:8000", changeOrigin: true },
      "/optimize": { target: "http://localhost:8000", changeOrigin: true },
      "/emergency": { target: "http://localhost:8000", changeOrigin: true },
      "/sync": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
    }
  }
});