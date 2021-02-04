export function registerBasicPassingSuiteGroup(quench) {
    quench.registerSuiteGroup("quench.examples.basic-pass", (context) => {
        const { describe, it, assert } = context;

        describe("Passing Suite", function() {
            it("Passing Test", function() {
                assert.ok(true);
            });
        });
    }, { displayName: "QUENCH: Basic Passing Test" });
}

export function registerBasicFailingSuiteGroup(quench) {
    quench.registerSuiteGroup("quench.examples.basic-fail", (context) => {
        const { describe, it, assert } = context;

        describe("Failing Suite", function() {
            it("Failing Test", function() {
                assert.fail();
            });
        });
    }, { displayName: "QUENCH: Basic Failing Test" });
}

export function registerNestedSuiteGroup(quench) {
    quench.registerSuiteGroup("quench.examples.nested", (context) => {
        const { describe, it, assert } = context;

        describe("level 0", function() {
            describe("level 1 A", function() {
                it("passes A", function () {
                    assert.ok(true);
                });

                it("fails A", async function () {
                    assert.equal(1, 2, "not equal");
                });
            });

            describe("level 1 B", function() {
                it("times out", async function () {
                    this.timeout(200);
                    await quench.utils.pause(300);
                    assert.ok(true);
                });

                describe("level 2 B", function() {
                    it("a thing", function () {
                        assert.ok(true);
                    });
                });

                it("fails B", function () {
                    assert.fail();
                });
            });
        });
    }, { displayName: "QUENCH: Nested Suites" });
}

export function registerOtherSuiteGroup(quench) {
    quench.registerSuiteGroup("quench.examples.other", (context) => {
        const { describe, it, assert } = context;

        it("suite-less test", function() {});
        it("pending test");

        describe("suite alpha", function() {
            it("test alpha", function () {});
        });
        describe("suite beta", function() {
            it("test beta", function () {});
            it("a nested pending test");
        });
    }, { displayName: "QUENCH: Other" });
}
