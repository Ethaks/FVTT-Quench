import * as chai from "chai";
import "mocha/mocha.js";

import { QuenchSnapshotManager } from "./quench-snapshot.js";
import { registerExampleTests } from "./quench-tests/nonsense-tests.js";
import Quench from "./quench.js";
import { quenchUtils } from "./utils/quench-utils.js";

/**
 * Sets up Quench and its dependencies
 */
Hooks.on("init", function quenchInit() {
  chai.use(QuenchSnapshotManager.enableSnapshots);
  const quench = new Quench();
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
    onChange: foundry.utils.debounce(() => {
      location.reload();
    }, 500),
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
});

Hooks.on("setup", function () {
  Hooks.callAll("quenchReady", quench);
});

/**
 * Inject QUENCH button in sidebar
 */
Hooks.on("renderSidebar", function (_sidebar: Application, html: JQuery<HTMLElement>) {
  const $quenchButton = $(
    `<button class="quench-button"><b>${game.i18n.localize("QUENCH.Title")}</b></button>`,
  );

  $quenchButton.on("click", function onClick() {
    quench.app.render(true);
  });

  html.append($quenchButton);
});

/**
 * Show quench window on load if enabled and register example tests if enabled
 */
Hooks.on("ready", async () => {
  if (game.settings.get("quench", "exampleTests")) {
    registerExampleTests(quench);
  }

  const shouldRender = game.settings.get("quench", "autoShowQuenchWindow");
  if (shouldRender) quench.app.render(true);

  if (game.settings.get("quench", "autoRun")) {
    if (shouldRender) await quenchUtils.pause(1000);
    quench.runAllBatches();
  }
});
