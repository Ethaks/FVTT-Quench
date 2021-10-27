const chalk = require("chalk");
const fs = require("fs-extra");
const gulp = require("gulp");
const esbuild = require("esbuild");

/********************/
/*  CONFIGURATION   */
/********************/

const name = "quench";
const sourceDirectory = "./src";
const distDirectory = "./dist";
const stylesDirectory = `${sourceDirectory}/styles`;
const stylesExtension = "css";
const sourceFileExtension = "ts";
const staticFiles = ["lang", "templates", "module.json"];
const distFiles = ["LICENSE"];
const getDownloadURL = (version) =>
  `https://github.com/Ethaks/FVTT-Quench/releases/download/${version}/module.zip`;

/********************/
/*      BUILD       */
/********************/

/**
 * ESBuild's previous result for incremental builds
 * @type {esbuild.BuildResult|null}
 */
let buildResult = null;
/**
 * Build the distributable JavaScript code
 *
 * @param {boolean} prod - Whether this build is meant for production
 * @returns {Promise<esbuild.BuildResult>}
 */
async function _buildCode(prod = false) {
  if (!buildResult)
    buildResult = await esbuild.build({
      entryPoints: [`${sourceDirectory}/module/quench-init.ts`],
      bundle: true,
      sourcemap: true,
      outfile: `${distDirectory}/${name}.js`,
      sourceRoot: name,
      format: "iife",
      legalComments: "none",
      minify: prod,
      keepNames: true,
      incremental: !prod,
    });
  else {
    buildResult = await buildResult.rebuild();
  }

  return buildResult;
}

/** Build JS for development */
function buildDev() {
  return _buildCode(false);
}

/** Build JS for production */
function buildProd() {
  return _buildCode(true);
}

/**
 * Build style sheets
 */
function buildStyles() {
  return gulp
    .src(`${stylesDirectory}/${name}.${stylesExtension}`)
    .pipe(gulp.dest(`${distDirectory}/styles`));
}

/**
 * Copy static files
 */
async function copyFiles() {
  for (const file of staticFiles) {
    if (fs.existsSync(`${sourceDirectory}/${file}`)) {
      await fs.copy(`${sourceDirectory}/${file}`, `${distDirectory}/${file}`);
    }
  }
  for (const file of distFiles) {
    if (fs.existsSync(file)) await fs.copy(file, `${distDirectory}/${file}`);
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch(`${sourceDirectory}/**/*.${sourceFileExtension}`, { ignoreInitial: false }, buildDev);
  gulp.watch(`${stylesDirectory}/**/*.${stylesExtension}`, { ignoreInitial: false }, buildStyles);
  gulp.watch(
    staticFiles.map((file) => `${sourceDirectory}/${file}`),
    { ignoreInitial: false },
    copyFiles,
  );
}

/********************/
/*      CLEAN       */
/********************/

/**
 * Remove built files from `dist` folder while ignoring source files
 */
async function clean() {
  const files = [...staticFiles, "module"];

  if (fs.existsSync(`${stylesDirectory}/${name}.${stylesExtension}`)) {
    files.push("styles");
  }

  console.log(" ", chalk.yellow("Files to clean:"));
  console.log("   ", chalk.blueBright(files.join("\n    ")));

  for (const filePath of files) {
    await fs.remove(`${distDirectory}/${filePath}`);
  }
}

/********************/
/*    VERSIONING    */
/********************/

/**
 * Get the contents of the manifest file as object.
 */
function getManifest() {
  const manifestPath = `${sourceDirectory}/module.json`;

  if (fs.existsSync(manifestPath)) {
    return {
      file: fs.readJSONSync(manifestPath),
      name: "module.json",
    };
  }
}

/**
 * Update version and download URL.
 */
function bumpVersion(cb) {
  const packageJson = fs.readJSONSync("package.json");
  const manifest = getManifest();

  if (!manifest) cb(Error(chalk.red("Manifest JSON not found")));

  try {
    const targetVersion = packageJson.version;

    if (!targetVersion) {
      return cb(new Error(chalk.red("Error: Incorrect version arguments")));
    }

    console.log(`Updating version number to '${targetVersion}'`);

    manifest.file.version = targetVersion;
    manifest.file.download = getDownloadURL(targetVersion);
    fs.writeJSONSync(`${sourceDirectory}/${manifest.name}`, manifest.file, { spaces: 2 });

    return cb();
  } catch (err) {
    cb(err);
  }
}

const execBuild = gulp.parallel(buildProd, buildStyles, copyFiles);

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
exports.clean = clean;
exports.bumpVersion = bumpVersion;
