import hash from "hash-sum";
import { format as prettyFormat, plugins as formatPlugins } from "pretty-format";
import { internalUtils } from "./utils/quench-utils.js";

/**
 * The `QuenchSnapshotManager` class is a helper class, meant to be instantiated alongside a `Quench` class.
 * It provides various methods enabling the fetching, caching, managing, and updating of snapshots.
 *
 * @property {Quench} quench - The `Quench` instance this manager belongs to
 */
export class QuenchSnapshotManager {
  constructor(quench) {
    /** @type {import("./quench").default} */
    this.quench = quench;
  }

  /**
   * This instance's file cache, containing all snapshot objects, ordered first by batch name, then by hashed full test titles
   *
   * @type {Object.<string, Object<string, object>>}
   */
  fileCache = {};

  /**
   * A cache array containing batchKeys whose data has to be updated
   *
   * @type {Set.<string>}
   */
  updateQueue = new Set();

  /**
   * A boolean that determines whether snapshots should be updated after the next run.
   *
   * @type {boolean|null}
   */
  enableUpdates = null;

  /**
   * Serializes a given data object using the "pretty-format" package.
   *
   * @param {*} data - Data to be serialized
   * @returns {string} Serialized data
   */
  static serialize(data) {
    return prettyFormat(data, {
      plugins: [formatPlugins.DOMElement, formatPlugins.DOMCollection, formatPlugins.Immutable],
    });
  }

  /**
   * Generates a string for a batch's default directory in which snapshots will be stored.
   *
   * @param {string} batchKey - The batchKey from which a path will be generated
   * @returns {string} The default directory path
   */
  static getDefaultSnapDir(batchKey) {
    const [packageName] = internalUtils.getBatchNameParts(batchKey);
    return `__snapshots__/${packageName}`;
  }

  /**
   * Ensures a directory exists and optionally walks the full path,
   * creating missing directories therein, to ensure a directory's existence.
   *
   * @static
   * @async
   * @param {string} fullPath - The full path of the directory to be created
   * @param {object} [options] - Optional parameters to affect the directory's creation
   * @param {boolean} [options.recursive] - Whether missing directories in the path should also be created
   * @returns {Promise<boolean>} Whether the directory exists now
   */
  static async createDirectory(fullPath, { recursive = true } = {}) {
    /**
     * Inner directory creation function; checks whether a directory exists
     * and either confirms existence or tries to create the directory.
     *
     * @async
     * @param {string} path - The directory's full path
     * @returns {Promise<boolean>} Whether the directory exists now
     */
    const _createDir = async (path) => {
      let dirExists = false;
      try {
        const resp = await FilePicker.browse("data", path);
        if (resp) dirExists = true;
      } catch (error) {
        if (
          error === `Directory ${path} does not exist or is not accessible in this storage location`
        ) {
          // This path does not exist yet, so try to create it
          const resp = await FilePicker.createDirectory("data", path);
          if (resp) dirExists = true;
        }
      }
      return dirExists;
    };

    if (recursive) {
      // Split path into single directories to allow checking each of them
      const dirs = fullPath.split("/");
      // Paths whose existence was already verified
      const present = [];
      for (const dir of dirs) {
        const currentDir = [...present, dir].join("/");
        const dirExists = await _createDir(currentDir);
        if (dirExists) present.push(dir);
        else return false;
      }
      return true;
    } else {
      return _createDir(fullPath);
    }
  }

  /**
   * Enables snapshot usage by adding `matchSnapshot` assertion to chai
   *
   * @param {object} chai - The global chai object
   * @param {object} utils - Chai utils
   */
  static enableSnapshots(chai, utils) {
    // Enable `matchSnapshot` for assert style
    // Create a wrapper around `matchSnapshot`, providing the actual object
    chai.assert.matchSnapshot = function (obj) {
      return new chai.Assertion().to.matchSnapshot(obj);
    };

    // Add `matchSnapshot` to chai to enable assertions
    utils.addMethod(chai.Assertion.prototype, "matchSnapshot", function (obj) {
      // Get flag for expect style, or paramter for assert style
      const actual = QuenchSnapshotManager.serialize(utils.flag(this, "object") ?? obj);
      const updateSnapshot = quench.snapshots.enableUpdates;
      const [, ...titleParts] = quench._currentRunner.currentRunnable.titlePath();
      const quenchBatch = quench._currentRunner.currentRunnable._quench_parentBatch;
      // Slugify non-Quench batch test name (describe and it parts)
      const fullTitle = titleParts.join("-").trim().slugify();

      let expected;
      try {
        expected = quench.snapshots.readSnap(quenchBatch, fullTitle);
      } catch (e) {
        if (!updateSnapshot) {
          throw e;
        }
      }
      if (updateSnapshot) {
        quench.snapshots.queueBatchUpdate(quenchBatch, fullTitle, actual);
        // Add newline otherwise added for clearer formatting when the snapshot is written
        expected = actual;
      }

      // Use equal assertion to compare strings, throwing default chai error on mismatch
      chai.assert.equal(actual, expected);
    });
  }

  /** Resets the current fileCache */
  resetCache() {
    this.fileCache = {};
  }

  /**
   * Returns a batch's snapshot directory, either by using the configured value or the default,
   * which resolves to "Data/<package type>/<package name>".
   *
   * @param {string} batchKey - The batch whose directory is requested
   * @returns {string} The batch's snapshot directory
   */
  getSnapDir(batchKey) {
    return this.quench.getBatch(batchKey).snapBaseDir + `/${batchKey}`;
  }

  /**
   * Returns a snapshot matching a filename from the server's `Data/systems/pf1/__snapshots__` directory.
   *
   * @param {string} batchKey - A batch key belonging to a quench test batch
   * @param {string} name - The name of a specific snapshot data object belonging to a test
   * @throws {Error} Throws an error if the requested snapshot cannot be found
   * @returns {object} A snapshot object
   */
  readSnap(batchKey, fullTitle) {
    const name = hash(fullTitle);
    if (!this.fileCache[batchKey] || !(name in this.fileCache[batchKey]))
      throw Error("Snapshot not found");
    return this.fileCache[batchKey][name];
  }

  /**
   * Loads all snaps for a Quench run
   *
   * @async
   * @param {string[]} batchKeys - The array of batch keys to be run
   * @returns {Promise<object>} A Promise that is resolved when all snapshot files are loaded
   */
  async loadBatchSnaps(batchKeys) {
    this.resetCache();
    const batchPromises = batchKeys.map(async (batchKey) => {
      try {
        const snapDir = this.getSnapDir(batchKey);
        const { files } = await FilePicker.browse("data", snapDir);
        const filePromises = files.map(async (file) => {
          const baseName = file.split("/").pop().split(".snap.txt")[0];
          const response = await fetch(file);
          if (response.status === 200) {
            const result = await response.text();
            (this.fileCache[batchKey] ?? (this.fileCache[batchKey] = {}))[baseName] = result;
            return result;
          } else return false;
        });
        const result = await Promise.all(filePromises);
        return result;
      } catch (_) {
        // Every batch without snapshots will throw an error due to a missing directory
        // TODO: Ignore only expected errors
      }
    });
    await Promise.all(batchPromises);
    return this.fileCache;
  }

  /**
   * Fetches a batch's snapshot file and stores it in the fileCache.
   *
   * @async
   * @param {string} batchKey - A batch key
   * @returns {Promise<object>} The complete snapshot object containing all test snapshots for that batch
   */
  async loadSnap(batchKey) {
    const filePath = this.getFileName(batchKey);
    if (this.fileCache[batchKey] === undefined) {
      const response = await fetch(filePath);
      if (response.status === 200) {
        const result = await response.text();
        const body = `const data = {${result}}; return data;`;
        const fn = new Function(body);
        this.fileCache[batchKey] = fn();
      }
    }
    return this.fileCache[batchKey];
  }

  /**
   * Stores a specific test's updated snapshot data in the cache and adds the batch to the list
   * of batches whose data has to be uploaded to the server.
   *
   * @param {string} batchKey - The batch's key
   * @param {string} fullTitle - The test's full title
   * @param {*} newData - The new snapshot data
   */
  queueBatchUpdate(batchKey, fullTitle, newData) {
    this.updateQueue.add(batchKey);
    const data = this.fileCache[batchKey] ?? (this.fileCache[batchKey] = {});
    data[hash(fullTitle)] = newData;
  }

  /**
   * Updates all snapshots whose data was changed in the last run (i.e. all batches listed in {@see changedBatches})
   *
   * @async
   */
  async updateSnapshots() {
    // Get all snapshot directories
    const snapDirs = [...this.updateQueue].map((batchKey) => this.getSnapDir(batchKey));
    const dirObject = {};
    // Create an object that mirrors the actually needed directory tree
    for (const dir of snapDirs) {
      const dirParts = dir.split("/");
      let cur = dirObject;
      for (const part of dirParts) {
        cur[part] ??= {};
        cur = cur[part];
      }
    }

    /**
     * Creates a directory tree mirroring a given object's tree.
     * Defined as function to enable recursive usage.
     *
     * @async
     * @param {object} obj - The object used as blueprint for the directory tree
     * @param {string} [prev] - String accumulator for already created directories, needed to get a full path
     */
    const createDirTree = async (obj, prev = "") => {
      for (const [key, val] of Object.entries(obj)) {
        const fullPath = `${prev}${key}`;
        const exists = await this.constructor.createDirectory(fullPath, { recursive: false });
        if (exists) await createDirTree(val, fullPath + "/");
      }
    };

    await createDirTree(dirObject);

    const uploadPromises = Array.from(this.updateQueue).map(async (batchKey) => {
      const snapDir = this.getSnapDir(batchKey);

      // Get the batch's snapshot data from the cache, or create a new object to store this test in
      const data = this.fileCache[batchKey] ?? {};
      const filePromises = Object.entries(data).map(([key, value]) => {
        const newFile = new File([value], `${key}.snap.txt`, { type: "text/plain" });
        return FilePicker.upload("data", snapDir, newFile);
      });
      return Promise.all(filePromises);
    });
    const resp = await Promise.all(uploadPromises);
    this.updateQueue.clear();
    return resp;
  }
}
