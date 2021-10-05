export function registerBasicPassingTestBatch(quench) {
  quench.registerBatch(
    "quench.examples.basic-pass",
    (context) => {
      const { describe, it, assert, expect } = context;
      describe("Passing Suite", function () {
        it("Passing Test", function () {
          assert.ok(true);
        });
        it("Passing Test using expect", () => {
          expect(2).to.equal(2);
        });
        it("Passing Test using should", () => {
          const foo = { bar: "baz" };
          foo.should.have.property("bar", "baz");
        });
      });
    },
    { displayName: "QUENCH: Basic Passing Test" },
  );
}

export function registerBasicFailingTestBatch(quench) {
  quench.registerBatch(
    "quench.examples.basic-fail",
    (context) => {
      const { describe, it, assert } = context;

      describe("Failing Suite", function () {
        it("Failing Test", function () {
          assert.fail();
        });
        it("Failing Test using should", () => {
          const should = context.should();
          should.not.equal(1, 1);
        });
      });
    },
    { displayName: "QUENCH: Basic Failing Test" },
  );
}

export function registerNestedTestBatch(quench) {
  quench.registerBatch(
    "quench.examples.nested",
    (context) => {
      const { describe, it, assert } = context;

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
          it("times out", async function () {
            this.timeout(200);
            await quench.utils.pause(300);
            assert.ok(true);
          });

          describe("level 2 B", function () {
            it("a thing", function () {
              assert.ok(true);
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

export function registerOtherTestBatch(quench) {
  quench.registerBatch(
    "quench.examples.other",
    (context) => {
      const { describe, it, assert } = context;

      it("suite-less test", function () {});
      it("pending test");

      describe("suite alpha", function () {
        it("test alpha", function () {});
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
