/**
 * The visual UI for representing Quench suite groups and the tests results thereof.
 */
export default class QuenchResults extends Application {
    constructor(quench, options) {
        super(options);
        this.quench = quench;

        this._logPrefix = "QUENCH | ";
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
            anySuiteGroups: this.quench.suiteGroups.size > 0,
            suiteGroups: Array.from(this.quench.suiteGroups.entries()).map(entry => {
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
     * Represents the state of a test or suite
     * @enum {string}
     */
    static STATE = {
        PENDING: "pending",
        SUCCESS: "success",
        FAILURE: "failure",
    }

    /**
     * Gets the STATE of a Test instance
     * @param {Test} test - the mocha Test instance to determine the state of
     * @returns {QuenchResults.STATE} - the state of the test
     * @private
     */
    static _getTestState(test) {
        if (test.state === undefined || test.pending) {
            return QuenchResults.STATE.PENDING;
        } else if (test.state === "passed") {
            return QuenchResults.STATE.SUCCESS;
        } else {
            return QuenchResults.STATE.FAILURE
        }
    }

    /**
     * Gets the STATE of a Suite instance, based on the STATE of its contained suites and tests
     * @param {Suite} suite - the mocha Suite instance to determine the state of
     * @returns {QuenchResults.STATE} - the state of the suite
     * @private
     */
    static _getSuiteState(suite) {
        if (suite.pending) return QuenchResults.STATE.PENDING;

        // Check child tests
        const testStates = suite.tests.map(QuenchResults._getTestState);
        const allTestSucceed = testStates.every(t => t === QuenchResults.STATE.SUCCESS);
        if (!allTestSucceed) return QuenchResults.STATE.FAILURE;

        // Check child suites
        const suiteStates = suite.suites.map(QuenchResults._getSuiteState);
        const allSuitesSucceed = suiteStates.every(t => t === QuenchResults.STATE.SUCCESS);
        return allSuitesSucceed ? QuenchResults.STATE.SUCCESS : QuenchResults.STATE.FAILURE;
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
    _makePendingLineItem(title, id, isTest) {
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

        this._updateLineItemStatus($li, QuenchResults.STATE.PENDING);
        return $li;
    }

    /**
     * Updates the given existing <li> representing a runnable based on the given state
     * @param {jQuery} $listEl - The list element representing the runnable
     * @param {QuenchResults.STATE} state - the state of the runnable
     * @private
     */
    _updateLineItemStatus($listEl, state) {
        const $icon = $listEl.find("> .summary > i.status-icon");
        let icon = "fa-sync";
        let style = "fas";
        switch (state) {
            case QuenchResults.STATE.SUCCESS:
                icon = "fa-check-circle";
                style = "far";
                break;
            case QuenchResults.STATE.FAILURE:
                icon = "fa-times-circle";
                style = "far";
                break;
        }
        $icon.removeClass();
        $icon.addClass(`status-icon ${style} ${icon}`);
    }

    /**
     * Determines whether the setting to show detailed log results is enabled
     * @returns {boolean}
     * @private
     */
    static _shouldLogTestDetails() {
        return game.settings.get("quench", "logTestDetails");
    }

    /*--------------------------------*/
    /* Handle incoming test reporting */
    /*--------------------------------*/

    /**
     * Called by {@link QuenchReporter} when a mocha suite begins running
     * @param {Suite} suite
     */
    handleSuiteBegin(suite) {
        if (QuenchResults._shouldLogTestDetails() && !suite.root) {
            if (suite.parent.root) {
                console.group(this.quench.suiteGroups.get(suite._quench_parentGroup).displayName);
            }
            console.group(`Suite: ${suite.title}`, { suite });
        }
        const suiteGroupKey = suite._quench_parentGroup;
        if (!suiteGroupKey) return;

        const parentId = suite.parent.id;

        const $groupLi = this.element.find(`li.suite-group[data-suite-group="${suiteGroupKey}"]`);
        let $parentLi = $groupLi.find(`li.suite[data-suite-id="${parentId}"]`);

        if (!$parentLi.length) $parentLi = $groupLi;

        let $childSuiteList = this._findOrMakeChildList($parentLi);
        $childSuiteList.append(this._makePendingLineItem(suite.title, suite.id, false));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha suite finishes running
     * @param {Suite} suite
     */
    handleSuiteEnd(suite) {
        if (QuenchResults._shouldLogTestDetails() && !suite.root) {
            console.groupEnd();
            if (suite.parent.root) console.groupEnd();
        }

        const $suiteLi = this.element.find(`li.suite[data-suite-id="${suite.id}"]`);
        this._updateLineItemStatus($suiteLi, QuenchResults._getSuiteState(suite));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha test begins running
     * @param {Test} test
     */
    handleTestBegin(test) {
        const parentId = test.parent.id;
        const $parentLi = this.element.find(`li.suite[data-suite-id="${parentId}"]`);
        const $childTestList = this._findOrMakeChildList($parentLi);
        $childTestList.append(this._makePendingLineItem(test.title, test.id, true));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha test finishes running and passes
     * @param {Test} test
     */
    handleTestPass(test) {
        if (QuenchResults._shouldLogTestDetails()) {
            console.log(`%c(PASS) Test Complete: ${test.title}`, "color: #33AA33", { test });
        }

        const $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    /**
     * Called by {@link QuenchReporter} when a mocha test finishes running and fails
     * @param {Test} test
     */
    handleTestFail(test, err) {
        if (QuenchResults._shouldLogTestDetails()) {
            console.groupCollapsed(`%c(FAIL) Test Complete: ${test.title}`, "color: #FF4444", { test, err });
            console.error(err.stack);
            console.groupEnd();
        }

        const $testLi = this.element.find(`li.test[data-test-id="${test.id}"]`);
        $testLi.find("> .expandable").append(`<div class="error-message">${err.message}</div>`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    /**
     * Called by {@link QuenchReporter} when mocha begins a test run
     */
    handleRunBegin() {
        if (QuenchResults._shouldLogTestDetails()) {
            console.group(`${this._logPrefix}DETAILED TEST RESULTS`);
        }

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
        if (QuenchResults._shouldLogTestDetails()) {
            console.groupEnd();
            console.log(`${this._logPrefix}TEST RUN COMPLETE`, { stats });
        }

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
