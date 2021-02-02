import QuenchResults from "./module/apps/quench-results.mjs";
import QuenchReporter from "./module/quench-reporter.mjs";

async function quenchInit() {
    // Cache the current state of globalThis and overwrite it with a blank object temporarily to make sure mocha doesn't absorb Foundry globals
    const oldGlobal = globalThis;
    globalThis = {
        Date: oldGlobal.Date,
        setTimeout: oldGlobal.setTimeout,
        setInterval: oldGlobal.setInterval,
        clearTimeout: oldGlobal.clearTimeout,
        clearInterval: oldGlobal.clearInterval,
        onerror: oldGlobal.onerror,
        location: oldGlobal.location,
        document: oldGlobal.document,
    };
    await import("https://unpkg.com/mocha/mocha.js");

    // Cache the mocha and chai globals added by the above imports, then restore the previous state of globalThis
    const mocha = globalThis.mocha;
    const chai = oldGlobal.chai;
    delete oldGlobal.chai;
    globalThis = oldGlobal;

    // Add the custom QuenchReporter to the Mocha class so that it can be used
    mocha.Mocha.reporters.Quench = mocha.Mocha.reporters.quench = QuenchReporter;

    globalThis.quench = new Quench(mocha, chai);
    Hooks.callAll("quenchReady", this);
}
quenchInit();

class Quench {
    constructor(mocha, chai) {
        this.mocha = mocha;
        this.mocha._cleanReferencesAfterRun = false;
        this.chai = chai;
        this.suiteGroups = new Map();
        this.app = new QuenchResults(this);
    }

    registerSuiteGroup(name, fn, { displayName=null }={}) {
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

        return this.mocha.run();
    }
}

