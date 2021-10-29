import fnv1a from "@sindresorhus/fnv1a";
import { format as prettyFormat, plugins as formatPlugins } from "pretty-format";
import Quench from "./quench";
import { SnapshotError } from "./utils/quench-SnapshotError";
import { internalUtils, quenchUtils } from "./utils/quench-utils";

const { logPrefix } = quenchUtils._internal;

/**
 * The `QuenchSnapshotManager` class is a helper class, meant to be instantiated alongside a `Quench` class.
 * It provides various methods enabling the fetching, caching, managing, and updating of snapshots.
 */
export class QuenchSnapshotManager {
  /**
   * Creates an instance of a `QuenchSnapshotManager`
   *
   * @param quench - The `Quench` instance whose snapshots will be managed
   */
  constructor(quench: Quench) {
    this.quench = quench;
  }

  quench: Quench;

  /**
   * This instance's file cache, containing all serialised snapshots, ordered first by batch name, then by hashed full test titles
   */
  private fileCache: Record<string, Record<string, string>> = {};

  /** A cache array containing batchKeys whose data has to be updated */
  private updateQueue: Set<SnapshotUpdateData> = new Set();

  /** A boolean that determines whether snapshots should be updated after the next run. */
  enableUpdates: boolean | null = null;

  /**
   * Serializes a given data object using the "pretty-format" package.
   *
   * @param data - Data to be serialized
   * @returns Serialized data
   */
  static serialize(data: unknown): string {
    return prettyFormat(data, {
      plugins: [formatPlugins.DOMElement, formatPlugins.DOMCollection, formatPlugins.Immutable],
    });
  }

  /**
   * Generates a string for a batch's default directory in which snapshots will be stored.
   *
   * @param batchKey - The batchKey from which a path will be generated
   * @returns The default directory path
   */
  static getDefaultSnapDir(batchKey: string): string {
    const [packageName] = internalUtils.getBatchNameParts(batchKey);
    return `__snapshots__/${packageName}`;
  }

  /**
   * Ensures a directory exists and optionally walks the full path,
   * creating missing directories therein, to ensure a directory's existence.
   *
   * @static
   * @async
   * @param fullPath - The full path of the directory to be created
   * @param [options] - Optional parameters to affect the directory's creation
   * @param [options.recursive] - Whether missing directories in the path should also be created
   * @returns Whether the directory exists now
   */
  static async createDirectory(fullPath: string, { recursive = true } = {}): Promise<boolean> {
    /**
     * Inner directory creation function; checks whether a directory exists
     * and either confirms existence or tries to create the directory.
     *
     * @async
     * @param path - The directory's full path
     * @returns Whether the directory exists now
     */
    const _createDir = async (path: string): Promise<boolean> => {
      let dirExists = false;
      try {
        // Attempt directory creation
        const resp = await FilePicker.createDirectory("data", path);
        if (resp) dirExists = true;
      } catch (error) {
        // Confirm directory existence with expected EEXIST error, throw unexpected errors
        if (typeof error === "string" && error.startsWith("EEXIST")) {
          dirExists = true;
        } else throw error;
      }
      return dirExists;
    };

    if (recursive) {
      // Split path into single directories to allow checking each of them
      const dirs = fullPath.split("/");
      // Paths whose existence was already verified
      const present: string[] = [];
      for (const dir of dirs) {
        const currentDir = [...present, dir].join("/");
        const dirExists = await _createDir(currentDir);
        // Either continue with directory creation, or return on error
        if (dirExists) present.push(dir);
        else return false;
      }
      // Complete path's existence was confirmed
      return true;
    } else {
      return _createDir(fullPath);
    }
  }

  /**
   * Creates a directory tree mirroring a given object's tree.
   * Defined as function to enable recursive usage.
   *
   * @param obj - The object used as blueprint for the directory tree
   * @param [prev] - String accumulator for already created directories, needed to get a full path
   */
  static async createDirectoryTree(obj: object, prev = "") {
    // Create all dirs of current tree layer, don't need to await individual non-interfering requests
    const currentLayerDirs = await Promise.all(
      Object.entries(obj).map(async ([dirKey, valObj]) => {
        const dirExists = await this.createDirectory(`${prev}${dirKey}`, {
          recursive: false,
        });
        // Return data necessary for the next level creation workflow
        return [dirExists, dirKey, valObj];
      }),
    );
    // Only continue in directories that exists
    const nextLayerPromises = currentLayerDirs
      .filter(([dirExists]) => dirExists === true)
      .reduce((promises, [dirExists, prevDir, newDirObj]) => {
        // Push next layer creation request
        if (dirExists) promises.push(this.createDirectoryTree(newDirObj, `${prev}${prevDir}/`));
        else {
          console.error(`Could not create directory ${prev}${prevDir}`);
        }
        return promises;
      }, []);
    // Return Promise for next layer
    return Promise.all(nextLayerPromises);
  }

  /**
   * Enables snapshot usage by adding `matchSnapshot` assertion to chai
   *
   * @param chai - The global chai object
   * @param utils - Chai utils
   */
  static enableSnapshots(chai: Chai.ChaiStatic, utils: Chai.ChaiUtils): void {
    // Enable `matchSnapshot` for assert style
    // Create a wrapper around `matchSnapshot`, providing the actual object
    chai.assert.matchSnapshot = function (obj) {
      return new chai.Assertion(obj).matchSnapshot();
    };

    // Add `matchSnapshot` to chai to enable assertions
    utils.addMethod(chai.Assertion.prototype, "matchSnapshot", function () {
      // Get flag for expect style, or paramter for assert style
      // @ts-expect-error `this` is determined through Chai
      const actual = QuenchSnapshotManager.serialize(utils.flag(this, "object"));
      const updateSnapshot = quench.snapshots.enableUpdates;
      const currentRunnable = quench._currentRunner?.currentRunnable;
      if (!currentRunnable) throw new Error("No Runner found");
      const quenchBatch = currentRunnable._quench_parentBatch;
      const [, ...titleParts] = currentRunnable.titlePath();
      // Slugify non-Quench batch test name (describe and it parts)
      const fullTitle = titleParts.join("-").trim().slugify();

      let expected;
      try {
        expected = quench.snapshots.readSnap(quenchBatch, fullTitle);
      } catch (e) {
        if (!updateSnapshot) {
          quench.snapshots.queueSnapUpdate(quenchBatch, fullTitle, actual);
          throw e;
        }
      }
      // Use equal assertion to compare strings, throwing default chai error on mismatch
      try {
        chai.assert.equal(actual, expected);
      } catch (error) {
        if (error instanceof chai.AssertionError) {
          error.snapshotError = true;
          // Always queue update – either enableSnapshots was set preemptively and this snapshot did not match
          // (and this snapshot should be updated), or the actual is queued for a potential UI-triggered update
          quench.snapshots.queueSnapUpdate(quenchBatch, fullTitle, actual);
          if (updateSnapshot) chai.assert(true);
          else throw error;
        }
      }
    });
  }

  /**
   * Creates a 13 character hash from a string using fnv1a
   *
   * @param string - The string to be hashed
   * @returns The string's hash
   */
  static hash(string: string): string {
    const bigint = fnv1a(string, { size: 64 });
    return bigint.toString(32).padStart(13, "0");
  }

  /** Resets the current fileCache */
  resetCache(): void {
    this.fileCache = {};
  }

  /**
   * Returns a batch's snapshot directory, combining its configured snapBaseDir with its batchKey
   *
   * @param batchKey - The batch whose directory is requested
   * @returns The batch's snapshot directory
   */
  getSnapDir(batchKey: string): string {
    return this.quench.getBatch(batchKey)?.snapBaseDir + `/${batchKey}`;
  }

  /**
   * Returns a snapshot matching a filename from the server's `Data/systems/pf1/__snapshots__` directory.
   *
   * @param batchKey - A batch key belonging to a quench test batch
   * @param fullTitle - The name of a specific snapshot data object belonging to a test
   * @throws {Error} Throws an error if the requested snapshot cannot be found
   * @returns A snapshot string
   */
  readSnap(batchKey: string, fullTitle: string): string {
    const name = QuenchSnapshotManager.hash(fullTitle);
    if (!this.fileCache[batchKey] || !(name in this.fileCache[batchKey])) {
      throw new SnapshotError({ batchKey, hash: name });
    }
    return this.fileCache[batchKey][name];
  }

  /**
   * Loads all snaps for a Quench run
   *
   * @async
   * @param batchKeys - The array of batch keys to be run
   * @returns A Promise that is resolved when all snapshot files are loaded
   */
  async loadBatchSnaps(batchKeys: string[]): Promise<Record<string, Record<string, string>>> {
    // Reset cache to guarantee current state from freshly fetched files
    this.resetCache();
    // Reset queue to limit entries to a single run's queue
    this.updateQueue.clear();
    const batchPromises = batchKeys.map(async (batchKey: string) => {
      const snapDir = this.getSnapDir(batchKey);
      try {
        const files = (await FilePicker.browse("data", snapDir))?.files;
        if (!files) return;

        // Fetch all ".snap.txt" files in a batch's snapDir
        const filePromises = files.map(async (file) => {
          const baseName = file.split("/").pop()?.split(".snap.txt")[0];
          if (!baseName) return false;
          const response = await fetch(file);
          if (response.status === 200) {
            const result = await response.text();
            // Store snapshot string after making sure the batch has an object in the cache
            (this.fileCache[batchKey] ?? (this.fileCache[batchKey] = {}))[baseName] = result;
            return result;
          } else return false;
        });
        const result = await Promise.all(filePromises);
        return result;
      } catch (error) {
        // Every batch without snapshots will throw an error due to a missing directory
        if (
          error !==
          `Directory ${snapDir} does not exist or is not accessible in this storage location`
        )
          throw error;
      }
    });
    await Promise.all(batchPromises);
    return this.fileCache;
  }

  /**
   * Stores a specific test's updated snapshot data in the cache and adds the batch to the list
   * of batches whose data has to be uploaded to the server.
   *
   * @param batchKey - The batch's key
   * @param fullTitle - The test's full title
   * @param newData - The new snapshot data
   */
  queueSnapUpdate(batchKey: string, fullTitle: string, newData: string): void {
    this.updateQueue.add({
      batchKey,
      fullTitle,
      data: newData,
      hash: QuenchSnapshotManager.hash(fullTitle),
    });
  }

  /**
   * Updates all snapshots whose data was changed in the last run (i.e. all batches listed in {@link QuenchSnapshotManager#updateQueue})
   */
  async updateSnapshots(): Promise<{ batch: string; file: string; status: string | number }[]> {
    // Get all snapshot directories
    const snapDirs = [...this.updateQueue].map(({ batchKey }) => this.getSnapDir(batchKey));
    const dirTree: object = snapDirs.reduce((acc, dir) => {
      let cur = acc;
      for (const part of dir.split("/")) {
        // @ts-expect-error Evil accessing/setting of arbitrary keys to create tree
        cur = cur[part] ?? (cur[part] = {});
      }
      return acc;
    }, {});

    // Ensure that all all snapshot directories are created so that files can be stored
    await QuenchSnapshotManager.createDirectoryTree(dirTree);

    // Temporarily patch `ui.notifications.info` to prevent every single upload generating a notification
    const _info = ui.notifications?.info;
    if (ui.notifications && _info)
      ui.notifications.info = function (...args) {
        if (args[0]?.includes(".snap.txt saved to")) return;
        else _info.call(this, ...args);
      };

    try {
      const uploadPromises = Array.from(this.updateQueue).map(async ({ batchKey, data, hash }) => {
        const snapDir = this.getSnapDir(batchKey);

        // Get the batch's snapshot data from the cache, or create a new object to store this test in TODO: Fix comment
        // key = hash, value = data
        const fileName = `${hash}.snap.txt`;
        const newFile = new File([data], fileName, { type: "text/plain" });
        const fileUpload = await FilePicker.upload("data", snapDir, newFile);
        return {
          batch: batchKey,
          file: fileName,
          status:
            typeof fileUpload === "object" && "status" in fileUpload ? fileUpload.status : "error",
        };
      });
      const responses = await Promise.all(uploadPromises);
      const respData = responses.reduce(
        (acc: Record<string, { batch: string; file: string; status: string | number }[]>, resp) => {
          (acc[resp.batch] || (acc[resp.batch] = [])).push(resp);
          return acc;
        },
        {},
      );

      const numberOfBatches = [...new Set(responses.map((r) => r.batch))].length;
      const numberOfFiles = responses.filter((r) => r.status === "success").length;

      // Create detailed upload report in console
      console.group(
        `${logPrefix}UPLOADED SNAPSHOTS (${numberOfBatches} batches, ${numberOfFiles} files)`,
      );
      Object.entries(respData).forEach(([batch, files]) => {
        console.groupCollapsed(`Batch: ${batch}, directory: ${this.getSnapDir(batch)}`);
        console.table(files, ["file", "status"]);
        console.groupEnd();
      });
      console.groupEnd();

      this.updateQueue.clear();

      if (ui.notifications && _info) {
        // Restore original info method and create one notification for the upload
        ui.notifications.info = _info;
        ui.notifications.info(
          game.i18n.format("QUENCH.UploadedSnapshots", {
            batches: numberOfBatches,
            files: numberOfFiles,
          }),
        );
      }
      return responses;
    } catch (error) {
      // Ensure ui.notifications.info patch is reverted
      if (ui.notifications && _info) ui.notifications.info = _info;
      throw error;
    }
  }
}

interface SnapshotUpdateData {
  batchKey: string;
  fullTitle: string;
  hash: string;
  data: string;
}
