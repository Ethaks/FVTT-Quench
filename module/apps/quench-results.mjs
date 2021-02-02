export default class QuenchResults extends Application {
    constructor(quench, options) {
        super(options);
        this.quench = quench;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "quench-results",
            width: 600,
            height: 600,
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
            const enabledGroups = self._getCheckedGroups();
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

        const blah = this.element.find("#quench-suite-groups-list li").filter((i, el) => {
            return checked.includes(el.dataset.suiteGroup);
        });
        blah.each((i, el) => $(el).find("input[type=checkbox]").prop("checked", true));
    }

    _getCheckedGroups() {
        const $groupEls = this.element.find("#quench-suite-groups-list li");
        return $groupEls
            .map((i, el) => {
                const enabled = $(el).find("input[type=checkbox]").prop("checked");
                return enabled ? el.dataset.suiteGroup : null;
            })
            .get()
            .filter(sg => !!sg);
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

    _findOrMakeChildList($parentListEl, isTest) {
        const style = isTest ? "test-list" : "suite-list";
        let $childList = $parentListEl.find(`ul.${style}`);
        if (!$childList.length) {
            $childList = $(`<ul class="${style}">`);
            $parentListEl.append($childList);
        }

        return $childList
    }

    _makePendingLineItem(title, id, isTest) {
        const type = isTest ? "test" : "suite";
        const $li = $(`<li class="${type}" data-${type}-id="${id}"><i class="status-icon"></i>${title}</li>`);
        this._updateLineItemStatus($li, QuenchResults.STATE.PENDING);
        return $li;
    }

    _updateLineItemStatus($listEl, state) {
        const $icon = $listEl.find("i.status-icon");
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
        $icon.addClass(`status-icon far ${icon}`);
    }

    /*--------------------------------*/
    /* Handle incoming test reporting */
    /*--------------------------------*/

    handleSuiteBegin(suite) {
        console.log("Suite begin", arguments);
        const suiteGroupKey = suite._quench_parentGroup;
        if (!suiteGroupKey) return;

        const $groupLi = this.element.find(`li.suite-group[data-suite-group=${suiteGroupKey}`);
        let $childSuiteList = this._findOrMakeChildList($groupLi, false);
        $childSuiteList.append(this._makePendingLineItem(suite.title, suite.id, false));
    }

    handleSuiteEnd(suite) {
        console.log("Suite end", arguments);
        const $suiteLi = this.element.find(`li.suite[data-suite-id=${suite.id}]`);
        this._updateLineItemStatus($suiteLi, QuenchResults._getSuiteState(suite));
    }

    handleTestBegin(test) {
        console.log("Test begin", arguments);
        const parentId = test.parent.id;
        const $parentLi = this.element.find(`li.suite[data-suite-id=${parentId}]`);
        const $childTestList = this._findOrMakeChildList($parentLi, true);
        $childTestList.append(this._makePendingLineItem(test.title, test.id, true));
    }

    handleTestPass(test) {
        console.log("Test end (pass)", arguments);
        const $testLi = this.element.find(`li.test[data-test-id=${test.id}]`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    handleTestFail(test, err) {
        console.log("Test end (fail)", arguments);
        const $testLi = this.element.find(`li.test[data-test-id=${test.id}]`);
        this._updateLineItemStatus($testLi, QuenchResults._getTestState(test));
    }

    handleRunBegin() {
        console.log("Run start", arguments);
        this.element.find("#quench-run").prop("disabled", true);
    }

    handleRunEnd() {
        console.log("Run end", arguments);
        this.element.find("#quench-run").prop("disabled", false);
    }
}
