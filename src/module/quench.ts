import * as chai from "chai";
import * as fc from "fast-check";

import { QuenchResults } from "./apps/quench-results";
import { QuenchReporter } from "./quench-reporter";
import { QuenchSnapshotManager } from "./quench-snapshot";
import { getBatchNameParts, getGame, localize, MODULE_ID } from "./utils/quench-utils";
import * as quenchUserUtils from "./utils/user-utils";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Mocha {
    interface Runnable {
      _quench_parentBatch: string;
    }
    interface Suite {
      _quench_parentBatch: string;
      _quench_batchRoot: boolean;
      get id(): string;
    }
    interface Test {
      get id(): string;
    }
  }
}

/**
 * The `Quench` class is the "hub" of the Quench module. It contains the primary public API for Quench, as well as references to the global
 * mocha and chai objects.
 *
 * @public
 */
export class Quench {
  /**
   * Mocha's browser global
   *
   * @see https://mochajs.org/
   */
  declare readonly mocha: BrowserMocha;
  /**
   * Chai's static object
   *
   * @see https://www.chaijs.com/
   */
  declare readonly chai: Chai.ChaiStatic;
  /**
   * fast-check for property based testing
   *
   * @see https://dubzzz.github.io/fast-check.github.com/
   * @see https://dubzzz.github.io/fast-check/
   */
  declare readonly fc: typeof fc;

  /** Various utility functions */
  declare readonly utils: { [Util in keyof typeof quenchUserUtils]: typeof quenchUserUtils[Util] };

  /**
   * The singleton instance of {@link QuenchResults} that this `Quench` instance uses
   *
   * @internal
   */
  declare readonly app: QuenchResults;

  /**
   * The {@link QuenchSnapshotManager} instance that this `Quench` instance uses
   *
   * @internal
   */
  declare readonly snapshots: QuenchSnapshotManager;

  /**
   * A map of registered test batches
   *
   * @internal
   */
  declare readonly _testBatches: Collection<QuenchBatchData>;

  /**
   * The current Mocha runner, if any
   *
   * @internal
   */
  _currentRunner: Mocha.Runner | undefined = undefined;

  /** @internal */
  constructor() {
    // Define properties not to be writable
    Object.defineProperties(this, {
      mocha: {
        value: mocha,
      },
      chai: {
        value: chai,
      },
      fc: {
        value: fc,
      },
      utils: {
        value: quenchUserUtils,
      },
      app: {
        value: new QuenchResults(this),
      },
      snapshots: {
        value: new QuenchSnapshotManager(this),
      },
      _testBatches: {
        value: new Collection(),
      },
    });
    return this;
  }

  /**
   * Returns a list of batch keys that are effectively preselected {@link QuenchBatchData.preSelected} insofar as
   * they are registered as `preSelected` *and* – if the user has entered a list of packages to be tested in
   * {@link ClientSettings.Values["quench.preselectedPackages"]} – belong to a preselected package.
   *
   * @internal
   */
  get preSelectedBatches(): QuenchBatchKey[] {
    const preselectedPackages = getGame().settings.get(MODULE_ID, "preselectedPackages");
    const hasPreselectedPackages = preselectedPackages !== "";

    return this._testBatches
      .filter((batchData) => {
        const [packageName] = getBatchNameParts(batchData.key);
        const isPreselectedPackage = preselectedPackages
          .split(",")
          .map((p) => p.trim())
          .includes(packageName);
        return hasPreselectedPackages
          ? isPreselectedPackage && batchData.preSelected
          : batchData.preSelected;
      })
      .map(({ key }) => key);
  }

  /**
   * Registers a new Quench test batch which will show up in the quench window to be enabled/disabled and run.
   *
   * Suites and tests within a Quench test batch are not actually registered in the mocha runner until the user initiates the test run
   * with {@link runBatches}. When `runBatches` is executed, the provided batches' registration functions
   * are run and then the tests are executed.
   *
   * The registration function is passed a `context` argument, which contains the mocha and chai methods necessary for defining a test.
   * - Mocha - `describe`, `it`, `after`, `afterEach`, `before`, `beforeEach`, and `utils`.
   * - Chai - `assert`, `expect`, and `should`; the last one is also made available by extending `Object.prototype`.
   * - fast-check - `fc`
   *
   * @param key - The test batch's unique string key. Only one test batch with a given key can exist at one time.
   *     If you register a test batch with a pre-existing key, it will overwrite the previous test batch.
   * @param fn - The function which will be called to register the suites and tests within your test batch.
   * @param context - Additional options affecting Quench's handling of this batch.
   * @example ```js
   * quench.registerBatch(
   *  "quench.examples.basic-pass",
   *  (context) => {
   *    const { describe, it, assert } = context;
   *
   *    describe("Passing Suite", function () {
   *      it("Passing Test", function () {
   *        assert.ok(true);
   *      });
   *    });
   *  },
   *  {
   *    displayName: "QUENCH: Basic Passing Test",
   *    preSelected: true,
   *    snapBaseDir: "quench",
   *  },
   *);
   * ```
   */
  registerBatch(
    key: QuenchBatchKey,
    fn: QuenchRegisterBatchFunction,
    context: QuenchRegisterBatchOptions = {},
  ): void {
    const { displayName, snapBaseDir, preSelected } = context;
    const [packageName] = getBatchNameParts(key);

    if (![...getGame().modules.keys(), getGame().system.id].includes(packageName)) {
      ui?.notifications?.error(localize("ERROR.InvalidPackageName", { key, packageName }));
    }
    if (this._testBatches.has(key)) {
      ui?.notifications?.warn(localize("WARN.BatchAlreadyExists", { key }));
    }
    this._testBatches.set(key, {
      key: key,
      displayName: displayName ?? key,
      fn,
      snapBaseDir: snapBaseDir ?? QuenchSnapshotManager.getDefaultSnapDir(key),
      preSelected: preSelected ?? true,
    });
    this.app.clear();
  }

  /**
   * Runs all test batches.
   *
   * The contents of the test batches are registered with mocha when this function is executed.
   *
   * @param options - Additional options affecting this batch run
   * @returns Returns the mocha Runner object for this test run.
   */
  async runAllBatches(options: QuenchRunAllBatchesOptions = {}): Promise<Mocha.Runner> {
    const { preSelectedOnly = false, ...runOptions } = options;
    const batches = preSelectedOnly
      ? this.preSelectedBatches
      : ([...this._testBatches.keys()] as QuenchBatchKey[]);
    return this.runBatches(batches, runOptions);
  }

  /**
   * Runs the test batches defined by the keys in their {@link Quench.registerBatch | registration}.
   *
   * The contents of the test batches are registered with mocha when this function is executed.
   *
   * @param batchKeys - Array of keys for the test batches to be run.
   * @param options - Additional options affecting this batch run
   * @returns Returns the mocha Runner object for this test run.
   */
  async runBatches(batchKeys: QuenchBatchKey[], options: QuenchRunBatchOptions = {}) {
    let { updateSnapshots } = options;
    // Cleanup - create a new root suite and clear the state of the results application
    // @ts-expect-error Types are missing `isRoot` argument TODO: PR for DefinitelyTyped?
    mocha.suite = new Mocha.Suite("__root", new Mocha.Context(), true);
    await this.app.clear();

    // Initialize mocha with a QuenchReporter
    this.mocha.setup({
      ui: "bdd",
      reporter: QuenchReporter,
    });

    // Prepare context methods to be provided to test fixtures
    const { after, afterEach, before, beforeEach, describe, it, utils, Runner } = Mocha;
    const { assert, expect } = this.chai;
    // Run should to patch object prototype
    const should = this.chai.should();

    const baseContext: Omit<QuenchBatchContext, "describe" | "it"> = {
      after,
      afterEach,
      before,
      beforeEach,
      utils,
      assert,
      expect,
      should,
      fc: fc,
    };

    // Fetch all snapshot files for the batches to be run
    await this.snapshots.loadBatchSnaps(batchKeys);
    // Explicit flag > flag set before this run > default flag
    updateSnapshots = updateSnapshots ?? this.snapshots.enableUpdates ?? false;

    // Register suites and tests for provided batches
    for (const key of batchKeys) {
      const context: QuenchBatchContext = {
        ...baseContext,
        describe: quenchify(describe, key),
        it: quenchify(it, key),
      };

      // Create a wrapper suite to contain this test batch
      const testBatchRoot = context.describe(`${key}_root`, async () => {
        // Call the batch's registration function
        await this._testBatches.get(key)?.fn(context);
      });
      testBatchRoot._quench_batchRoot = true;
    }

    // Run the tests and hold on to the runner
    this._currentRunner = this.mocha.run();
    const { EVENT_RUN_END } = Runner.constants;
    this._currentRunner.once(EVENT_RUN_END, () => {
      this._currentRunner = undefined;
      if (updateSnapshots) this.snapshots.updateSnapshots();
      this.snapshots.enableUpdates = undefined;
    });
    return this._currentRunner;
  }

  /**
   * Aborts the currently running tests, if tests are currently running. Does nothing if no tests are currently running.
   * This will not cancel an in progress test. The run will abort after the currently running test completes.
   *
   * @public
   */
  abort() {
    this._currentRunner?.abort();
  }
}

/**
 * A helper function adding a reference to a test's Quench Batch to a given Mocha function's result
 */
const quenchify = <Fn extends Mocha.TestFunction | Mocha.SuiteFunction>(
  fn: Fn,
  key: string,
): Fn => {
  const quenchFn = function quenchFn(...args: Parameters<Fn>) {
    // @ts-expect-error Args are passed through as-is
    const result = fn(...args);
    result._quench_parentBatch = key;
    return result;
  };
  quenchFn.only = fn.only;
  quenchFn.skip = fn.skip;
  if ("retries" in fn) quenchFn.retries = fn.retries;
  return quenchFn as Fn;
};

/**
 * Optional data used in the batch registration process
 *
 * @public
 */
export interface QuenchRegisterBatchOptions {
  /**
   * A user-friendly name to show in the Quench UI and detailed results.
   * @defaultValue Defaults to the registration {@link QuenchBatchKey}
   */
  displayName?: string;
  /**
   * The directory in which snapshots for this batch are stored.
   * @defaultValue `__snapshots__/${PACKAGE_NAME}`, where `PACKAGE_NAME` is taken from the `key` parameter
   */
  snapBaseDir?: string;
  /**
   * Whether this batch should be checked when added to the UI, and possibly run on startup
   * if that setting is enabled.
   * @defaultValue `true`
   */
  preSelected?: boolean;
}

/**
 * A function containing this batch's suites and tests.
 * Before each Quench run including this batch, this function will be called by Quench.
 *
 * @public
 * @param context - Various Mocha and Chai functions
 */
export type QuenchRegisterBatchFunction = (context: QuenchBatchContext) => void | Promise<void>;

/**
 * A context object passed to batch registration functions, containing functions usually
 * imported or globally available in regular Node testing.
 * Includes Mocha, Chai, and fast-check.
 *
 * @see https://mochajs.org/#bdd
 * @see https://www.chaijs.com/
 * @see https://dubzzz.github.io/fast-check.github.com/
 *
 * @public
 */
export interface QuenchBatchContext {
  /** @see https://mochajs.org/#hooks */
  after: Mocha.HookFunction;
  /** @see https://mochajs.org/#hooks */
  afterEach: Mocha.HookFunction;
  /** @see https://mochajs.org/#hooks */
  before: Mocha.HookFunction;
  /** @see https://mochajs.org/#hooks */
  beforeEach: Mocha.HookFunction;
  utils: typeof Mocha.utils;
  /** @see https://www.chaijs.com/api/assert/#method_assert */
  assert: Chai.AssertStatic;
  /** @see https://www.chaijs.com/api/bdd/ */
  expect: Chai.ExpectStatic;
  /** @see https://www.chaijs.com/api/bdd/ */
  should: Chai.Should;

  /** @see https://mochajs.org/#bdd */
  describe: Mocha.SuiteFunction;
  /** @see https://mochajs.org/#bdd */
  it: Mocha.TestFunction;

  /** @see https://dubzzz.github.io/fast-check/ */
  fc: typeof fc;
}

/**
 * Options affecting the running of batches
 *
 * @public
 */
export interface QuenchRunBatchOptions {
  /**
   * Whether snapshots generated in this run should be saved
   *
   * @defaultValue `null`
   */
  updateSnapshots?: boolean | null;
}

/**
 * Options affecting the running of batches or criteria which batches are to be run
 *
 * @public
 */
export interface QuenchRunAllBatchesOptions extends QuenchRunBatchOptions {
  /**
   * Whether only batches registered with {@link QuenchRegisterBatchOptions.preSelected}
   * set to `true` should be run.
   *
   * @defaultValue `false`
   */
  preSelectedOnly?: boolean;
}

/**
 * The key by which a test batch is identified.
 * The key should consist of the registering package's `id` from its manifest,
 * followed by a `.`, and then the batch's individual identifier.
 *
 * @public
 */
export type QuenchBatchKey = `${string}.${string}`;

/**
 * Data belonging to a single batch, including its registration function and any
 * additional options.
 *
 * @public
 */
export interface QuenchBatchData {
  key: QuenchBatchKey;
  fn: QuenchRegisterBatchFunction;
  displayName: string;
  snapBaseDir: string;
  preSelected: boolean;
}
