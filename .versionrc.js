const manifest = {
  filename: "./src/module.json",
  updater: require("./update-manifest.js"),
};

const packageJson = {
  filename: "./package.json",
  type: "json",
};

module.exports = {
  packageFiles: [manifest],
  bumpFiles: [packageJson],
};
