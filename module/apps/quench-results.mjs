export default class QuenchResults extends Application {
    constructor(quench, options) {
        super(options);
        this.quench = quench;

        this._indent = 0;
        this._indentChar = " ";
        this._logPrefix = "QUENCH | ";
        this._blankPrefix = " ".repeat(this._logPrefix.length);
    }

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

    getData() {
        return {
            suiteGroups: Array.from(this.quench.suiteGroups.entries()).map(entry => {
                const [key, value] = entry;
                return {
                    name: key,
                    displayName: value.displayName,
                };
            }),
        };
    }

    activateListeners($html) {
        super.activateListeners($html);

        const self = this;
        $html.find("#quench-run").click(async function (event) {
            const enabledGroups = self._getCheckedGroups().reduce((acc, next) => {
                return next.enabled ? [...acc, next.key] : acc;
            }, []);
            await self.quench.runSelectedSuiteGroups(enabledGroups);
        });
    }

    async clear() {
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

    _getCheckedGroups() {
        const $groupEls = this.element.find("#quench-suite-groups-list li");
        return $groupEls
            .map((i, el) => {
                const enabled = $(el).find("input[type=checkbox]").prop("checked");
                return { key: el.dataset.suiteGroup, enabled };
            })
            .get();
    }

    static STATE = {
        PENDING: "pending",
        SUCCESS: "success",
        FAILURE: "failure",
    }

    static _getTestState(test) {
        if (test.state === undefined || test.pending) {
            return QuenchResults.STATE.PENDING;
        } else if (test.state === "passed") {
            return QuenchResults.STATE.SUCCESS;
        } else {
            return QuenchResults.STATE.FAILURE
        }
    }

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

    _findOrMakeChildList($parentListEl) {
        const $expandable = $parentListEl.find(`> div.expandable`);
        let $childList = $expandable.find(`> ul.runnable-list`);
        if (!$childList.length) {
            $childList = $(`<ul class="runnable-list">`);
            $expandable.append($childList);
        }

        return $childList;
    }

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

    static _shouldLogTestDetails() {
        return game.settings.get("quench", "logTestDetails");
    }

    _indentString() {
        return this._indentChar.repeat(this._indent);
    }

    _logTestDetails(label, ...args) {
        const indent = this._indentString();
        console.log(`${this._logPrefix}${indent}${label}`);
        for (let arg of args) {
            if (typeof arg === "string" || arg instanceof String) {
                arg = arg.replace(/\n/g, `\n${this._blankPrefix}${indent}`);
            }
            console.log(`${this._logPrefix}${this._indentChar}${indent}`, arg);
        }
    }

    /*--------------------------------*/
    /* Handle incoming test reporting */
    /*--------------------------------*/

    handleSuiteBegin(suite) {
        if (QuenchResults._shouldLogTestDetails()) {
            this._indent++;
            this._logTestDetails(`Begin testing suite: ${suite.title}`, suite);
        }
        const suiteGroupKey = suite._quench_parentGroup;
        if (!suiteGroupKey) return;

        const parentId = suite.parent.id;

        const $groupLi = this.element.find(`li.suite-group[data-suite-group=${suiteGroupKey}`);
        let $parentLi = $groupLi.find(`li.suite[data-suite-id=${parentId}]`);

        if (!$parentLi.length) $parentLi = $groupLi;

        let $childSuiteList = this._findOrMakeChildList($parentLi);
        $childSuiteList.append(this._makePendingLineItem(suite.title, suite.id, false));
    }

    handleSuiteEnd(suite) {
        if (QuenchResults._shouldLogTestDetails()) this._indent--;

        const $suiteLi = this.element.find(`li.suite[data-suite-id=${suite.id}]`);
        this._updateLineItemStatus($suiteLi, QuenchResults._getSuiteState(suite));
    }

    handleTestBegin(test) {
        if (QuenchResults._shouldLogTestDetails()) this._indent++;

        const parentId = test.parent.id;
        const $parentLi = this.element.find(`li.suite[data-suite-id=${parentId}]`);
        const $childTestList = this._findOrMakeChildList($parentLi);
        $childTestList.append(this._makePendingLineItem(test.title, test.id, true));
    }

    handleTestPass(test) {
        if (QuenchResults._shouldLogTestDetails()) {
            this._logTestDetails(`Test Complete: ${test.title} (PASS)`, test);
            this._indent--;
        }

        const $testLi = this.element.find(`li.test[data-test-id=${test.id}]`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    handleTestFail(test, err) {
        if (QuenchResults._shouldLogTestDetails()) {
            this._logTestDetails(`Test Complete: ${test.title} (FAIL)`, test, err, err.stack);
            this._indent--;
        }

        const $testLi = this.element.find(`li.test[data-test-id=${test.id}]`);
        $testLi.find("> .expandable").append(`<div class="error-message">${err.message}</div>`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    handleRunBegin() {
        if (QuenchResults._shouldLogTestDetails()) {
            this._logTestDetails("Beginning test run");
        }

        this.element.find("#quench-run").prop("disabled", true);
    }

    handleRunEnd(stats) {
        if (QuenchResults._shouldLogTestDetails()) {
            this._logTestDetails("All tests complete", stats)
        }

        this.element.find("#quench-run").prop("disabled", false);

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
    }
}
