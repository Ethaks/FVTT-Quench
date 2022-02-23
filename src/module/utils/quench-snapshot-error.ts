import { quenchUtils } from "./quench-utils";

const { getQuench } = quenchUtils._internal;

/**
 * An error thrown when a test's snapshot cannot be read from the cache,
 * presumably because loading the file failed.
 *
 * @internal
 */
export class MissingSnapshotError extends Error {
  constructor(context: { batchKey: string; hash: string }) {
    const { batchKey, hash } = context;
    const message = `Snapshot not found: ${getQuench().snapshots.getSnapDir(
      batchKey,
    )}/${hash}.snap.txt`;
    super(message);
    this.name = this.constructor.name;
  }
}
