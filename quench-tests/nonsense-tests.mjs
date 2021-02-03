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
                it("long running", async function () {
                    await quench.utils.pause(1500);
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
