/**
 * An error thrown when a test's snapshot cannot be read from the cache,
 * presumably because loading the file failed.
 */
export class SnapshotError extends Error {
  constructor(context: SnapshotErrorContext) {
    const { batchKey, hash } = context;
    const message = `Snapshot not found: ${quench.snapshots.getSnapDir(batchKey)}/${hash}.snap.txt`;
    super(message);
    this.name = this.constructor.name;
  }
}

interface SnapshotErrorContext {
  batchKey: string;
  hash: string;
}
