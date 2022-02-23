# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.6.0](https://github.com/Ethaks/FVTT-Quench/compare/v0.5.2...v0.6.0) (2022-02-23)


### ⚠ BREAKING CHANGES

* Export types as ES module

### Features

* allow setting initial checked status at batch registration ([11c47b3](https://github.com/Ethaks/FVTT-Quench/commit/11c47b3121ed9522eaab9d8ef601272ac93bfd91))
* display diffs for errors containing actual and expected values ([044f7af](https://github.com/Ethaks/FVTT-Quench/commit/044f7afa492544130ec4b4d500b248cef48b1d8b))
* introduce fast-check for property based testing ([d834d33](https://github.com/Ethaks/FVTT-Quench/commit/d834d33119296126c35967d97942bfc48270e76c))


* add additional linting rules ([0668ae2](https://github.com/Ethaks/FVTT-Quench/commit/0668ae2df77f59c720a9ec58289eaf0b3779d126))

### [0.5.2](https://github.com/Ethaks/FVTT-Quench/compare/v0.5.1...v0.5.2) (2021-11-05)


### Features

* improve snapshot upload performance, allow updating after runs ([223c270](https://github.com/Ethaks/FVTT-Quench/commit/223c270118b20f0411f8e3693bec65b044970cbf))
* provide detailed overview for uploaded files in console ([528194e](https://github.com/Ethaks/FVTT-Quench/commit/528194ea51cb830572bc2ba138c678cec6aaed1b))


### Bug Fixes

* prevent snapshot updates from accumulating with runs ([f617bb5](https://github.com/Ethaks/FVTT-Quench/commit/f617bb557f265077dbd1752e5740cc9cd9962a5b))

### 0.5.1 (2021-10-27)


### ⚠ BREAKING CHANGES

* **snapshots:** Quench now uses fnv1a for hashing, which means new hashes will differ from previous ones, breaking the current association of test to file ([732bb2a](https://github.com/Ethaks/FVTT-Quench/commit/732bb2a9e1d20d4d700bf142947407bc710a95c2))

## [0.5.0] 2021-10-23

### Bug Fixes

- The `clearWorld` utility function did not actually work after getting updated to use Documents

### Features

- Added snapshot support
    - The basic assertion function is `matchSnapshot`, which can be used like this: `expect({foo: "bar"}).to.matchSnapshot()`
    - Snapshots are stored in Foundry's `Data/__snapshots__/<package name>` directory by default
    - In this `snapBaseDir`, each batch gets its own directory, in which each test's snapshot is stored in their own file named by the test's hash
    - The snapshot directory default can be overwritten by setting a `snapBaseDir` option in the batch registration options
- `autoRun` tests are now guaranteed to start *after* the `ready` hook is fired

### API

- The `quenchReady` hook is now deprecated
    - To remain compatible with old batch registration for now, the `quenchReady` hook is still fired in Foundry's `setup` hook
- The `quench` global is now guaranteed to get initialised in the `init` hook and can be used afterwards
- Registering a batch whose name does not belong to a package will now trigger a UI warning

## [0.4.2] 2021-10-06

### Bug Fixes

- Debounce page reloads when the example tests setting is changed.

### Features

- Pre-run `chai.should` and only pass its resulting helper into the context.

## [0.4.1] 2021-10-05

### Bug Fixes

- Replace entity references with document ones to match Foundry's Document usage.

## [0.4.0] 2021-10-05

### ADDED

- Now works with Foundry 0.8.x.
- Bumped mocha to 9.1.2 and chai to 4.3.4.

### INTERNALS

- Merged the two init hooks into one.
- Cleaned out globalThis juggling, which wasn't working.
- Had to slightly tweak mocha itself to keep window.ui from clobbering mocha.ui.

## [0.3.0] 2021-05-27

### ADDED

- Include `chai.expect` and `chai.should` to the testing context, so they can be used as an alternative to `chai.assert`. (thanks @cramt for the addition)

## [0.2.0] 2021-02-05

### ADDED

- Some formatting improvements for the Quench window.
- Add some new convenience settings:
  - collapseSuccessful: collapses suites for which all children passed
  - autoShowQuenchWindow: shows the quench results window immediately on startup
  - autoRun: runs all registered quench test batches immediately on startup

### API

- Add `runAllBatches` method on `Quench`
  - This will run all batches, regardless of what may or may not be selected in the quench UI


## [0.1.0] 2021-02-03

*Initial Release*
