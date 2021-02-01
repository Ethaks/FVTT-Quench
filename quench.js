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

    mocha.Mocha.reporters.Quench = mocha.Mocha.reporters.quench = QuenchReporter;

    globalThis.quench = new Quench(mocha, chai);
}
quenchInit();

class Quench {
    constructor(mocha, chai) {
        this.mocha = mocha;
        this.chai = chai;
        this.mocha._cleanReferencesAfterRun = false;
        this.fixtures = new Map();
        this.app = new QuenchResults(this);
    }

    registerTestFixture(name, fn, { displayName=null }={}) {
        if (this.fixtures.has(name)) {
            ui.notifications.warn(`QUENCH: Test fixture "${name}" already exists. Overwriting...`);
        }
        this.fixtures.set(name, { displayName: displayName ?? name, fn });
        this.app.render(false);
    }

    async runSelectedFixtures(fixtures) {
        // Cleanup
        this.mocha.suite.dispose();
        this.app.clear();

        this.mocha.setup({
            ui: "bdd",
            reporter: "quench",
        });

        // Prepare context methods to be provided to test fixtures
        const { after, afterEach, before, beforeEach, describe, it, utils } = this.mocha.Mocha;
        const { assert } = this.chai;
        const context = {
            after, afterEach, before, beforeEach, describe, it, utils,
            assert,
        }

        // Register suites and tests for selected fixtures
        for (let fixture of fixtures) {
            await fixture.fn(context);
        }

        return this.mocha.run();
    }
}

