import QuenchReporter from "./module/quench-reporter.mjs";
import Quench from "./module/quench.mjs";

/**
 * Sets up Quench and its dependencies
 */
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
    try {
        await import("https://unpkg.com/mocha/mocha.js");
    } catch (e) {
        console.error("Quench failed to import mocha.js", e);
        return;
    }

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

/**
 * Inject QUENCH button in sidebar
 */
Hooks.on("renderSidebar", function(sidebar, html, options) {
    console.log("Rendering sidebar!", arguments);
    const $quenchButton = $(`<button class="quench-button"><b>${game.i18n.localize("QUENCH.Title")}</b></button>`);

    $quenchButton.click(function onClick() {
        quench.app.render(true);
    });

    html.append($quenchButton);
});

