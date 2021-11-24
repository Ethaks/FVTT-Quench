# Contributing to Quench

## Issues and Pull Requests

Issues detailing bugs, missing features, and general feedback are most welcome.

Before submitting a pull request, opening an issue regarding the planned development can be useful to allow for some discussion before time and effort are invested.

## Development

### Setup

Building the module requires a recent version of `node` to be installed.
Dependencies can be installed by running

```bash
npm ci
```

### Building

Building the module will create a `dist` directory whose contents can be read and used by Foundry.
A one-off build, which will create a minified and production ready result, can be created with

```bash
npm run build
```

While developing, the build process can also be started as a watch job waiting for file changes and re-building the module as necessary by running

```bash
npm run build:watch
```

### Linking

The `dist` directory created by building the package can be linked or copied into Foundry's `Data/modules` directory as `quench`.
The name of the directory is important, as diverging from the module's name will cause Foundry not to recognise the module.

### Type Checking

The regular build process does not check the TypeScript code the way the regular compiler does.
To still receive the benefits of type checking, you can run

```bash
npm run lint
```

This will lint all files using ESLint and run TypeScript's `tsc`.
