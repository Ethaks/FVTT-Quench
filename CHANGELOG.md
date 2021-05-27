# CHANGELOG

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
