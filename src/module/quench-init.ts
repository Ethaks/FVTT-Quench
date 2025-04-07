import "mocha/mocha.js";
import * as chai from "chai";
import chaiPromised from "chai-as-promised";

import { Quench } from "./quench";
import { QuenchSnapshotManager } from "./quench-snapshot";
import { registerExampleTests } from "./quench-tests/nonsense-tests";
import { registerSettings } from "./settings";
import { createNode, enforce, getFilterSetting, getGame, localize } from "./utils/quench-utils";
import { pause } from "./utils/user-utils";

import "../styles/quench.css";

declare global {
	/**
	 * The singleton instance of the {@link Quench} class, containing the primary public API.
	 * Initialized in the Quench module's {@link Hooks.StaticCallbacks.init "init"} hook.
	 */
	var quench: "quenchReady" extends keyof AssumeHookRan ? Quench : Quench | undefined;

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
// @ts-expect-error
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

Hooks.on("setup", () => {
	Hooks.callAll("quenchReady", quench);
});

/**
 * Inject QUENCH button in sidebar
 */
Hooks.on("renderSidebar", (_sidebar: Application, html: HTMLElement) => {
	const quenchButton = createNode("button");
	quenchButton.classList.add(
		"ui-control",
		"plain",
		"icon",
		"fa-solid",
		"fa-flask",
		"quench-button",
	);
	quenchButton.setAttribute("data-tooltip", "QUENCH.Title");
	quenchButton.addEventListener("click", () => {
		enforce(quench);
		quench.app.render({ force: true });
	});
	const li = document.createElement("li");
	li.insertAdjacentElement("afterbegin", quenchButton);

	html
		.querySelector("aside#sidebar .tabs.faded-ui menu li:has(button[data-action='toggleState'])")
		?.insertAdjacentElement("beforebegin", li);
});

/**
 * Show quench window on load if enabled and register example tests if enabled
 */
Hooks.on("ready", async () => {
	enforce(quench);

	if (getGame().settings.get("quench", "exampleTests")) {
		registerExampleTests(quench);
	}

	const shouldRender = getGame().settings.get("quench", "autoShowQuenchWindow");
	if (shouldRender) quench.app.render({ force: true });

	if (getGame().settings.get("quench", "autoRun")) {
		if (shouldRender) await pause(1000);
		// Only run tests included in the filter and registered as preSelected
		quench.runBatches(getFilterSetting(), { preSelectedOnly: true });
	}
});
