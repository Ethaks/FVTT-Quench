import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import checker from "vite-plugin-checker";
import * as path from "node:path";
import * as url from "node:url";
import { copy } from "@guanghechen/rollup-plugin-copy";
import terser from "@rollup/plugin-terser";

function resolve(relativePath: string) {
  return path.resolve(url.fileURLToPath(new URL(".", import.meta.url)), relativePath);
}

const COPY_FILES = ["README.md", "LICENSE", "CREDITS.md"];

const config = defineConfig(({ mode }) => ({
  root: "src/",
  base: "/modules/quench/",
  publicDir: resolve("public"),
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  server: {
    port: 30_001,
    open: false,
    proxy: {
      "^(?!/modules/quench)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2022" },
  },
  build: {
    outDir: resolve("dist"),
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
    rollupOptions: {
      output: {
        sourcemapPathTransform: (relative) => {
          // Relative paths start with a `../`, which moves the path out of the `systems/pf1` directory.
          if (relative.startsWith("../")) relative = relative.replace("../", "");
          return relative;
        },
      },
      plugins: [terser({ mangle: { keep_classnames: true, keep_fnames: true } })],
    },
    reportCompressedSize: true,
    lib: {
      name: "quench",
      entry: resolve("src/module/quench-init.ts"),
      formats: ["es"],
      fileName: () => "quench.js",
    },
  },
  plugins: [
    checker({
      typescript: true,
    }),
    visualizer({
      template: "treemap",
      sourcemap: true,
    }),
    copy({ targets: [{ src: COPY_FILES, dest: resolve("dist") }], hook: "writeBundle" }),
  ],
}));

export default config;
