import { getGame, MODULE_ID } from "./utils/quench-utils";

declare global {
  namespace ClientSettings {
    interface Values {
      "quench.logTestDetails": boolean;
      "quench.exampleTests": boolean;
      "quench.collapseSuccessful": boolean;
      "quench.autoShowQuenchWindow": boolean;
      "quench.autoRun": boolean;
      /** @deprecated */
      "quench.preselectedPackages": string;
      "quench.preselectFilters": string;
    }
  }
}

/**
 * Registers all settings
 */
export function registerSettings(): void {
  const game = getGame();

  game.settings.register(MODULE_ID, "logTestDetails", {
    name: "QUENCH.LogTestDetailsLabel",
    hint: "QUENCH.LogTestDetailsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "exampleTests", {
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

  game.settings.register(MODULE_ID, "collapseSuccessful", {
    name: "QUENCH.CollapseSuccessfulLabel",
    hint: "QUENCH.CollapseSuccessfulHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "autoShowQuenchWindow", {
    name: "QUENCH.AutoShowQuenchWindowLabel",
    hint: "QUENCH.AutoShowQuenchWindowHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "autoRun", {
    name: "QUENCH.AutoRunLabel",
    hint: "QUENCH.AutoRunHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  // Deprecated with Quench v0.8.0; config set to false for now
  game.settings.register(MODULE_ID, "preselectedPackages", {
    name: "QUENCH.PreselectedPackagesLabel",
    hint: "QUENCH.PreselectedPackagesHint",
    scope: "client",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "preselectFilters", {
    name: "QUENCH.PreselectFiltersLabel",
    hint: "QUENCH.PreselectFiltersHint",
    scope: "client",
    config: true,
    type: String,
    default: "**",
  });
}
