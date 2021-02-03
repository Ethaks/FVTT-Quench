/**
 * Given a mocha Runner, reports test results to the singleton instance of {@link QuenchResults}
 */
export default class QuenchReporter {
    constructor(runner) {
        const app = quench.app;

        const {
            EVENT_RUN_BEGIN,
            EVENT_RUN_END,
            EVENT_SUITE_BEGIN,
            EVENT_SUITE_END,
            EVENT_TEST_BEGIN,
            EVENT_TEST_END,
            EVENT_TEST_FAIL,
        } = runner.constructor.constants;
        runner
            .once(EVENT_RUN_BEGIN, app.handleRunBegin.bind(app))
            .on(EVENT_SUITE_BEGIN, app.handleSuiteBegin.bind(app))
            .on(EVENT_SUITE_END, app.handleSuiteEnd.bind(app))
            .on(EVENT_TEST_BEGIN, app.handleTestBegin.bind(app))
            .on(EVENT_TEST_END, app.handleTestEnd.bind(app))
            .on(EVENT_TEST_FAIL, app.handleTestFail.bind(app))
            .once(EVENT_RUN_END, () => {
                app.handleRunEnd(runner.stats);
            });
    }
}
