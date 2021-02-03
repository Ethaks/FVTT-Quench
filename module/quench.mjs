import QuenchResults from "./apps/quench-results.mjs";

export default class Quench {
    constructor(mocha, chai) {
        this.mocha = mocha;
        this.mocha._cleanReferencesAfterRun = false;
        this.chai = chai;
        this.suiteGroups = new Map();
        this.app = new QuenchResults(this);
    }

    registerSuiteGroup(name, fn, { displayName = null } = {}) {
        if (this.suiteGroups.has(name)) {
            ui?.notifications?.warn(`QUENCH: Suite group "${name}" already exists. Overwriting...`);
        }
        this.suiteGroups.set(name, { displayName: displayName ?? name, fn });
        this.app.clear();
    }

    async runSelectedSuiteGroups(groupKeys) {
        // Cleanup - create a new root suite and clear the state of the results application
        const Mocha = this.mocha.Mocha;
        Mocha.suite = this.mocha.suite = new Mocha.Suite("__root", new Mocha.Context(), true);
        await this.app.clear();

        // Initialize mocha with a quench reporter
        this.mocha.setup({
            ui: "bdd",
            reporter: "quench",
        });

        // Prepare context methods to be provided to test fixtures
        const { after, afterEach, before, beforeEach, describe, it, utils } = Mocha;
        const { assert } = this.chai;
        const context = {
            after, afterEach, before, beforeEach, it, utils,
            assert,
        };

        // Register suites and tests for provided suite groups
        for (let key of groupKeys) {
            // Override `describe` to add a property to the resulting suite indicating which quench suite group the suite belongs to.
            context.describe = function quenchDescribe(...args) {
                const suite = describe(...args);
                suite._quench_parentGroup = key;
                return suite;
            };

            // Call the group registration function
            await this.suiteGroups.get(key).fn(context);
        }

        // Run the tests and hold on to the runner
        this._currentRunner = this.mocha.run();
        const EVENT_RUN_END = this._currentRunner.constructor.constants.EVENT_RUN_END;
        this._currentRunner.once(EVENT_RUN_END, () => this._currentRunner = null);
        return this._currentRunner;
    }

    abort() {
        this._currentRunner.abort();
    }
}
