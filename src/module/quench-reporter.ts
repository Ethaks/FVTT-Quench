import {
  createDirectory,
  getGame,
  getTestState,
  logPrefix,
  RUNNABLE_STATES,
} from "./utils/quench-utils";
import type {
  Quench,
  QuenchJsonReportOptions,
  QuenchReports,
  QuenchRunBatchOptions,
} from "./quench";

declare global {
  namespace Hooks {
    interface StaticCallbacks {
      /**
       * A hook event that fires when a batch run is completed and Quench's reports are ready.
       *
       * @group Reports
       * @remarks This is called by {@link Hooks.callAll}
       * @param reports - An object containing reports generated by the batch run
       */
      quenchReports: (reports: QuenchReports) => void;
    }
  }
}

/** The default file name of Quench JSON reports */
const JSON_REPORT_FILENAME = "quench-report.json";

/**
 * Given a mocha Runner, reports test results to the singleton instance of {@link QuenchResults} and in the console if enabled
 *
 * @internal
 */
export class QuenchReporter extends Mocha.reporters.Base {
  /**
   * A cache object containing test data used to generate a JSON report
   *
   * @internal
   */
  protected cache: Record<CacheProperty, Mocha.Test[]> = Object.fromEntries(
    CACHE_PROPERTIES.map((key): [CacheProperty, Mocha.Test[]] => [key, []]),
  ) as Record<CacheProperty, Mocha.Test[]>;

  /**
   * @param runner - The runner this reporter should work with
   * @param options - Additional options for this reporter
   */
  constructor(runner: Mocha.Runner, options: Mocha.MochaOptions) {
    super(runner);
    const { quench } = options.reporterOptions as QuenchReporterOptions;
    let { json: jsonOptions } = options.reporterOptions as QuenchReporterOptions;

    const app = quench.app;

    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_SUITE_BEGIN,
      EVENT_SUITE_END,
      EVENT_TEST_BEGIN,
      EVENT_TEST_PASS,
      EVENT_TEST_PENDING,
      EVENT_TEST_END,
      EVENT_TEST_FAIL,
    } = Mocha.Runner.constants;

    // Do not store JSON report by default
    jsonOptions ??= false;
    // If a JSON report is to be uploaded, merge json options with default options
    if (jsonOptions) {
      jsonOptions = {
        filename: JSON_REPORT_FILENAME,
        ...(typeof jsonOptions === "object" ? jsonOptions : {}),
      };
    }

    runner
      .once(EVENT_RUN_BEGIN, () => {
        // Update UI
        app.handleRunBegin();

        // Log detailed results in console
        if (QuenchReporter._shouldLogTestDetails()) {
          console.group(`${logPrefix}DETAILED TEST RESULTS`);
        }
      })
      .on(EVENT_SUITE_BEGIN, (suite) => {
        // Update UI
        app.handleSuiteBegin(suite);

        // Log detailed results in console
        if (QuenchReporter._shouldLogTestDetails() && !suite.root) {
          const batchKey = suite._quench_parentBatch;
          const isBatchRoot = suite._quench_batchRoot;
          if (isBatchRoot) {
            console.group(quench._testBatches.get(batchKey)?.displayName);
          } else {
            console.group(`Suite: ${suite.title}`, { suite });
          }
        }
      })
      .on(EVENT_SUITE_END, (suite) => {
        // Update UI
        app.handleSuiteEnd(suite);

        // Log detailed results in console
        if (QuenchReporter._shouldLogTestDetails() && !suite.root) {
          console.groupEnd();
        }
      })
      .on(EVENT_TEST_BEGIN, (test) => {
        app.handleTestBegin(test);
      })
      .on(EVENT_TEST_PENDING, (test) => {
        this.cache.pending.push(test);
      })
      .on(EVENT_TEST_END, (test) => {
        this.cache.tests.push(test);
        const state = getTestState(test);
        if (state === RUNNABLE_STATES.FAILURE) return;

        app.handleTestEnd(test);

        if (QuenchReporter._shouldLogTestDetails()) {
          let stateString, stateColor;
          switch (state) {
            case RUNNABLE_STATES.PENDING: {
              stateString = "PENDING";
              stateColor = CONSOLE_COLORS.pending;
              break;
            }
            case RUNNABLE_STATES.SUCCESS: {
              stateString = "PASS";
              stateColor = CONSOLE_COLORS.pass;
              break;
            }
            default: {
              stateString = "UNKNOWN";
              stateColor = "initial";
            }
          }
          console.log(`%c(${stateString}) Test Complete: ${test.title}`, `color: ${stateColor}`, {
            test,
          });
        }
      })
      .on(EVENT_TEST_PASS, (test) => {
        this.cache.passes.push(test);
      })
      .on(EVENT_TEST_FAIL, (test: Mocha.Test | Mocha.Hook, error) => {
        if (test.type === "hook") {
          if (test.title.includes("before")) {
            if (test.parent?._quench_batchRoot) app.handleBatchFail(test, error);
            else app.handleTestFail(test, error);
          }
        } else {
          this.cache.failures.push(test);
          app.handleTestFail(test, error);
        }

        if (QuenchReporter._shouldLogTestDetails()) {
          console.groupCollapsed(
            `%c(FAIL) Test Complete: ${test.title}`,
            `color: ${CONSOLE_COLORS.fail}`,
            { test, err: error },
          );
          console.error(error.stack);
          console.groupEnd();
        }
      })
      .once(EVENT_RUN_END, () => {
        const stats = runner.stats as Mocha.Stats;
        if (stats) app.handleRunEnd(stats);

        if (QuenchReporter._shouldLogTestDetails()) {
          console.groupEnd();
          console.log(`${logPrefix}TEST RUN COMPLETE`, { stats });
        }

        // Generate JSON log
        const jsonReportData: QuenchJsonReport = {
          stats,
          ...(Object.fromEntries(
            CACHE_PROPERTIES.map((key): [CacheProperty, QuenchCleanedTestData[]] => [
              key,
              this.cache[key].map((element) => QuenchReporter.clean(element)),
            ]),
          ) as Record<CacheProperty, QuenchCleanedTestData[]>),
        };
        const jsonReport = JSON.stringify(jsonReportData, undefined, 2);
        quench.reports.json = jsonReport;
        Hooks.callAll("quenchReports", { json: jsonReport });
        if (jsonOptions) {
          (this.constructor as typeof QuenchReporter).uploadJsonReport(
            jsonReport,
            jsonOptions as QuenchJsonReportOptions,
          );
        }
      });
  }

  /**
   * Uploads a JSON report to a file on Foundry's server
   *
   * @param json - The JSON report in already stringified form
   * @param options - Options affecting e.g. the filename
   * @private
   * @internal
   */
  private static async uploadJsonReport(
    json: string,
    options: QuenchJsonReportOptions,
  ): Promise<void> {
    let { filename = JSON_REPORT_FILENAME } = options;
    let directory;
    if (filename?.includes("/")) {
      const parts = filename?.split("/");
      filename = parts.pop() as string;
      directory = parts.join("/");
    }

    if (directory) await createDirectory(directory);
    const file = new File([json], filename, { type: "text/plain" });
    await FilePicker.upload("data", directory ?? "", file);
  }

  /**
   * Cleans a test object for JSON serialization by copying primitive values
   *
   * @param test - The test object to clean
   * @private
   * @internal
   */
  private static clean(test: Mocha.Test): QuenchCleanedTestData {
    let error = test.err || {};
    if (error instanceof Error) {
      error = this.errorJSON(error);
    }
    return {
      title: test.title,
      fullTitle: test.fullTitle(),
      file: test.file,
      duration: test.duration,
      // @ts-expect-error Necessary for compatibility
      currentRetry: test.currentRetry(),
      speed: test.speed,
      err: this.cleanCycles(error),
    };
  }

  /**
   * Removes cyclic references from an error object
   *
   * @param obj - The error object to clean
   * @private
   * @internal
   */
  private static cleanCycles(obj: unknown): unknown {
    const cache: unknown[] = [];
    return JSON.parse(
      JSON.stringify(obj, function (key, value) {
        if (typeof value === "object" && value !== null) {
          if (cache.includes(value)) {
            // Instead of going in a circle, we'll print [object Object]
            return "" + value;
          }
          cache.push(value);
        }
        return value;
      }),
    );
  }

  /**
   * Creates an object from an {@link Error} by only copying its own properties
   *
   * @param error - An error object to be cleaned
   * @private
   * @internal
   */
  private static errorJSON(error: Error): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(error)) {
      result[key] = (error as never)[key];
    }
    return result;
  }

  /**
   * Determines whether the setting to show detailed log results is enabled
   */
  private static _shouldLogTestDetails(): boolean {
    return getGame().settings.get("quench", "logTestDetails");
  }
}

// Colors used for different test results in the console
const CONSOLE_COLORS = {
  fail: "#FF4444",
  pass: "#55AA55",
  pending: "#8844FF",
} as const;

const CACHE_PROPERTIES = ["tests", "pending", "failures", "passes"] as const;
type CacheProperty = (typeof CACHE_PROPERTIES)[number];

/**
 * Data belonging to a {@link Mocha.Test}, cleaned to be JSON-serializable
 */
export interface QuenchCleanedTestData {
  title: string;
  fullTitle: string;
  file: string | undefined;
  duration: number | undefined;
  currentRetry: number;
  speed: Mocha.Test["speed"];
  err: unknown;
}

/**
 * Data collected from a {@link Mocha.Runner} during a test run, made available after the run is complete
 * as {@link Quench.reports | Quench.reports.json}.
 *
 * @see {@link Quench.reports | Quench.reports.json}
 * @see {@link hookEvents!quenchReports}
 */
export interface QuenchJsonReport {
  stats: Mocha.Stats;
  tests: QuenchCleanedTestData[];
  pending: QuenchCleanedTestData[];
  failures: QuenchCleanedTestData[];
  passes: QuenchCleanedTestData[];
}

export interface QuenchReporterOptions {
  quench: Quench;
  json?: QuenchRunBatchOptions["json"];
}
