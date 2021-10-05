require("esbuild").buildSync({
  entryPoints: ["quench-init.js"],
  bundle: true,
  minify: false,
  sourcemap: true,
  outfile: "quench.js",
});
