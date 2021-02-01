export default class QuenchReporter {
    constructor(runner) {
        const app = quench.app;

        const {
            EVENT_RUN_END,
            EVENT_SUITE_BEGIN,
            EVENT_SUITE_END,
            EVENT_TEST_BEGIN,
            EVENT_TEST_END
        } = runner.constructor.constants;
        runner
            .on(EVENT_SUITE_BEGIN, app.handleSuiteBegin.bind(app))
            .on(EVENT_SUITE_END, app.handleSuiteEnd.bind(app))
            .on(EVENT_TEST_BEGIN, app.handleTestBegin.bind(app))
            .on(EVENT_TEST_END, app.handleTestEnd.bind(app))
            .once(EVENT_RUN_END, () => {
                app.finalStats(runner.stats);
            });
    }
}
