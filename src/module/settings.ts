import { getGame } from "./utils/quench-utils";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ClientSettings {
    interface Values {
      "quench.logTestDetails": boolean;
      "quench.exampleTests": boolean;
      "quench.collapseSuccessful": boolean;
      "quench.autoShowQuenchWindow": boolean;
      "quench.autoRun": boolean;
    }
  }
}

/**
 * Registers all settings
 */
export function registerSettings(): void {
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
}
