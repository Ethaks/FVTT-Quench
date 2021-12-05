import { Quench } from "../quench";
import { quenchUtils } from "../utils/quench-utils";

const { getGame } = quenchUtils._internal;

/**
 * Registers all example tests, which also serves as a quick self-test.
 *
 * @param quench - the quench instance the tests are registered with
 */
export function registerExampleTests(quench: Quench) {
  [
    registerBasicPassingTestBatch,
    registerBasicFailingTestBatch,
    registerNestedTestBatch,
    registerOtherTestBatch,
    registerSnapshotTestBatch,
  ].forEach((f) => f(quench));
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
          assert.fail();
        });
        it("Another Failing Test", function () {
          expect({ foo: "bar" }).to.equal({ foo: { bar: "baz" } });
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
          // @ts-expect-error Element is protected, but this is a quick test using some available element
          expect(getGame().actors?.apps[0]._element).to.matchSnapshot();
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
    },
  );
}
