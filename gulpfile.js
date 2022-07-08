const fs = require("fs-extra");
const gulp = require("gulp");
const esbuild = require("esbuild");

/********************/
/*  CONFIGURATION   */
/********************/

const name = "quench";
const sourceDirectory = "./src";
const entryFile = `${sourceDirectory}/module/quench-init.ts`;
const distributionDirectory = "./dist";
const stylesDirectory = `${sourceDirectory}/styles`;
const stylesExtension = "css";
const sourceFileExtension = "ts";
const staticFiles = ["lang", "templates", "module.json"];
const distributionFiles = ["LICENSE"];

/********************/
/*      BUILD       */
/********************/

/**
 * ESBuild's previous result for incremental builds
 * @type {esbuild.BuildResult|undefined}
 */
let buildResult;
/**
 * Build the distributable JavaScript code
 *
 * @param {boolean} isProductionBuild - Whether this build is meant for production
 * @returns {Promise<esbuild.BuildResult>}
 */
async function _buildCode(isProductionBuild = false) {
  return buildResult === undefined
    ? (buildResult = await esbuild.build({
        entryPoints: [entryFile],
        bundle: true,
        sourcemap: true,
        outfile: `${distributionDirectory}/${name}.js`,
        sourceRoot: name,
        format: "esm",
        minify: isProductionBuild,
        keepNames: true,
        incremental: !isProductionBuild,
      }))
    : buildResult.rebuild();
}

/** Build JS for development */
function buildDevelopment() {
  return _buildCode(false);
}

/** Build JS for production */
function buildProduction() {
  return _buildCode(true);
}

/**
 * Build style sheets
 */
function buildStyles() {
  return gulp
    .src(`${stylesDirectory}/${name}.${stylesExtension}`)
    .pipe(gulp.dest(`${distributionDirectory}/styles`));
}

/**
 * Copy static files
 */
async function copyFiles() {
  for (const file of staticFiles) {
    if (fs.existsSync(`${sourceDirectory}/${file}`)) {
      await fs.copy(`${sourceDirectory}/${file}`, `${distributionDirectory}/${file}`);
    }
  }
  for (const file of distributionFiles) {
    if (fs.existsSync(file)) await fs.copy(file, `${distributionDirectory}/${file}`);
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch(
    `${sourceDirectory}/**/*.${sourceFileExtension}`,
    { ignoreInitial: false },
    buildDevelopment,
  );
  gulp.watch(
    `${stylesDirectory}/**/*.${stylesExtension}`,
    { ignoreInitial: false },
    buildDevelopment,
  );
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

  console.log(" ", "Files to clean:");
  console.log("   ", files.join("\n    "));

  for (const filePath of files) {
    await fs.remove(`${distributionDirectory}/${filePath}`);
  }
}

const execBuild = gulp.parallel(buildProduction, buildStyles, copyFiles);

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
exports.clean = clean;
