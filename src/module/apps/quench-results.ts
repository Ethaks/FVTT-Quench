import * as Diff from "diff";

import type { Quench, QuenchBatchKey } from "../quench";
import type { RUNNABLE_STATE } from "../utils/quench-utils";

import { MissingSnapshotError } from "../utils/quench-snapshot-error";
import {
  createNode,
  enforce,
  getFilterSetting,
  getGame,
  getSuiteState,
  getTestState,
  localize,
  RUNNABLE_STATES,
  serialize,
} from "../utils/quench-utils";
import { pause } from "../utils/user-utils";

/**
 * The visual UI for representing Quench test batches and the tests results thereof.
 *
 * @internal
 */
export class QuenchResults extends Application {
  /** The `Quench` instance this `Application` is used by */
  quench: Quench;

  /** Whether the button allowing snapshot updates should be shown after a run */
  private _enableSnapshotUpdates = false;

  /**
   * @param quench - The `Quench` instance this `Application` belongs to
   * @param options - Additional options
   */
  constructor(quench: Quench, options?: ApplicationOptions) {
    super(options);
    this.quench = quench;
  }

  /** @inheritDoc */
  static override get defaultOptions(): ApplicationOptions {
    const width = 550;
    const sidebarWidth = 300;
    const margin = 10;

    return mergeObject(super.defaultOptions, {
      title: "QUENCH.Title",
      id: "quench-results",
      width,
      height: window.innerHeight - margin * 3,
      top: margin,
      left: window.innerWidth - width - sidebarWidth - margin * 2,
      resizable: true,
      template: "/modules/quench/templates/quench-results.hbs",
      filters: [{ inputSelector: "input#quench-filter", contentSelector: "#quench-batches-list" }],
    });
  }

  /** @inheritDoc */
  override getData(): QuenchResultData {
    const filterSetting = getFilterSetting();
    const preselected = this.quench._filterBatches(filterSetting, { preSelectedOnly: true });
    return {
      anyBatches: this.quench._testBatches.size > 0,
      batches: this.quench._testBatches.map((batchData) => {
        return {
          name: batchData.key,
          displayName: batchData.displayName,
          selected: preselected.includes(batchData.key),
        };
      }),
    };
  }

  override activateListeners($html: JQuery) {
    super.activateListeners($html);

    // Select All Button
    $html.find("#quench-select-all").on("click", () => {
      this.element
        .find(`#quench-batches-list .test-batch input[type="checkbox"]`)
        .prop("checked", true);
    });

    // Select None Button
    $html.find("#quench-select-none").on("click", () => {
      this.element
        .find(`#quench-batches-list .test-batch input[type="checkbox"]`)
        .prop("checked", false);
    });

    // Run Button
    $html.find("#quench-run").on("click", async () => {
      const enabledBatches: QuenchBatchKey[] = this._getCheckedBatches();
      await this.quench.runBatches(enabledBatches);
    });

    // Abort Button
    $html.find("#quench-abort").on("click", () => {
      this.quench.abort();
    });

    $html.find("#quench-update-snapshots").on("click", async () => {
      await this.quench.snapshots.updateSnapshots();
    });

    // Handle clicking on expander via event delegation
    $html[0].addEventListener("click", (event) => {
      this._onExpanderClick(event);
    });
  }

  /**
   * Handle clicking on an expander, either to expand or collapse a summary or list of tests.
   *
   * @remarks For some reason, this convoluted handling including pauses/timeouts, listeners etc. is necessary
   * to allow Firefox to properly transition the height of the expandable element without getting stuck,
   * while at the same time allowing Chromium to transition without resorting to flickering.
   * @internal
   * @param event - The click event
   */
  private async _onExpanderClick(event: Event) {
    const expander = event.target as HTMLElement;
    if (!expander.matches(".expander")) return;
    event.preventDefault();
    const expandable = expander
      .closest(".summary")
      ?.parentElement?.querySelector(".expandable") as HTMLElement | null;

    enforce(expander && expandable, "Invalid expander element");

    const expanded = expandable.classList.contains("expanded");
    const icons = { expanded: "fa-caret-down", collapsed: "fa-caret-right" };

    if (expanded) {
      // Collapse
      expander.classList.remove(icons.expanded);
      expander.classList.add(icons.collapsed);
      if (expandable.style.height === "0px") expandable.style.removeProperty("height");
      expandable.style.height = expandable.clientHeight + "px";

      expandable.addEventListener(
        "transitionend",
        () => {
          // Remove height property and instead rely on class to keep the element collapsed
          expandable.style.removeProperty("height");
          expandable.classList.remove("expanded");
        },
        {
          once: true,
        },
      );
      // Wait a bit to allow Firefox to recognize the change in height
      await pause(10);
      expandable.style.height = "0px";
    } else {
      // Expand
      expander.classList.remove(icons.collapsed);
      expander.classList.add(icons.expanded);
      expandable.classList.add("expanded");

      // Briefly set height to auto to get the full height of the element, then set it to 0 to enable a transition,
      // which requires a change from one value to another throughout cycles
      expandable.style.height = "auto";
      const height = expandable.clientHeight + "px";
      expandable.style.height = "0px";

      expandable.addEventListener(
        "transitionend",
        () => {
          // Remove height property to enable the element to react to changes to its contents
          expandable.style.removeProperty("height");
        },
        { once: true },
      );
      // Wait a bit to allow Firefox to recognize the change in height
      await pause(10);
      expandable.style.height = height;
    }
  }

  /** @inheritDoc */
  override _onSearchFilter(_event: Event, query: string, rgx: RegExp, html: HTMLElement) {
    /**
     * Recursively check if an element should be displayed.
     * An element should only be displayed if a parent's or child's title matches the query,
     * or if the element itself matches the query.
     *
     * @param element - The element to check
     * @param parentHasQuery - Whether any of the element's parents match the query
     * @returns Whether the element or any of its children match the query
     */
    const checkElement = (element: HTMLElement, parentHasQuery = false): boolean => {
      // Whether the element itself matches the query
      const hasQuery = rgx.test(
        SearchFilter.cleanQuery(element.querySelector(".runnable-title")?.textContent || ""),
      );
      const runnables = [...(element.querySelector(".runnable-list")?.children ?? [])];
      // Whether any of the element's children match the query
      let runnableHasQuery = false;
      for (const runnable of runnables) {
        runnableHasQuery =
          checkElement(runnable as HTMLElement, hasQuery || parentHasQuery) || runnableHasQuery;
      }

      if (parentHasQuery || hasQuery || runnableHasQuery) {
        // Ensure element itself is not hidden
        element.classList.remove("disabled", "filtered");

        // Ensure that a suite's children are not hidden if the suite or any of its children match the query
        // An element's parent matching the query is not sufficient to expand a suite's children
        // Error messages should not be expanded
        const runnableList = element.querySelector(".runnable-list");
        if (
          query &&
          (hasQuery || runnableHasQuery) &&
          element.classList.contains("suite") &&
          runnableList
        ) {
          const expander = element.querySelector(".expander");
          if (expander) expander.classList.replace("fa-caret-right", "fa-caret-down");
          const expandable: HTMLElement | null = element.querySelector(".expandable");
          if (expandable) {
            expandable.classList.add("expanded");
            expandable.style.removeProperty("height");
          }
        }
        return true;
      } else {
        element.classList.add("disabled", "filtered");
        return false;
      }
    };

    for (const batchLi of html.children as HTMLCollection) {
      for (const element of batchLi.querySelector(".runnable-list")?.children ?? []) {
        checkElement(element as HTMLElement);
      }
    }
  }

  /**
   * Clears the currently visible test results while maintaining currently selected test batches
   */
  async clear() {
    if (this._state !== Application.RENDER_STATES.RENDERED) return;

    const checked = this._getCheckedBatches();

    try {
      await this._render(false);
    } catch (error) {
      if (error instanceof Error)
        error.message = `An error occurred while rendering ${this.constructor.name} ${this.appId}: ${error.message}`;
      console.error(error);
      this._state = Application.RENDER_STATES.ERROR;
    }

    this.element.find("#quench-batches-list li.test-batch").each(function () {
      const batchChecked = checked.includes(this.dataset.batch as QuenchBatchKey);
      if (batchChecked !== undefined) {
        $(this).find("> label > input[type=checkbox]").prop("checked", batchChecked);
      }
    });
  }

  /**
   * Determines which test batch elements are checked in the UI
   * @returns An array of {@link QuenchBatchKey}s belonging to batches checked in the UI
   */
  private _getCheckedBatches(): QuenchBatchKey[] {
    const $batchEls = this.element.find("#quench-batches-list li");
    return $batchEls
      .map((_, element) => {
        const enabled = !!$(element).find("input[type=checkbox]").prop("checked");
        return { key: element.dataset.batch, enabled };
      })
      .get()
      .filter((batch) => batch.key && batch.enabled)
      .map(({ key }) => key as QuenchBatchKey);
  }

  /**
   * Finds or creates an unordered list to contain items for each child runnable (test or suite) of the given parent
   * @param $parentListElement - The <li> of the parent test batch or suite
   * @returns The <ul> into which child runnables can be inserted.
   */
  private _findOrMakeChildList($parentListElement: JQuery<HTMLElement>): JQuery<HTMLElement> {
    const $expandable = $parentListElement.find(`> div.expandable`);
    let $childList = $expandable.find(`> ul.runnable-list`);
    if ($childList.length === 0) {
      $childList = $(`<ul class="runnable-list">`);
      $expandable.append($childList);
    }

    return $childList;
  }

  /**
   * Creates a new <li> to represent the runnable given by the provided details
   * @param title - The runnable title to show in the UI.
   * @param id - The mocha id of the runnable.
   * @param isTest - Whether this runnable is a test (or a suite, if false)
   * @returns The <li> element representing this runnable.
   */
  private _makeRunnableLineItem(title: string, id: string, isTest: boolean): JQuery {
    const type = isTest ? "test" : "suite";
    const typeIcon = isTest ? "fa-flask" : "fa-folder";
    const expanderIcon = isTest ? "fa-caret-right" : "fa-caret-down";
    const $li = $(`
            <li class="${type}" data-${type}-id="${id}">
                <span class="summary">
                    <i class="expander fas ${expanderIcon}" data-expand-target="${id}"></i></button>
                    <i class="status-icon"></i>
                    <i class="type-icon fas ${typeIcon}"></i>
                    <span class="runnable-title">${title}</span>
                </span>
                <div class="expandable ${isTest ? "" : "expanded"}" data-expand-id="${id}"></div>
            </li>
        `);

    this._updateLineItemStatus($li, RUNNABLE_STATES.IN_PROGRESS, isTest);
    return $li;
  }

  /**
   * Updates the given existing <li> representing a runnable based on the given state
   * @param $listElement - The list element representing the runnable
   * @param state - the state of the runnable
   * @param isTest - whether the item is a test
   */
  private _updateLineItemStatus(
    $listElement: JQuery<HTMLElement>,
    state: RUNNABLE_STATE,
    isTest?: boolean,
  ) {
    const $icon = $listElement.find("> .summary > i.status-icon");
    let icon = "fa-sync";
    const style = "fas";
    switch (state) {
      case RUNNABLE_STATES.PENDING: {
        icon = "fa-minus-circle";
        break;
      }
      case RUNNABLE_STATES.SUCCESS: {
        icon = "fa-check-circle";
        break;
      }
      case RUNNABLE_STATES.FAILURE: {
        icon = "fa-times-circle";
        break;
      }
    }
    $icon.removeClass();
    $icon.addClass(`status-icon ${style} ${icon}`);

    if (
      getGame().settings.get("quench", "collapseSuccessful") &&
      state === RUNNABLE_STATES.SUCCESS &&
      !isTest
    ) {
      $listElement
        .find("> .summary > .expander")
        .removeClass("fa-caret-down")
        .addClass("fa-caret-right");
      $listElement.find("> .expandable").removeClass("expanded");
    }

    // Hide expander for tests with results without info that could be expanded
    if (isTest && (state === RUNNABLE_STATES.SUCCESS || state === RUNNABLE_STATES.PENDING)) {
      $listElement.find("> .summary > .expander").addClass("quench-hidden");
    }

    // Hide direct error message child for suites with hook errors
    if ($listElement.hasClass("suite") && state === RUNNABLE_STATES.FAILURE) {
      const hasError = $listElement.find("> .expandable > .error").length > 0;
      const expandable = $listElement.children(".expandable");
      if (hasError) {
        expandable[0].classList.remove("expanded");
        $listElement
          .find("> .summary > .expander")
          .removeClass("fa-caret-down")
          .addClass("fa-caret-right");
      }
    }
  }

  private static _getErrorDiff(error: { actual: unknown; expected: unknown }): HTMLElement {
    const diffNode = createNode("div", { attr: { class: "diff" } });

    const expected =
      typeof error.expected === "string" ? error.expected : serialize(error.expected);
    const actual = typeof error.actual === "string" ? error.actual : serialize(error.actual);
    const diff = Diff.diffLines(expected, actual);

    if (diff.length === 2 && diff.every((change) => change.count === 1)) {
      // Compact layout for single line values (e.g. comparing numbers)
      diffNode.insertAdjacentHTML(
        "beforeend",
        '<span class="expected">- ' +
          localize("Expected") +
          ": " +
          diff.find((change) => change.removed)?.value +
          '<br></span><span class="actual">+ ' +
          localize("Actual") +
          ": " +
          diff.find((change) => change.added)?.value,
      );
    } else {
      // Full diff layout for longer diffs
      diffNode.insertAdjacentHTML(
        "beforeend",
        '<span class="expected">- ' +
          localize("Expected") +
          ' </span><span class="actual">+ ' +
          localize("Actual") +
          "</span><br>",
      );
      const fragment = diff
        .map((part, index) => {
          // Trim down large blocks of unchanged content
          if (part.count !== undefined && part.count > 14 && !(part.added || part.removed)) {
            const startContext =
              index === 0
                ? []
                : part.value
                    .split("\n")
                    .slice(0, 6)
                    .map((p) => p.trimEnd())
                    .filter(Boolean);
            const endContext =
              index === diff.length - 1
                ? []
                : part.value
                    .split("\n")
                    .slice(-6)
                    .map((p) => p.trimEnd())
                    .filter(Boolean);
            //const ellipse = startContext.length > 0 || endContext.length > 0 ? ["…\n"] : [];
            part.value = [...startContext, "…", ...endContext, ""].join("\n");
          }
          // Add line break to single line parts without one
          if (part.count !== undefined && part.count === 1 && !part.value.endsWith("\n")) {
            part.value += "\n";
          }

          return createNode("span", {
            attr: { class: part.removed ? "expected" : part.added ? "actual" : "unchanged" },
            children: part.value,
          });
        })
        // eslint-disable-next-line unicorn/no-array-reduce -- "summing" of fragments as simple operation
        .reduce((fragment, span) => {
          fragment.append(span);
          return fragment;
        }, document.createDocumentFragment());
      diffNode.append(fragment);
    }
    return diffNode;
  }

  /*--------------------------------*/
  /* Handle incoming test reporting */
  /*--------------------------------*/

  /**
   * Called by {@link QuenchReporter} when a mocha suite begins running
   * @param suite - The starting Mocha suite
   */
  handleSuiteBegin(suite: Mocha.Suite) {
    const batchkey = suite._quench_parentBatch;
    const isBatchRoot = suite._quench_batchRoot;

    // If this suite is the root of a test batch or does not belong to a test batch, don't show in the UI.
    if (!batchkey || isBatchRoot) return;

    // Get the li to add this test batch to
    const parentId = suite.parent?.id;
    const $batchLi = this.element.find(`li.test-batch[data-batch="${batchkey}"]`);
    let $parentLi = $batchLi.find(`li.suite[data-suite-id="${parentId}"]`);
    if ($parentLi.length === 0) $parentLi = $batchLi;

    // Add a li for this test batch
    const $childSuiteList = this._findOrMakeChildList($parentLi);
    $childSuiteList.append(this._makeRunnableLineItem(suite.title, suite.id, false));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha suite finishes running
   * @param suite - The finished Mocha suite
   */
  handleSuiteEnd(suite: Mocha.Suite) {
    const isBatchRoot = suite._quench_batchRoot;
    if (isBatchRoot) return;

    const $suiteLi = this.element.find(`li.suite[data-suite-id="${suite.id}"]`);
    this._updateLineItemStatus($suiteLi, getSuiteState(suite));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test begins running
   * @param test - The starting test
   */
  handleTestBegin(test: Mocha.Test) {
    const batchKey = test._quench_parentBatch;
    const parentId = test.parent?.id;

    const $batchLi = this.element.find(`li.test-batch[data-batch="${batchKey}"]`);
    let $parentLi = $batchLi.find(`li.suite[data-suite-id="${parentId}"]`);
    if ($parentLi.length === 0) $parentLi = $batchLi;

    const $childTestList = this._findOrMakeChildList($parentLi);
    $childTestList.append(this._makeRunnableLineItem(test.title, test.id, true));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test finishes running
   *
   * @param test - The finished test
   */
  handleTestEnd(test: Mocha.Test) {
    let $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);

    // If there is not already a list item for this test, create a new one. This is necessary because `handleTestBegin` is not called
    // automatically for "pending" tests
    if ($testLi.length === 0) {
      this.handleTestBegin(test);
      $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
    }

    const state = getTestState(test);
    this._updateLineItemStatus($testLi, state, true);
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test finishes running and fails
   * @param test - The failed test
   * @param error - The error thrown by the test
   */
  handleTestFail(test: Mocha.Test | Mocha.Hook, error: Chai.AssertionError | MissingSnapshotError) {
    // Hooks failures are reported as test failures, but presented as suite failures in the UI
    const isHookFail = test.type === "hook";
    const $testLi = isHookFail
      ? this.element.find(`li.suite[data-suite-id="${test.parent?.id}"]`)
      : this.element.find(`li.test[data-test-id="${test.id}"]`);
    // Allow possibly long paths from `SnapshotError`s to be line wrapped sanely
    const errorElement = $testLi
      .find("> .expandable")
      .append(`<div class="error"></div>`)
      .children(".error");

    if (error instanceof MissingSnapshotError)
      // Allow possibly long paths from `SnapshotError`s to be line wrapped sanely
      errorElement.html(error.message.replaceAll("/", "/<wbr>"));

    errorElement.append(
      `<span class="error-message">${
        error.name === "Error" ? "" : "<strong>" + error.name + ": </strong>"
      }${error.message}\n</span>`,
    );

    // When possible, create a diff and render it into the error element
    if ("showDiff" in error && error.showDiff && "expected" in error && "actual" in error) {
      const diff = QuenchResults._getErrorDiff(error);
      errorElement.append(diff);
    }

    this._updateLineItemStatus($testLi, RUNNABLE_STATES.FAILURE);
    if (("snapshotError" in error && error.snapshotError) || error instanceof MissingSnapshotError)
      this._enableSnapshotUpdates = true;
  }

  /**
   * Called by {@link QuenchReporter} when a before hook for a whole batch fails,
   * so that in lieu of failed tests or suites the whole batch can be marked as failed.
   *
   * @param hook - The failed hook
   * @param error - The error thrown by the hook
   */
  handleBatchFail(hook: Mocha.Hook, error: Error) {
    const batchKey = hook.parent?._quench_parentBatch;
    const isBatchRoot = hook.parent?._quench_batchRoot === true;

    if (!batchKey || !isBatchRoot) return;

    const errorTitle = localize("ERROR.Hook", { hook: hook.title.replace("_root", "") });
    const hookId = hook.id as string;

    const $batchLi = this.element.find(`li.test-batch[data-batch="${batchKey}"]`);
    $batchLi.find("> .expandable").prepend(
      `<span class="summary batch-hook">
        <i class="expander fas fa-caret-right" data-expand-target="${hookId}"></i></button>
        <i class="status-icon fas fa-times-circle"></i> <span class="hook-error"> ${errorTitle}</span>
      </span>
      <div class="expandable" data-expand-id=${hookId}>
        <div class="error"><span class="error-message">${error.message}</span></div>
      </div>`,
    );
  }

  /**
   * Called by {@link QuenchReporter} when mocha begins a test run
   */
  handleRunBegin() {
    // Enable/Hide buttons as necessary
    this.element.find("#quench-select-all").prop("disabled", true);
    this.element.find("#quench-select-none").prop("disabled", true);
    this.element.find("#quench-run").prop("disabled", true);
    this.element.find("#quench-abort").show();
    this.element.find("#quench-update-snapshots").hide();
    this._enableSnapshotUpdates = false;
  }

  /**
   * Called by {@link QuenchReporter} when mocha completes a test run
   * @param stats - Run statistics
   */
  handleRunEnd(stats: Mocha.Stats) {
    // Add summary
    const style = stats.failures ? "stats-fail" : "stats-pass";
    const $stats = $(`
            <div class="stats">
                <div>${localize("StatsSummary", {
                  quantity: stats.tests,
                  duration: stats.duration,
                })}</div>
                <div class="${style}">${localize("StatsResults", {
      ...stats,
    })}</div>
            </div>
        `);
    const $container = this.element.find("#quench-results-stats");
    $container.append($stats);
    $container.show();

    // Enable/Hide buttons as necessary
    this.element.find("#quench-select-all").prop("disabled", false);
    this.element.find("#quench-select-none").prop("disabled", false);
    this.element.find("#quench-run").prop("disabled", false);
    this.element.find("#quench-abort").hide();
    if (this._enableSnapshotUpdates) this.element.find("#quench-update-snapshots").show();
  }
}

interface QuenchResultData {
  anyBatches: boolean;
  batches: { name: string; displayName: string; selected: boolean }[];
}
