import Quench from "../quench";
import { quenchUtils, RUNNABLE_STATE } from "../utils/quench-utils";

const { RUNNABLE_STATES, getTestState, getSuiteState } = quenchUtils._internal;

/**
 * The visual UI for representing Quench test batches and the tests results thereof.
 */
export default class QuenchResults extends Application {
  /**
   * @param {import("../quench").default} quench
   * @param {Application.Options} [options]
   */
  constructor(quench: Quench, options?: Application.Options) {
    super(options);
    /** @type {import("../quench").default} The `Quench` instance this application is used by */
    this.quench = quench;
  }
  quench: Quench;

  /** @override */
  static get defaultOptions() {
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
    });
  }

  /** @override */
  getData() {
    return {
      anyBatches: this.quench._testBatches.size > 0,
      batches: Array.from(this.quench._testBatches.entries()).map((entry) => {
        const [key, value] = entry;
        return {
          name: key,
          displayName: value.displayName,
        };
      }),
    };
  }

  /** @override */
  activateListeners($html: JQuery<HTMLElement>) {
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
      const enabledBatches = this._getCheckedBatches().reduce((acc: string[], next) => {
        return next.enabled ? [...acc, next.key] : acc;
      }, []);
      await this.quench.runSelectedBatches(enabledBatches);
    });

    // Abort Button
    $html.find("#quench-abort").on("click", () => {
      this.quench.abort();
    });
  }

  /**
   * Clears the currently visible test results while maintaining currently selected test batches
   */
  async clear() {
    if (this._state !== Application.RENDER_STATES.RENDERED) return;

    const checked = this._getCheckedBatches();

    try {
      await this._render(false);
    } catch (err) {
      if (err instanceof Error)
        err.message = `An error occurred while rendering ${this.constructor.name} ${this.appId}: ${err.message}`;
      console.error(err);
      this._state = Application.RENDER_STATES.ERROR;
    }

    this.element.find("#quench-batches-list li.test-batch").each(function () {
      const batchChecked = checked.find((batch) => batch.key === this.dataset.batch);
      if (batchChecked !== undefined) {
        $(this).find("> label > input[type=checkbox]").prop("checked", batchChecked.enabled);
      }
    });
  }

  /**
   * Determines which test batch elements are checked in the UI
   * @returns An array of objects indicating whether each test batch (defined by the batch's key) is enabled or not.
   */
  private _getCheckedBatches(): { key: string; enabled: boolean }[] {
    const $batchEls = this.element.find("#quench-batches-list li");
    return $batchEls
      .map((_, el) => {
        const enabled = !!$(el).find("input[type=checkbox]").prop("checked");
        return { key: el.dataset.batch ?? "", enabled };
      })
      .get();
  }

  /**
   * Finds or creates an unordered list to contain items for each child runnable (test or suite) of the given parent
   * @param $parentListEl - The <li> of the parent test batch or suite
   * @returns The <ul> into which child runnables can be inserted.
   */
  private _findOrMakeChildList($parentListEl: JQuery<HTMLElement>): JQuery<HTMLElement> {
    const $expandable = $parentListEl.find(`> div.expandable`);
    let $childList = $expandable.find(`> ul.runnable-list`);
    if (!$childList.length) {
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
  private _makeRunnableLineItem(title: string, id: string, isTest: boolean): JQuery<HTMLElement> {
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
                <div class="expandable" data-expand-id="${id}"></div>
            </li>
        `);

    const $expander = $li.find("> .summary > .expander");
    const $expandable = $li.find("> .expandable");
    if (isTest) $expandable.hide();

    $expander.on("click", () => {
      $expander.removeClass("fa-caret-down");
      $expander.removeClass("fa-caret-right");
      const expanded = $expandable.is(":visible");
      const newIcon = expanded ? "fa-caret-right" : "fa-caret-down";
      $expander.addClass(newIcon);
      $expandable.slideToggle(50);
    });

    this._updateLineItemStatus($li, RUNNABLE_STATES.IN_PROGRESS, isTest);
    return $li;
  }

  /**
   * Updates the given existing <li> representing a runnable based on the given state
   * @param $listEl - The list element representing the runnable
   * @param state - the state of the runnable
   * @param [isTest] - whether the item is a test
   * @private
   */
  _updateLineItemStatus($listEl: JQuery<HTMLElement>, state: RUNNABLE_STATE, isTest?: boolean) {
    const $icon = $listEl.find("> .summary > i.status-icon");
    let icon = "fa-sync";
    const style = "fas";
    switch (state) {
      case RUNNABLE_STATES.PENDING:
        icon = "fa-minus-circle";
        break;
      case RUNNABLE_STATES.SUCCESS:
        icon = "fa-check-circle";
        break;
      case RUNNABLE_STATES.FAILURE:
        icon = "fa-times-circle";
        break;
    }
    $icon.removeClass();
    $icon.addClass(`status-icon ${style} ${icon}`);

    if (
      game.settings.get("quench", "collapseSuccessful") &&
      state === RUNNABLE_STATES.SUCCESS &&
      !isTest
    ) {
      $listEl
        .find("> .summary > .expander")
        .removeClass("fa-caret-down")
        .addClass("fa-caret-right");
      $listEl.find("> .expandable").hide();
    }
  }

  /*--------------------------------*/
  /* Handle incoming test reporting */
  /*--------------------------------*/

  /**
   * Called by {@link QuenchReporter} when a mocha suite begins running
   * @param suite
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
    if (!$parentLi.length) $parentLi = $batchLi;

    // Add a li for this test batch
    const $childSuiteList = this._findOrMakeChildList($parentLi);
    $childSuiteList.append(this._makeRunnableLineItem(suite.title, suite.id, false));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha suite finishes running
   * @param suite
   */
  handleSuiteEnd(suite: Mocha.Suite) {
    const isBatchRoot = suite._quench_batchRoot;
    if (isBatchRoot) return;

    const $suiteLi = this.element.find(`li.suite[data-suite-id="${suite.id}"]`);
    this._updateLineItemStatus($suiteLi, getSuiteState(suite));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test begins running
   * @param test
   */
  handleTestBegin(test: Mocha.Test) {
    const batchKey = test._quench_parentBatch;
    const parentId = test.parent?.id;

    const $batchLi = this.element.find(`li.test-batch[data-batch="${batchKey}"]`);
    let $parentLi = $batchLi.find(`li.suite[data-suite-id="${parentId}"]`);
    if (!$parentLi.length) $parentLi = $batchLi;

    const $childTestList = this._findOrMakeChildList($parentLi);
    $childTestList.append(this._makeRunnableLineItem(test.title, test.id, true));
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test finishes running
   * @param test
   */
  handleTestEnd(test: Mocha.Test) {
    let $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);

    // If there is not already a list item for this test, create a new one. This is necessary because `handleTestBegin` is not called
    // automatically for "pending" tests
    if (!$testLi.length) {
      this.handleTestBegin(test);
      $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
    }

    const state = getTestState(test);
    this._updateLineItemStatus($testLi, state);
  }

  /**
   * Called by {@link QuenchReporter} when a mocha test finishes running and fails
   * @param test
   * @param err
   */
  handleTestFail(test: Mocha.Test, err: Error) {
    const $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
    $testLi.find("> .expandable").append(`<div class="error-message">${err.message}</div>`);
    this._updateLineItemStatus($testLi, RUNNABLE_STATES.FAILURE);
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
                <div>${game.i18n.format("QUENCH.StatsSummary", {
                  quantity: stats.tests,
                  duration: stats.duration,
                })}</div>
                <div class="${style}">${game.i18n.format("QUENCH.StatsResults", stats)}</div>
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
  }
}
