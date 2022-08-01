# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.8.0](https://github.com/Ethaks/FVTT-Quench/compare/v0.7.0...v0.8.0) (2022-08-01)


### ⚠ BREAKING CHANGES

* **deps:** bump fast-check from 2.25.0 to 3.1.1 (#156)
* replace preselect packages with preselect filters
* refactor `runSelectedBatches`, `_testBatches`, and utils

### Features

* add JSON report generation ([6c41d48](https://github.com/Ethaks/FVTT-Quench/commit/6c41d4820573f01c7a4f0e63630ebe47a6f2e316))
* enable batch key filtering in settings and `quench.runBatches` ([397c8e3](https://github.com/Ethaks/FVTT-Quench/commit/397c8e3b9ff28871d73ca583610c6daf2336b3a1))
* improve diff context trimming ([e84cbd4](https://github.com/Ethaks/FVTT-Quench/commit/e84cbd45a7d3b643d2bc6ebca7d3c913fc19b905))
* improve diff readability ([4874eea](https://github.com/Ethaks/FVTT-Quench/commit/4874eeab5b7861ab5d67599a4e2d330e43364d35)), closes [#147](https://github.com/Ethaks/FVTT-Quench/issues/147)
* improve error message spacing ([c064cb2](https://github.com/Ethaks/FVTT-Quench/commit/c064cb24844a8c8964c399111b895c248a9642df)), closes [#146](https://github.com/Ethaks/FVTT-Quench/issues/146)


### Bug Fixes

* improve diff detection and display ([353e1d4](https://github.com/Ethaks/FVTT-Quench/commit/353e1d4751faf0d1257a55fdf29f860063337eb1))


* **deps:** bump fast-check from 2.25.0 to 3.1.1 ([#156](https://github.com/Ethaks/FVTT-Quench/issues/156)) ([dbbe6c7](https://github.com/Ethaks/FVTT-Quench/commit/dbbe6c767e53d0fbed62656f8d478d1e374f3c33))
* refactor `runSelectedBatches`, `_testBatches`, and utils ([fb7f286](https://github.com/Ethaks/FVTT-Quench/commit/fb7f2865b0f5bc2af598f9f5bd8a70ccd51b9827))

## [0.7.0](https://github.com/Ethaks/FVTT-Quench/compare/v0.6.0...v0.7.0) (2022-05-26)


### Features

* add option to only run preselected batches on startup ([18a59ec](https://github.com/Ethaks/FVTT-Quench/commit/18a59ec8ab9f44e5f866c880f6ab5349e7d02dbb)), closes [#117](https://github.com/Ethaks/FVTT-Quench/issues/117)
* add preselected packages setting to limit test preselection ([582d37c](https://github.com/Ethaks/FVTT-Quench/commit/582d37c42ddc3ad60775221648d0712dc826dd5a)), closes [#117](https://github.com/Ethaks/FVTT-Quench/issues/117) [#133](https://github.com/Ethaks/FVTT-Quench/issues/133)


### Bug Fixes

* fix appearance of Quench button in collapsed sidebar ([1303d51](https://github.com/Ethaks/FVTT-Quench/commit/1303d51cf699f700f77f2fac25aeb852c72661f9))
* fix registerBatch throwing an error in v10 ([#125](https://github.com/Ethaks/FVTT-Quench/issues/125)) ([45ca352](https://github.com/Ethaks/FVTT-Quench/commit/45ca3526ef783b640214c5bbbbb7fa2d47302f39))
* improve diff layout, limit shown context, improve styling ([9d07b1b](https://github.com/Ethaks/FVTT-Quench/commit/9d07b1bbfb556127a0371e23004346c4f79dd6ca)), closes [#132](https://github.com/Ethaks/FVTT-Quench/issues/132)

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
