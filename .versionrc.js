const manifest = {
    filename: "./src/module.json",
    updater: require("./update-manifest.js")
};

module.exports = {
    bumpFiles: [manifest]
}
