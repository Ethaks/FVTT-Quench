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
        blah.each((i, el) => $(el).find("input[type=checkbox]").prop("checked", "checked"));
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

    static SUITE_STATE = {
        PENDING: "pending",
        SUCCESS: "success",
        FAILURE: "failure",
    }

    _getSuiteState(suite) {
        if (suite.pending) return QuenchResults.SUITE_STATE.PENDING;
        const testStates = suite.tests.map(t => t.state === "passed" ? QuenchResults.SUITE_STATE.SUCCESS : QuenchResults.SUITE_STATE.FAILURE);
        const suiteStates = suite.suites.map(s => this._getSuiteState(s));
        const allTestSucceed = testStates.every(t => t === QuenchResults.SUITE_STATE.SUCCESS);
        const allSuitesSucceed = suiteStates.every(t => t === QuenchResults.SUITE_STATE.SUCCESS);
        return !allTestSucceed
            ? QuenchResults.SUITE_STATE.FAILURE
            : !allSuitesSucceed
                ? QuenchResults.SUITE_STATE.FAILURE
                : QuenchResults.SUITE_STATE.SUCCESS
    }

    /*--------------------------------*/
    /* Handle incoming test reporting */
    /*--------------------------------*/

    handleSuiteBegin(suite) {
        console.log("Suite begin", arguments);
        const suiteGroupKey = suite._quench_parentGroup;
        if (!suiteGroupKey) return;

        const $groupLi = this.element.find(`li.suite-group[data-suite-group=${suiteGroupKey}`);
        let $childSuiteList = $groupLi.find("ul.suite-list");
        if (!$childSuiteList.length) {
            $childSuiteList = $(`<ul class="suite-list">`);
            $groupLi.append($childSuiteList);
        }

        const $suiteLi = $(`<li class="suite" data-suite-id="${suite.id}"><i class="status-icon fas fa-spinner"></i> ${suite.title}</li>`);
        $childSuiteList.append($suiteLi);
    }

    handleSuiteEnd(suite) {
        console.log("Suite end", arguments);
        const suiteGroupKey = suite._quench_parentGroup;
        const $suiteLi = this.element.find(`li.suite-group[data-suite-group=${suiteGroupKey}] li.suite[data-suite-id=${suite.id}]`);
        const $icon = $suiteLi.find("i.status-icon");
        $icon.removeClass();
        $icon.addClass("status-icon fas");
        const success = this._getSuiteState(suite) === QuenchResults.SUITE_STATE.SUCCESS
        $icon.addClass(success ? "fa-check" : "fa-times");
    }

    handleTestBegin(test) {
        console.log("Test begin", arguments);
    }

    handleTestPass(test) {
        console.log("Test end (pass)", arguments);
    }

    handleTestFail(test, err) {
        console.log("Test end (fail)", arguments);
    }

    finalStats(stats) {
        console.log("Stats", stats);
    }
}
