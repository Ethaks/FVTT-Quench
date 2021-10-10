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

/**
 * Loads all snaps for a Quench run
 *
 * @async
 * @param {string[]} batchKeys - The array of batch keys to be run
 * @returns {Promise<object[]>} A Promise that is resolved when all snapshot files are loaded
 */
const loadAllSnaps = async (batchKeys) => {
  const packages = batchKeys.reduce((acc, key) => {
    const [packageName, identifier] = quenchUtils._internal.getBatchNameParts(key);
    (acc[packageName] || (acc[packageName] = [])).push({
      identifier,
      key,
      fileName: getFileName(key),
    });
    return acc;
  }, {});
  const loadPromises = [];
  for (const packageName of Object.keys(packages)) {
    try {
      const { files } = await FilePicker.browse("data", getSnapDir(packageName));
      for (const file of files) {
        const snapFileData = packages[packageName]?.find((p) => p.fileName === file);
        if (snapFileData) {
          loadPromises.push(loadSnap(snapFileData.key));
        }
      }
    } catch (e) {
      // TODO: Error handling?
    }
  }
  return Promise.all(loadPromises);
};

/**
 * Returns a snapshot matching a filename from the server's `Data/systems/pf1/__snapshots__` directory.
 *
 * @param {string} batchKey - A batch key belonging to a quench test batch
 * @param {string} name - The name of a specific snapshot data object belonging to a test
 * @returns {object} A snapshot object
 */
const readSnap = (batchKey, name) => {
  if (!fileCache[batchKey] || !(name in fileCache[batchKey])) throw new Error("Snapshot not found");
  return fileCache[batchKey][name];
};

/** The directory used for snapshots */
const getSnapDir = (packageName) =>
  `${game.system.id === packageName ? "systems" : "modules"}/${packageName}/__snapshots__`;

/**
 * Returns the path to a snapshot filename
 *
 * @param {string} name - Name of the snapshot
 * @returns {string} The full path to the snapshot file
 */
const getFileName = (batchKey) => {
  const [packageName, identifier] = quenchUtils._internal.getBatchNameParts(batchKey);
  return `${getSnapDir(packageName)}/${identifier}.json`;
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
  const [packageName, identifier] = quenchUtils._internal.getBatchNameParts(batchKey);
  const snapDir = getSnapDir(packageName);
  try {
    await FilePicker.browse("data", snapDir);
  } catch (error) {
    if (
      error === `Directory ${snapDir} does not exist or is not accessible in this storage location`
    ) {
      await FilePicker.createDirectory("data", snapDir);
    } else throw new Error(error);
  }
  const data = fileCache[batchKey] ?? {};
  data[name] = newData;
  const newFile = new File([JSON.stringify(data)], `${identifier.slugify()}.json`, {
    type: "application/json",
  });
  const response = await FilePicker.upload("data", snapDir, newFile);
  return Boolean(response?.status === "success");
};

export function enableSnapshots(chai, utils) {
  utils.addProperty(chai.Assertion.prototype, "isForced", function () {
    utils.flag(this, "updateSnapshot", true);
  });

  // TODO: Deal with async
  utils.addMethod(chai.Assertion.prototype, "matchSnapshot", function (context) {
    const actual = utils.flag(this, "object");
    const isForced = utils.flag(this, "updateSnapshot");
    context = context.ctx ? context.ctx : context;
    const quenchBatch = context.test._quench_parentBatch;
    const fullTitle = context.test.fullTitle().split("_root").slice(1).join("").trim().slugify();

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
};
