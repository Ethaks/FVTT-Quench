import { MODULE_ID } from "./utils/quench-utils";

declare global {
	interface SettingConfig {
		"quench.logTestDetails": boolean;
		"quench.exampleTests": boolean;
		"quench.collapseSuccessful": boolean;
		"quench.autoShowQuenchWindow": boolean;
		"quench.autoRun": boolean;
		"quench.preselectFilters": string;
	}
}

/**
 * Registers all settings
 */
export function registerSettings(): void {
	if (!(game instanceof Game)) throw new Error("Game is not initialized");

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
		requiresReload: true,
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

	game.settings.register(MODULE_ID, "preselectFilters", {
		name: "QUENCH.PreselectFiltersLabel",
		hint: "QUENCH.PreselectFiltersHint",
		scope: "client",
		config: true,
		type: String,
		default: "**",
	});
}
