import type { Quench } from "../quench";

/**
 * Registers all example tests, which also serves as a quick self-test.
 *
 * @param quench - the quench instance the tests are registered with
 */
export function registerExampleTests(quench: Quench) {
  for (const batchFunction of [
    registerBasicPassingTestBatch,
    registerBasicFailingTestBatch,
    registerNestedTestBatch,
    registerOtherTestBatch,
    registerSnapshotTestBatch,
    registerPropertyTestBatch,
    registerNonQuenchTestBatch,
  ]) {
    batchFunction(quench);
  }
}

function registerBasicPassingTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.basic-pass",
    (context) => {
      const { describe, it, assert, expect, should } = context;
      describe("Passing Suite", function () {
        it("Passing Test", function () {
          assert.ok(true);
        });
        it("Passing Test using expect", function () {
          expect(2).to.equal(2);
        });
        it("Passing Test using should", function () {
          const foo = { bar: "baz" };
          foo.should.have.property("bar", "baz");
        });
        it("Passing Test using should helper", function () {
          should.not.equal(1, 2);
        });
        it("Passing Test with a snapshot", function () {
          expect({ foo: "baz" }).to.matchSnapshot();
        });
        it("Passing Test with snapshot and assert", function () {
          assert.matchSnapshot({ bar: "baz" });
        });
      });
    },
    {
      displayName: "QUENCH: Basic Passing Test",
      snapBaseDir: "__snapshots__/quench/some/other/weird/path",
    },
  );
}

function registerBasicFailingTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.basic-fail",
    (context) => {
      const { describe, it, assert, expect } = context;

      describe("Failing Suite", function () {
        it("Failing Test", function () {
          expect(1).to.equal(2);
        });
        it("Another Failing Test", function () {
          expect({ foo: "bar", baz: "bam", kel: { tok: "zam" } }).to.equal({ foo: { bar: "baz" } });
        });
        it("A Failing Test Using Assert", function () {
          assert.ok(false);
        });
        it("A Failing Test Comparing an Object to undefined", function () {
          expect({ foo: "bar" }).to.equal(undefined);
        });
        it("A Failing Test Comparing an Object to a String", function () {
          expect({ foo: "bar" }).to.equal("bar");
        });
        it("A Failing Test Comparing undefined to a String", function () {
          // eslint-disable-next-line unicorn/no-useless-undefined -- intentional test
          expect(undefined).to.equal("bar");
        });
      });
    },
    { displayName: "QUENCH: Basic Failing Test" },
  );
}

function registerNestedTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.nested",
    (context) => {
      const { describe, it, assert, expect } = context;

      describe("level 0", function () {
        describe("level 1 A", function () {
          it("passes A", function () {
            assert.ok(true);
          });

          it("fails A", async function () {
            assert.equal(1, 2, "not equal");
          });
        });

        describe("level 1 B", function () {
          it("times out", async function (this: Mocha.Context) {
            this.timeout(200);
            await quench.utils.pause(300);
            assert.ok(true);
          });

          describe("level 2 B", function () {
            it("a thing", function () {
              assert.ok(true);
            });

            it("uses a snapshot in a nested test", function () {
              expect({ foo: "bar" }).to.matchSnapshot();
            });
          });

          it("fails B", function () {
            assert.fail();
          });
        });
      });
    },
    { displayName: "QUENCH: Nested Suites" },
  );
}

function registerOtherTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.other",
    (context) => {
      const { describe, it, assert } = context;

      it("suite-less test", function () {
        assert.ok(true);
      });
      it("pending test");

      describe("suite alpha", function () {
        it("test alpha", function () {
          assert.ok(true);
        });
      });
      describe("suite beta", function () {
        it("test beta", function () {
          assert.ok(true);
        });
        it("a nested pending test");
      });
    },
    { displayName: "QUENCH: Other" },
  );
}

function registerSnapshotTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.snapshots",
    (context) => {
      const { describe, it, assert, expect } = context;
      describe("Snapshot Testing", function () {
        it("Passing Test using DOM element and expect", function () {
          expect(document.querySelector("section #actors")).to.matchSnapshot();
        });
        it("Passing Test using simple object and assert", function () {
          assert.matchSnapshot({ foo: "bar" });
        });
        it("Passing Test using should from prototype and string", function () {
          "Some Test ¯\\_(ツ)_/¯".should.matchSnapshot();
        });
        it("Passing Test using temporary actor", function () {
          // @ts-expect-error documentTypes will exist come v9
          const types = game.system.entityTypes ?? game.system.documentTypes;
          const actorType = types["Actor"][0];
          const actor = new Actor({ name: "Test Actor", type: actorType });
          expect(actor).to.matchSnapshot();
        });
      });
      it("Suite-less Snapshot Test", function () {
        expect(1).to.matchSnapshot();
      });
    },
    {
      displayName: "QUENCH: Snapshots Test",
      snapBaseDir: "__snapshots__/quench/some/other/weird/path",
      preSelected: false,
    },
  );
}

function registerPropertyTestBatch(quench: Quench) {
  quench.registerBatch(
    "quench.examples.property",
    (context) => {
      const { describe, it, fc, expect, assert } = context;

      // Code under test
      // eslint-disable-next-line unicorn/consistent-function-scoping -- keep test contents together
      const contains = (text: string, pattern: string) => text.includes(pattern);

      describe("Basic Property Based Test", function () {
        it("should always contain itself", function () {
          fc.assert(
            fc.property(fc.string(), (text) => {
              assert.ok(contains(text, text));
            }),
          );
        });

        it("should always contain its substrings", function () {
          fc.assert(
            fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
              // Regular assertions can be used (beware of longer error messages though)
              expect(a + b + c).to.contain(b);
              // Or return statements (failing on falsy values)
              return contains(a + b + c, b);
            }),
          );
        });
      });

      it("Failing Property Based Test", function () {
        fc.assert(
          // Returning false instead of throwing can improve error readability
          fc.property(fc.string(), (text) => text.length < 5),
          { verbose: 1 },
        );
      });
    },
    { displayName: "QUENCH: Property Test" },
  );
}

// ============================ //
// Additional Quench self tests //
// ============================ //

let registerNonQuenchTestBatch = (_quench: Quench): void => undefined;
if (import.meta.env.DEV) {
  registerNonQuenchTestBatch = (quench: Quench) => {
    quench.registerBatch(
      "not-quench.examples.basic", // should trigger an error notification due to non-package name
      (context) => {
        const { describe, it, assert } = context;

        describe("Non-Quench Test", function () {
          it("should pass", function () {
            assert.ok(true);
          });
          it("should fail", function () {
            assert.fail();
          });
        });
      },
      { displayName: "QUENCH: Non-Quench Test" },
    );

    quench.registerBatch(
      "quench.examples.batch-hook-error",
      (context) => {
        const { describe, before, it } = context;
        before(() => {
          throw new Error("This is an error thrown in a batch's before hook");
        });
        describe("This test should not run", function () {
          it("should not run", function () {
            unreachable();
          });
        });
      },
      { displayName: "QUENCH: Batch Hook Error" },
    );

    quench.registerBatch(
      "quench.examples.test-hook-error",
      (context) => {
        const { describe, it } = context;
        describe("Suite failing due to hook", function () {
          before(() => {
            throw new Error("This is an error thrown in a suites's before hook");
          });
          it("should not run", function () {
            unreachable();
          });
        });
      },
      { displayName: "QUENCH: Suite Hook Error" },
    );
  };
}

function unreachable() {
  throw new Error("This should not be reachable!");
}
