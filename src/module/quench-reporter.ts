import { quenchUtils } from "./utils/quench-utils";

const { RUNNABLE_STATES, getTestState, logPrefix, getGame, getQuench } = quenchUtils._internal;

/**
 * Given a mocha Runner, reports test results to the singleton instance of {@link QuenchResults} and in the console if enabled
 *
 * @internal
 */
export class QuenchReporter extends Mocha.reporters.Base {
  /**
   * @param runner - The runner this reporter should work with
   */
  constructor(runner: Mocha.Runner) {
    super(runner);
    const quench = getQuench();
    const app = quench.app;

    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_SUITE_BEGIN,
      EVENT_SUITE_END,
      EVENT_TEST_BEGIN,
      EVENT_TEST_END,
      EVENT_TEST_FAIL,
    } = Mocha.Runner.constants;

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
            console.group(quench.getBatch(batchKey)?.displayName);
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
      .on(EVENT_TEST_END, (test) => {
        const state = getTestState(test);
        if (state === RUNNABLE_STATES.FAILURE) return;

        app.handleTestEnd(test);

        if (QuenchReporter._shouldLogTestDetails()) {
          let stateString, stateColor;
          switch (state) {
            case RUNNABLE_STATES.PENDING:
              stateString = "PENDING";
              stateColor = CONSOLE_COLORS.pending;
              break;
            case RUNNABLE_STATES.SUCCESS:
              stateString = "PASS";
              stateColor = CONSOLE_COLORS.pass;
              break;
            default:
              stateString = "UNKNOWN";
              stateColor = "initial";
          }
          console.log(`%c(${stateString}) Test Complete: ${test.title}`, `color: ${stateColor}`, {
            test,
          });
        }
      })
      .on(EVENT_TEST_FAIL, (test, error) => {
        app.handleTestFail(test, error);

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
        const stats = runner.stats;
        if (stats) app.handleRunEnd(stats);

        if (QuenchReporter._shouldLogTestDetails()) {
          console.groupEnd();
          console.log(`${logPrefix}TEST RUN COMPLETE`, { stats });
        }
      });
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
