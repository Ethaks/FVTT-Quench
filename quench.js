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

        this.fixtures = [];

        this.app = new QuenchResults(this);
    }

    registerTestFixture(name, fn) {
        this.fixtures.push({ name, fn });
        this.app.render(false);
    }

    async runSelectedFixtures(fixtures) {
        this.mocha.suite.dispose();
        this.mocha.setup({
            ui: "bdd",
            reporter: "quench",
        });

        this.app.clear();

        const { after, afterEach, before, beforeEach, describe, it, utils } = this.mocha.Mocha;
        const { assert } = this.chai;
        const context = {
            after, afterEach, before, beforeEach, describe, it, utils,
            assert,
        }

        for (let suite of fixtures) {
            await suite.fn(context);
        }

        return this.mocha.run();
    }
}

