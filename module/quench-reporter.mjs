export default class QuenchReporter {
    constructor(runner) {
        const app = quench.app;

        const {
            EVENT_RUN_BEGIN,
            EVENT_RUN_END,
            EVENT_SUITE_BEGIN,
            EVENT_SUITE_END,
            EVENT_TEST_BEGIN,
            EVENT_TEST_PASS,
            EVENT_TEST_FAIL,
        } = runner.constructor.constants;
        runner
            .once(EVENT_RUN_BEGIN, app.handleRunBegin.bind(app))
            .on(EVENT_SUITE_BEGIN, app.handleSuiteBegin.bind(app))
            .on(EVENT_SUITE_END, app.handleSuiteEnd.bind(app))
            .on(EVENT_TEST_BEGIN, app.handleTestBegin.bind(app))
            .on(EVENT_TEST_PASS, app.handleTestPass.bind(app))
            .on(EVENT_TEST_FAIL, app.handleTestFail.bind(app))
            .once(EVENT_RUN_END, app.handleRunEnd.bind(app));
    }
}
