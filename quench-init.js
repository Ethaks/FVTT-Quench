import QuenchReporter from "./module/quench-reporter.mjs";
import Quench from "./module/quench.mjs";
import { quenchUtils } from "./module/utils/quench-utils.mjs";
import "./lib/mocha@9.1.1/mocha.js";
import "./lib/chai@4.3.4/chai.js";

import {
    registerBasicFailingTestBatch,
    registerBasicPassingTestBatch,
    registerNestedTestBatch,
    registerOtherTestBatch,
} from "./quench-tests/nonsense-tests.mjs";

/**
 * Sets up Quench and its dependencies
 */
Hooks.on("init", async function quenchInit() {
    
    // Add the custom QuenchReporter to the Mocha class so that it can be used
    mocha.Mocha.reporters.Quench = mocha.Mocha.reporters.quench = QuenchReporter;

    const quench = new Quench(mocha, chai);
    quench.utils = quenchUtils;
    globalThis.quench = quench;

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

    game.settings.register("quench", "collapseSuccessful", {
        name: game.i18n.localize("QUENCH.CollapseSuccessfulLabel"),
        hint: game.i18n.localize("QUENCH.CollapseSuccessfulHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register("quench", "autoShowQuenchWindow", {
        name: game.i18n.localize("QUENCH.AutoShowQuenchWindowLabel"),
        hint: game.i18n.localize("QUENCH.AutoShowQuenchWindowHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register("quench", "autoRun", {
        name: game.i18n.localize("QUENCH.AutoRunLabel"),
        hint: game.i18n.localize("QUENCH.AutoRunHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });
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
 * Show quench window on load if enabled and register example tests if enabled
 */
Hooks.on("quenchReady", async (quench) => {
    if (game.settings.get("quench", "exampleTests")) {
        registerBasicPassingTestBatch(quench);
        registerBasicFailingTestBatch(quench);
        registerNestedTestBatch(quench);
        registerOtherTestBatch(quench);
    }

    let shouldRender = game.settings.get("quench", "autoShowQuenchWindow");
    if (shouldRender) quench.app.render(true);

    if (game.settings.get("quench", "autoRun")) {
        if (shouldRender) await quenchUtils.pause(500);
        quench.runAllBatches();
    }
});
