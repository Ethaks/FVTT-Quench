# Quench

Harden your Foundry module or system code with end-to-end UI tests directly within Foundry.
Powered by [Mocha](https://mochajs.org/) and also includes [Chai](https://www.chaijs.com/).

Quench adds a test runner UI as a native Foundry `Application`.
You can register test suites with quench and view them in the test runner, then run them and view the results.

## Usage

The primary public API is the `Quench` class.
A global instance of `Quench` is available as a global called `quench`.
This class includes references to both the mocha and chai globals, as well as some methods to add new test suite groups and run the tests.

Quench uses "test batches" as another layer of organization above the built-in mocha suites and tests.
Test batches are at the top layer of the hierarchy, can contain suites and/or tests, and can be enabled or disabled through the Quench UI.
Enabling or disabling batches allows you to pick and choose only a subset of suites and tests to execute in one test run.

### `quenchReady` Hook

Quench provides a `"quenchReady"` hook, which indicates when Quench is ready for you to start registering batches.
`"quenchReady"` is guaranteed to occur after the core `"init"` hook, but its ordering relative to the core `"setup"` and `"ready"` hooks is not guaranteed.
`"quenchReady"` receives the current `Quench` instance as an argument.

### Register a test batch

You can register a Quench test batch to be executed with Quench by calling `quench.registerBatch`.
`registerBatch` takes the following arguments:

- `key` - a unique group key that identifies this test batch.
  If multiple test batches are registered with the same key, the latest registration will overwrite previous registrations.
- `registrationFunction` - this function will be executed to register the suites and tests within this batch.
  It takes a `context` argument, which contains the following Mocha and Chai functions necessary for defining a suite of tests:
  - Mocha - `describe`, `it`, `after`, `afterEach`, `before`, `beforeEach`, and `utils`.
  - Chai - `assert`.
- `options` -
  - `displayName` - the name for this batch that will be shown in the ui and in the detailed test results.

Example:
```js
Hooks.on("quenchReady", quench => {
    quench.registerBatch("quench.examples.basic-pass", (context) => {
        const { describe, it, assert } = context;

        describe("Passing Suite", function () {
            it("Passing Test", function () {
                assert.ok(true);
            });
        });
    }, { displayName: "QUENCH: Basic Passing Test" });
});
```

## License

Licensed under the GPLv3 License (see [LICENSE](LICENSE)).
