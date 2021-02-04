import QuenchReporter from "./module/quench-reporter.mjs";
import Quench from "./module/quench.mjs";
import { quenchUtils } from "./module/utils/quench-utils.mjs";
import {
    registerBasicFailingSuiteGroup,
    registerBasicPassingSuiteGroup,
    registerNestedSuiteGroup, registerOtherSuiteGroup,
} from "./quench-tests/nonsense-tests.mjs";

/**
 * Sets up Quench and its dependencies
 */
Hooks.on("init", async function quenchInit() {
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

    // Import dependencies
    await import("./lib/mocha@8.2.1/mocha.js");
    await import("./lib/chai@4.2.0/chai.js");

    // Cache the mocha and chai globals added by the above imports, then restore the previous state of globalThis
    const mocha = globalThis.mocha;
    const chai = oldGlobal.chai;       // Somehow importing chai above results in chai being added to the old globalThis. It's probably some weirdness with async/await
    globalThis = oldGlobal;

    // Add the custom QuenchReporter to the Mocha class so that it can be used
    mocha.Mocha.reporters.Quench = mocha.Mocha.reporters.quench = QuenchReporter;

    const quench = new Quench(mocha, chai);
    quench.utils = quenchUtils;
    globalThis.quench = quench;

    Hooks.callAll("quenchReady", quench);
});

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

/**
 * Register settings
 */
Hooks.on("init", () => {
    game.settings.register("quench", "logTestDetails", {
        name: game.i18n.localize("QUENCH.LogTestDetailsLabel"),
        hint: game.i18n.localize("QUENCH.LogTestDetailsHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register("quench", "exampleTests", {
        name: game.i18n.localize("QUENCH.ExampleTestsLabel"),
        hint: game.i18n.localize("QUENCH.ExampleTestsHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => location.reload(),
    });
});

/**
 * Register example tests
 */
Hooks.on("quenchReady", (quench) => {
    if (game.settings.get("quench", "exampleTests")) {
        registerBasicPassingSuiteGroup(quench);
        registerBasicFailingSuiteGroup(quench);
        registerNestedSuiteGroup(quench);
        registerOtherSuiteGroup(quench);
    }
});

