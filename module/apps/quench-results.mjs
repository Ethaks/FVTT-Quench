import { quenchUtils } from "../utils/quench-utils.mjs";

const { RUNNABLE_STATE, getTestState, getSuiteState } = quenchUtils._internal;

/**
 * The visual UI for representing Quench suite groups and the tests results thereof.
 */
export default class QuenchResults extends Application {
    constructor(quench, options) {
        super(options);
        this.quench = quench;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "QUENCH.Title",
            id: "quench-results",
            width: 450,
            height: window.innerHeight - 30,
            top: 10,
            left: window.innerWidth - 450 - 300 - 20,
            resizable: true,
            template: "/modules/quench/templates/quench-results.hbs",
        });
    }

    /** @override */
    getData() {
        return {
            anySuiteGroups: this.quench._suiteGroups.size > 0,
            suiteGroups: Array.from(this.quench._suiteGroups.entries()).map(entry => {
                const [key, value] = entry;
                return {
                    name: key,
                    displayName: value.displayName,
                };
            }),
        };
    }

    /** @override */
    activateListeners($html) {
        super.activateListeners($html);

        // Select All Button
        $html.find("#quench-select-all").click(() => {
            this.element.find(`#quench-suite-groups-list .suite-group input[type="checkbox"]`).prop("checked", true);
        });

        // Select None Button
        $html.find("#quench-select-none").click(() => {
            this.element.find(`#quench-suite-groups-list .suite-group input[type="checkbox"]`).prop("checked", false);
        });

        // Run Button
        $html.find("#quench-run").click(async () => {
            const enabledGroups = this._getCheckedGroups().reduce((acc, next) => {
                return next.enabled ? [...acc, next.key] : acc;
            }, []);
            await this.quench.runSelectedSuiteGroups(enabledGroups);
        });

        // Abort Button
        $html.find("#quench-abort").click(() => {
            this.quench.abort();
        });
    }

    /**
     * Clears the currently visible test results while maintaining currently selected suite groups
     */
    async clear() {
        if (this._state !== Application.RENDER_STATES.RENDERED) return;

        const checked = this._getCheckedGroups();

        try {
            await this._render(false);
        } catch (err) {
            err.message = `An error occurred while rendering ${this.constructor.name} ${this.appId}: ${err.message}`;
            console.error(err);
            this._state = Application.RENDER_STATES.ERROR;
        }

        this.element.find("#quench-suite-groups-list li.suite-group").each(function () {
            const groupChecked = checked.find(sg => sg.key === this.dataset.suiteGroup);
            if (groupChecked !== undefined) {
                $(this).find("> label > input[type=checkbox]").prop("checked", groupChecked.enabled);
            }
        });
    }

    /**
     * Determines which suite group elements are checked in the UI
     * @returns {{key: string, enabled: boolean}[]} - An array of objects indicating whether each suite group (defined by the group's key) is enabled or not.
     * @private
     */
    _getCheckedGroups() {
        const $groupEls = this.element.find("#quench-suite-groups-list li");
        return $groupEls
            .map((i, el) => {
                const enabled = $(el).find("input[type=checkbox]").prop("checked");
                return { key: el.dataset.suiteGroup, enabled };
            })
            .get();
    }


    /**
     * Finds or creates an unordered list to contain items for each child runnable (test or suite) of the given parent
     * @param {jQuery} $parentListEl - The <li> of the parent suite group or suite
     * @returns {jquery} - The <ul> into which child runnables can be inserted.
     * @private
     */
    _findOrMakeChildList($parentListEl) {
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
     * @param {string} title - The runnable title to show in the UI.
     * @param {string} id - The mocha id of the runnable.
     * @param {boolean} isTest - Whether this runnable is a test (or a suite, if false)
     * @returns {jQuery} - The <li> element representing this runnable.
     * @private
     */
    _makeRunnableLineItem(title, id, isTest) {
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

        $expander.click(() => {
            $expander.removeClass("fa-caret-down");
            $expander.removeClass("fa-caret-right");
            const expanded = $expandable.is(":visible");
            const newIcon = expanded ? "fa-caret-right" : "fa-caret-down";
            $expander.addClass(newIcon);
            $expandable.slideToggle(50);
        });

        this._updateLineItemStatus($li, RUNNABLE_STATE.IN_PROGRESS);
        return $li;
    }

    /**
     * Updates the given existing <li> representing a runnable based on the given state
     * @param {jQuery} $listEl - The list element representing the runnable
     * @param {RUNNABLE_STATE} state - the state of the runnable
     * @private
     */
    _updateLineItemStatus($listEl, state) {
        const $icon = $listEl.find("> .summary > i.status-icon");
        let icon = "fa-sync";
        let style = "fas";
        switch (state) {
            case RUNNABLE_STATE.PENDING:
                icon = "fa-minus-circle";
                break;
            case RUNNABLE_STATE.SUCCESS:
                icon = "fa-check-circle";
                break;
            case RUNNABLE_STATE.FAILURE:
                icon = "fa-times-circle";
                break;
        }
        $icon.removeClass();
        $icon.addClass(`status-icon ${style} ${icon}`);
    }


    /*--------------------------------*/
    /* Handle incoming test reporting */
    /*--------------------------------*/

    /**
     * Called by {@link QuenchReporter} when a mocha suite begins running
     * @param {Suite} suite
     */
    handleSuiteBegin(suite) {
        const suiteGroupKey = suite._quench_parentGroup;
        const isSuiteGroupRoot = suite._quench_suiteGroupRoot;

        // If this suite is the root of a suite group or does not belong to a suite group, don't show in the UI.
        if (!suiteGroupKey || isSuiteGroupRoot) return;

        // Get the li to add this suite group to
        const parentId = suite.parent.id;
        const $groupLi = this.element.find(`li.suite-group[data-suite-group="${suiteGroupKey}"]`);
        let $parentLi = $groupLi.find(`li.suite[data-suite-id="${parentId}"]`);
        if (!$parentLi.length) $parentLi = $groupLi;

        // Add a li for this suite group
        let $childSuiteList = this._findOrMakeChildList($parentLi);
        $childSuiteList.append(this._makeRunnableLineItem(suite.title, suite.id, false));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha suite finishes running
     * @param {Suite} suite
     */
    handleSuiteEnd(suite) {
        const isSuiteGroupRoot = suite._quench_suiteGroupRoot;
        if (isSuiteGroupRoot) return;

        const $suiteLi = this.element.find(`li.suite[data-suite-id="${suite.id}"]`);
        this._updateLineItemStatus($suiteLi, getSuiteState(suite));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha test begins running
     * @param {Test} test
     */
    handleTestBegin(test) {
        const suiteGroupKey = test._quench_parentGroup;
        const parentId = test.parent.id;

        const $groupLi = this.element.find(`li.suite-group[data-suite-group="${suiteGroupKey}"]`);
        let $parentLi = $groupLi.find(`li.suite[data-suite-id="${parentId}"]`);
        if (!$parentLi.length) $parentLi = $groupLi;

        const $childTestList = this._findOrMakeChildList($parentLi);
        $childTestList.append(this._makeRunnableLineItem(test.title, test.id, true));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha test finishes running
     * @param {Test} test
     */
    handleTestEnd(test) {
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
     * @param {Test} test
     * @param {Error} err
     */
    handleTestFail(test, err) {
        const $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
        $testLi.find("> .expandable").append(`<div class="error-message">${err.message}</div>`);
        this._updateLineItemStatus($testLi, RUNNABLE_STATE.FAILURE);
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
     * @param {object} stats - Run statistics
     */
    handleRunEnd(stats) {
        // Add summary
        const style = stats.failures ? "stats-fail" : "stats-pass";
        const $stats = $(`
            <div class="stats">
                <div>${game.i18n.format("QUENCH.StatsSummary", { quantity: stats.tests, duration: stats.duration })}</div>
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
