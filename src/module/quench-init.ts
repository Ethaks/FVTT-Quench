import * as chai from "chai";
import "mocha/mocha.js";
import "chai"; // To force-load types for npm package

import { QuenchSnapshotManager } from "./quench-snapshot";
import { registerExampleTests } from "./quench-tests/nonsense-tests";
import Quench from "./quench";
import { quenchUtils } from "./utils/quench-utils";

const { getGame, localize } = quenchUtils._internal;

declare global {
  /**
   * The singleton instance of the {@link Quench} class, containing the primary public API.
   * Initialized in the Quench module's {@link Hooks.StaticCallbacks.init|"init"} hook.
   */
  /* eslint-disable-next-line no-var */ // Necessary for globalThis addition
  var quench: Quench;
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Hooks {
    interface StaticCallbacks {
      /**
       * A hook event that fires when Quench is ready to register batches.
       *
       * @deprecated
       * @param quench - The global {@link Quench} instance
       * @remarks This is called by {@link Hooks.callAll}
       */
      quenchReady: (quench: Quench) => void;
    }
  }
}

/**
 * Sets up Quench and its dependencies
 */
Hooks.on("init", function quenchInit() {
  chai.use(QuenchSnapshotManager.enableSnapshots);
  const quench = new Quench();
  globalThis.quench = quench;

  const game = getGame();

  game.settings.register("quench", "logTestDetails", {
    name: "QUENCH.LogTestDetailsLabel",
    hint: "QUENCH.LogTestDetailsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("quench", "exampleTests", {
    name: "QUENCH.ExampleTestsLabel",
    hint: "QUENCH.ExampleTestsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: foundry.utils.debounce(() => {
      location.reload();
    }, 500),
  });

  game.settings.register("quench", "collapseSuccessful", {
    name: "QUENCH.CollapseSuccessfulLabel",
    hint: "QUENCH.CollapseSuccessfulHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("quench", "autoShowQuenchWindow", {
    name: "QUENCH.AutoShowQuenchWindowLabel",
    hint: "QUENCH.AutoShowQuenchWindowHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("quench", "autoRun", {
    name: "QUENCH.AutoRunLabel",
    hint: "QUENCH.AutoRunHint",
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
  const $quenchButton = $(`<button class="quench-button"><b>${localize("Title")}</b></button>`);

  $quenchButton.on("click", function onClick() {
    quench.app.render(true);
  });

  html.append($quenchButton);
});

/**
 * Show quench window on load if enabled and register example tests if enabled
 */
Hooks.on("ready", async () => {
  if (getGame().settings.get("quench", "exampleTests")) {
    registerExampleTests(quench);
  }

  const shouldRender = getGame().settings.get("quench", "autoShowQuenchWindow");
  if (shouldRender) quench.app.render(true);

  if (getGame().settings.get("quench", "autoRun")) {
    if (shouldRender) await quenchUtils.pause(1000);
    quench.runAllBatches();
  }
});
