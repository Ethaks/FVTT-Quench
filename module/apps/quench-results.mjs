export default class QuenchResults extends Application {
    constructor(quench, options) {
        super(options);
        this.quench = quench;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 600,
            height: 600,
            template: "/modules/quench/templates/quench-results.hbs",
        })
    }

    getData() {
        return {
            fixtures: this.quench.fixtures
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        const self = this;
        html.find("#mocha-run").click(async function (event) {
            await self.quench.runSelectedFixtures(self.quench.fixtures);
        });
    }

    clear() {
        this.element.find("#mocha").html("");
    }

    handleSuiteBegin(suite) {
        console.log("Suite begin", arguments);
    }

    handleSuiteEnd(suite) {
        console.log("Suite end", arguments);
    }

    handleTestBegin(test) {
        console.log("Test begin", arguments);
    }

    handleTestEnd(test) {
        console.log("Test end", arguments);
    }

    finalStats(stats) {
        console.log("Stats", stats);
    }
}
