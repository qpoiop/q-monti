import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Stamps dist/sw.js with a fresh build id so browsers actually see a
 * changed SW payload after each deploy. Without this the cache key
 * (`momonti-<VERSION>`) stayed constant and updatefound never fired.
 */
function swVersionStamp() {
  return {
    name: "sw-version-stamp",
    apply: "build" as const,
    async closeBundle() {
      const swPath = resolve(fileURLToPath(new URL("./dist/sw.js", import.meta.url)));
      try {
        const src = await readFile(swPath, "utf8");
        const stamped = src.replace(/__BUILD_VERSION__/g, new Date().toISOString());
        await writeFile(swPath, stamped);
      } catch {
        /* file missing — SW disabled build */
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionStamp()],
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@web": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8787",
        ws: true,
        changeOrigin: true,
      },
      "/api": "http://127.0.0.1:8787",
    },
  },
});
