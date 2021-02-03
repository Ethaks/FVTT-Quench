import QuenchResults from "./apps/quench-results.mjs";

/**
 * The `Quench` class is the "hub" of the Quench module. It contains the primary public API for Quench, as well as references to the global
 * mocha and chai objects.
 *
 * @property {Mocha} mocha - the global mocha instance
 * @property {object} chai - the global chai instance
 * @property {Map<string, object>} _suiteGroups - a map of registered suite groups
 * @property {QuenchResults} app - the singleton instance of `QuenchResults` that this `Quench` instance uses
 */
export default class Quench {
    constructor(mocha, chai) {
        this.mocha = mocha;
        this.mocha._cleanReferencesAfterRun = false;
        this.chai = chai;
        this._suiteGroups = new Map();
        this.app = new QuenchResults(this);
    }

    /**
     * Registers a new Quench suite group which will show up in the quench window to be enabled/disabled and run.
     *
     * Suites and tests within a Quench suite group are not actually registered in the mocha runner until the user initiates the test run
     * with {@link Quench#runSelectedSuiteGroups}. When `runSelectedSuiteGroups` is executed, the provided groups' registration functions
     * are run and then the tests are executed.
     *
     * The registration function is passed a `context` argument, which contains the mocha and chai methods necessary for defining a test.
     * - Mocha - `describe`, `it`, `after`, `afterEach`, `before`, `beforeEach`, and `utils`.
     * - Chai - `assert`
     *
     * @example
     * quench.registerSuiteGroup("quench.examples.basic-pass", (context) => {
     *     const { describe, it, assert } = context;
     *
     *     describe("Passing Suite", function() {
     *         it("Passing Test", function() {
     *             assert.ok(true);
     *         });
     *     });
     * }, { displayName: "QUENCH: Basic Passing Test" });
     *
     * @param {string} key - The suite group's unique string key. Only one suite group with a given key can exist at one time.
     *     If you register a suite group with a pre-existing key, it will overwrite the previous suite group.
     * @param {function} fn - The function which will be called to register the suites and tests within your suite group.
     * @param {object} options
     * @param {string|null} [options.displayName] - A user-friendly name to show in the Quench UI and detailed results.
     */
    registerSuiteGroup(key, fn, { displayName = null } = {}) {
        if (this._suiteGroups.has(key)) {
            ui?.notifications?.warn(`QUENCH: Suite group "${key}" already exists. Overwriting...`);
        }
        this._suiteGroups.set(key, { displayName: displayName ?? key, fn });
        this.app.clear();
    }

    /**
     * Runs the suite groups defined by the keys in `groupKeys`.
     *
     * The contents of the suite groups are registered with mocha when this function is executed.
     *
     * @param {string[]} groupKeys - Array of keys for the suite groups to be run.
     * @returns {Promise<Runner>} - Returns the mocha Runner object for this test run.
     */
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
            await this._suiteGroups.get(key).fn(context);
        }

        // Run the tests and hold on to the runner
        this._currentRunner = this.mocha.run();
        const EVENT_RUN_END = this._currentRunner.constructor.constants.EVENT_RUN_END;
        this._currentRunner.once(EVENT_RUN_END, () => this._currentRunner = null);
        return this._currentRunner;
    }

    /**
     * Aborts the currently running tests, if tests are currently running. Does nothing if no tests are currently running.
     * This will not cancel an in progress test. The run will abort after the currently running test completes.
     */
    abort() {
        this._currentRunner?.abort();
    }
}
