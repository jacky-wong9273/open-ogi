import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@open-ogi/client", "@open-ogi/shared"],
      }),
    ],
    resolve: {
      alias: {
        "@open-ogi/client": resolve(__dirname, "../client/src/index.ts"),
        "@open-ogi/shared": resolve(__dirname, "../shared/src/index.ts"),
      },
    },
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
        external: ["bufferutil", "utf-8-validate"],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      outDir: resolve(__dirname, "dist/renderer"),
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html"),
      },
    },
    plugins: [react()],
  },
});
