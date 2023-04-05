/**
 * The general Quench API, including the global {@link Quench quench} hub.
 *
 * Interfaces and types exported by this module are safe to be used in TypeScript definitions.
 * Types not exported from this module, but from files deeper in the module tree, are not considered
 * part of the public API and might be changed without warning in future versions.
 *
 * @module quench
 */
import "mocha/mocha.js";
import "chai";
import "chai-as-promised";

import "./quench-init";

// Expected API
export type {
  Quench,
  QuenchBatchContext,
  QuenchRegisterBatchOptions,
  QuenchRegisterBatchFunction,
  QuenchRunBatchOptions,
  QuenchJsonReportOptions,
  QuenchReports,
  QuenchBatchData,
  QuenchBatchKey,
} from "./quench";

// Snapshots
export type { QuenchSnapshotManager } from "./quench-snapshot";
export type { MissingSnapshotError } from "./utils/quench-snapshot-error";

export type { QuenchReporter, QuenchJsonReport, QuenchCleanedTestData } from "./quench-reporter";
export type { QuenchResults } from "./apps/quench-results";
