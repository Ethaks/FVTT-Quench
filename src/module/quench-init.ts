import "mocha/mocha.js";
import * as chai from "chai";
import chaiPromised from "chai-as-promised";

import type { QuenchResults } from "./apps/quench-results";

import { QuenchSnapshotManager } from "./quench-snapshot";
import { registerExampleTests } from "./quench-tests/nonsense-tests";
import { Quench } from "./quench";
import { enforce, getFilterSetting, getGame, localize, MODULE_ID } from "./utils/quench-utils";
import { pause } from "./utils/user-utils";
import { registerSettings } from "./settings";

import "../styles/quench.css";

declare global {
  /**
   * The singleton instance of the {@link Quench} class, containing the primary public API.
   * Initialized in the Quench module's {@link Hooks.StaticCallbacks.init "init"} hook.
   */
  var quench: "quench" extends keyof LenientGlobalVariableTypes ? Quench : Quench | undefined; // eslint-disable-line no-var
  namespace Hooks {
    interface StaticCallbacks {
      /**
       * A hook event that fires when Quench is ready to register batches.
       *
       * @group Initialization
       * @see {@link quench!Quench#registerBatch quench.registerBatch}
       * @remarks This is called by {@link Hooks.callAll}
       * @param quench - The global {@link Quench} instance
       */
      quenchReady: (quench: Quench) => void;
    }
  }
  interface BrowserMocha {
    _cleanReferencesAfterRun: boolean;
  }
}

// Initialize Quench
globalThis.quench = new Quench();

// Initialize Chai and snapshots
// @ts-expect-error Match runtime (ESM import) to types (declared global `chai`)
globalThis.chai = chai;
chai.use(QuenchSnapshotManager.enableSnapshots);
chai.use(chaiPromised);

// Allow re-running of tests
mocha._cleanReferencesAfterRun = false;

/**
 * Sets up Quench and its dependencies
 */
Hooks.on("init", function quenchInit() {
  registerSettings();
});

Hooks.on("setup", function () {
  Hooks.callAll("quenchReady", quench);
});

/**
 * Inject QUENCH button in sidebar
 */
Hooks.on("renderSidebar", function (_sidebar: Application, html: JQuery<HTMLElement>) {
  const $quenchButton = $(
    `<button class="quench-button" data-tooltip="QUENCH.Title"><i class="fas fa-flask"></i><b class="button-text">${localize(
      "Title",
    )}</b></button>`,
  );

  $quenchButton.on("click", function onClick() {
    enforce(quench);
    quench.app.render(true);
  });

  html.append($quenchButton);
});

/**
 * Show quench window on load if enabled and register example tests if enabled
 */
Hooks.on("ready", async () => {
  enforce(quench);

  // Handle migration from deprecated preselections to new filter settings; introduced in v0.8
  const preselectedPackages = getGame().settings.get(MODULE_ID, "preselectedPackages");
  const filter = getGame().settings.get(MODULE_ID, "preselectFilters");
  if (preselectedPackages && !filter) {
    await getGame().settings.set(
      MODULE_ID,
      "preselectFilters",
      preselectedPackages
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean)
        .map((key) => `${key}.**`)
        .join(","),
    );
    await getGame().settings.set(MODULE_ID, "preselectedPackages", "");
  }

  if (getGame().settings.get("quench", "exampleTests")) {
    registerExampleTests(quench);
  }

  const shouldRender = getGame().settings.get("quench", "autoShowQuenchWindow");
  if (shouldRender) quench.app.render(true);

  if (getGame().settings.get("quench", "autoRun")) {
    if (shouldRender) await pause(1000);
    // Only run tests included in the filter and registered as preSelected
    quench.runBatches(getFilterSetting(), { preSelectedOnly: true });
  }
});

Hooks.on(
  "getQuenchResultsHeaderButtons",
  (_app: QuenchResults, buttons: Record<string, unknown>[]) => {
    buttons.unshift({
      class: "quench-settings",
      icon: "fas fa-cog",
      label: "QUENCH.Settings",
      onclick: () => {
        const config = getGame().settings.sheet;
        // @ts-expect-error No other way to render setting config with specific tab active
        config._tabs[0].active = "quench";
        config.render(true, { focus: true });
      },
    });
  },
);
