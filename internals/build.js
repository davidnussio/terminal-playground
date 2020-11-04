require("esbuild").buildSync({
  entryPoints: ["./src/term.js"],
  bundle: true,
  define: { "process.env.NODE_ENV": "production" },
  target: "node12",
  platform: "node",
  //   splitting: true,
  //   inject: [],
  //   external: ["terminal-kit"],
  format: "cjs",
  outdir: "app",
});

//   '--define:process.env.NODE_ENV="production"' --platform=node --target='node12' --bundle --outfile=app.js
