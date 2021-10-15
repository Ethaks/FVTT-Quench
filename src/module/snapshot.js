import { quenchUtils } from "./utils/quench-utils";

/**
 * The singleton file cache, containing all snapshot objects, ordered first by batch name, then by full test title.
 *
 * @type {Object.<string, Object.<string, object>>}
 */
const fileCache = {};

/**
 * Fetches a batch's snapshot file and stores it in the fileCache.
 *
 * @async
 * @param {string} batchKey - A batch key
 * @returns {Promise<object>} The complete snapshot object containing all test snapshots for that batch
 */
const loadSnap = async (batchKey) => {
  const filePath = getFileName(batchKey);
  if (fileCache[batchKey] === undefined) {
    const response = await fetch(filePath);
    if (response.status === 200) {
      const result = await response.json();
      fileCache[batchKey] = result;
    }
  }
  return fileCache[batchKey];
};

/** Resets the current fileCache by deleting all of its keys */
const resetCache = () => {
  for (const key of Object.keys(fileCache)) {
    delete fileCache[key];
  }
};

/**
 * Loads all snaps for a Quench run
 *
 * @async
 * @param {string[]} batchKeys - The array of batch keys to be run
 * @returns {Promise<object[]>} A Promise that is resolved when all snapshot files are loaded
 */
const loadAllSnaps = async (batchKeys) => {
  resetCache();
  const directories = batchKeys.reduce((acc, key) => {
    const directory = quench._testBatches.get(key).snapshotDir;
    (acc[directory] || (acc[directory] = [])).push({ key, file: getFileName(key) });
    return acc;
  }, {});
  const loadPromises = [];
  for (const [directory, directoryData] of Object.entries(directories)) {
    try {
      const { files } = await FilePicker.browse("data", directory);
      for (const file of files) {
        const snapFileData = directoryData?.find((d) => d.file === file);
        if (snapFileData) {
          loadPromises.push(loadSnap(snapFileData.key));
        }
      }
    } catch (e) {
      // TODO: Error handling?
    }
  }
  await Promise.all(loadPromises);
  return fileCache;
};

/**
 * Returns a snapshot matching a filename from the server's `Data/systems/pf1/__snapshots__` directory.
 *
 * @param {string} batchKey - A batch key belonging to a quench test batch
 * @param {string} name - The name of a specific snapshot data object belonging to a test
 * @returns {object} A snapshot object
 */
const readSnap = (batchKey, name) => {
  if (!fileCache[batchKey] || !(name in fileCache[batchKey])) throw Error("Snapshot not found");
  return fileCache[batchKey][name];
};

/**
 * Returns a batch's snapshot directory, either by using the configured value or the default,
 * which resolves to "Data/<package type>/<package name>".
 *
 * @param {string} batchKey - The batch whose directory is requested
 * @returns {string} The batch's snapshot directory
 */
const getSnapDir = (batchKey) => {
  return quench._testBatches.get(batchKey).snapshotDir;
  // const batchData = quench._testBatches.get(batchKey);
  // if (batchData.snapshotDir) return batchData.snapshotDir;
  // else throw Error("No snapshot directory found.");
};

const getDefaultSnapDir = (batchKey) => {
  const [packageName] = quenchUtils._internal.getBatchNameParts(batchKey);
  return `__snapshots__/${packageName}`;
  //return `${game.system.id === packageName ? "systems" : "modules"}/${packageName}/__snapshots__`;
};

/**
 * Returns the path to a snapshot filename
 *
 * @param {string} batchKey - The key of a registered test batch
 * @returns {string} The full path to the snapshot file
 */
const getFileName = (batchKey) => `${getSnapDir(batchKey)}/${batchKey}.json`;

/**
 * Ensures that a path exists by walking a full path and creating any missing directories.
 *
 * @async
 * @param {string} fullPath - The full path to be created
 * @throws {Error} - Any Foundry error not expected to be thrown by the FilePicker
 * @returns {Promise<void>}
 */
const createDirectory = async (fullPath) => {
  // Split path into single directories to allow checking each of them
  const dirs = fullPath.split("/");
  // Paths whose existence was already verified
  const present = [];

  for (const dir of dirs) {
    const currentDir = [...present, dir].join("/");
    try {
      // Browse directory, getting a response indicates that it exists
      const resp = await FilePicker.browse("data", currentDir);
      if (resp) present.push(dir);
    } catch (error) {
      if (
        error ===
        `Directory ${currentDir} does not exist or is not accessible in this storage location`
      ) {
        // This path does not exist yet, so try to create it
        await FilePicker.createDirectory("data", currentDir);
        // If creation was successful, push directory to verified ones
        present.push(dir);
      } else throw Error(error);
    }
  }
};

/**
 * Uploads a snapshot of an object to the snapshots directory on the server.
 *
 * @param {string} batchKey - The name of the snapshot
 * @param {string} name - The name of the test
 * @param {object} newData - The snapshot data to be saved
 * @returns {boolean} Whether the upload was successful or not
 */
const writeSnap = async (batchKey, name, newData) => {
  const snapDir = getSnapDir(batchKey);
  await createDirectory(snapDir);

  // Get the batch's snapshot data from the cache, or create a new object to store this test in
  const data = fileCache[batchKey] ?? {};
  data[name] = newData;
  const newFile = new File([JSON.stringify(data)], `${batchKey.slugify()}.json`, {
    type: "application/json",
  });
  const response = await FilePicker.upload("data", snapDir, newFile);
  return Boolean(response?.status === "success");
};

export function enableSnapshots(chai, utils) {
  utils.addProperty(chai.Assertion.prototype, "isForced", function () {
    // Set update flag to trigger storage/upload of snapshot data
    utils.flag(this, "updateSnapshot", true);
  });

  chai.assert.matchSnapshot = function (obj) {
    return new chai.Assertion().to.matchSnapshot(obj);
  };

  utils.addMethod(chai.Assertion.prototype, "matchSnapshot", function (obj) {
    const actual = utils.flag(this, "object") ?? obj;
    const isForced = utils.flag(this, "updateSnapshot") || quench._updateSnapshots;
    const [, ...titleParts] = quench._currentRunner.currentRunnable.titlePath();
    const quenchBatch = quench._currentRunner.currentRunnable._quench_parentBatch;
    // Slugify non-Quench batch test name to make it suitable for file name
    const fullTitle = titleParts.join("").trim().slugify();

    let expected;
    try {
      expected = readSnap(quenchBatch, fullTitle);
    } catch (e) {
      if (!isForced) {
        throw e;
      }
    }
    if (isForced) {
      writeSnap(quenchBatch, fullTitle, actual);
      expected = actual;
    }

    // TODO: Chech for AssertionError text
    if (actual !== null && typeof actual === "object") {
      chai.assert.deepEqual(actual, expected);
    } else {
      chai.assert.equal(actual, expected);
    }
  });
}

export const quenchSnapUtils = {
  readSnap,
  writeSnap,
  fileCache,
  loadSnap,
  loadAllSnaps,
  getDefaultSnapDir,
};
