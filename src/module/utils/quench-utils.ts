import type { QuenchBatchKey } from "../quench";
import { format as prettyFormat, plugins as formatPlugins } from "pretty-format";

/**
 * Represents the state of a test or suite
 *
 * @enum
 * @internal
 */
export const RUNNABLE_STATES = {
  IN_PROGRESS: "progress",
  PENDING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
} as const;
/** The current state of a runnable element */
export type RUNNABLE_STATE = typeof RUNNABLE_STATES[keyof typeof RUNNABLE_STATES];

/**
 * Gets the STATE of a Test instance
 *
 * @internal
 * @param test - the mocha Test instance to determine the state of
 * @returns the state of the test
 */
export function getTestState(test: Mocha.Test): RUNNABLE_STATE {
  if (test.pending) {
    return RUNNABLE_STATES.PENDING;
  } else if (test.state === undefined) {
    return RUNNABLE_STATES.IN_PROGRESS;
  } else if (test.state === "passed") {
    return RUNNABLE_STATES.SUCCESS;
  } else {
    return RUNNABLE_STATES.FAILURE;
  }
}

/**
 * Gets the STATE of a Suite instance, based on the STATE of its contained suites and tests
 *
 * @internal
 * @param suite - the mocha Suite instance to determine the state of
 * @returns the state of the suite
 */
export function getSuiteState(suite: Mocha.Suite): RUNNABLE_STATE {
  if (suite.pending) return RUNNABLE_STATES.PENDING;

  // If before hooks failed, mark the suite as failed
  // @ts-expect-error Only options to assess beforeAll hook state
  if (suite._beforeAll?.find((hook: Mocha.Hook) => hook.state === "failed"))
    return RUNNABLE_STATES.FAILURE;
  // @ts-expect-error Only options to assess beforeEach hook state
  if (suite._beforeEach?.find((hook: Mocha.Hook) => hook.state === "failed"))
    return RUNNABLE_STATES.FAILURE;

  // Check child tests
  const testStates = suite.tests.map((element) => getTestState(element));
  const allTestSucceed = testStates.every((t) => t !== RUNNABLE_STATES.FAILURE);
  if (!allTestSucceed) return RUNNABLE_STATES.FAILURE;

  // Check child suites
  const suiteStates = suite.suites.map((element) => getSuiteState(element));
  const allSuitesSucceed = suiteStates.every((t) => t !== RUNNABLE_STATES.FAILURE);
  return allSuitesSucceed ? RUNNABLE_STATES.SUCCESS : RUNNABLE_STATES.FAILURE;
}

/**
 * Returns a tuple containing the package name and the batch identifier
 *
 *
 * @internal
 * @param batchKey - The batch key
 * @returns A tuple of package name and batch identifier
 */
export function getBatchNameParts(
  batchKey: QuenchBatchKey,
): [packageName: string, batchId: string] {
  const index = batchKey.indexOf(".");
  return [batchKey.slice(0, index), batchKey.slice(index + 1)];
}

/**
 * The module's prefix used for console logging
 * @internal
 */
export const logPrefix = "QUENCH | " as const;

/**
 * This module's `id` (formerly `name`) as per its manifest
 * @internal
 */
export const MODULE_ID = "quench" as const;

/** Ensures {@link game} is initialized, either returning the {@link Game} instance or throwing an error. */
export function getGame(): Game {
  if (!(game instanceof Game)) throw new Error("Game is not initialized yet!");
  return game;
}

/**
 * Tests if the given `value` is truthy.
 *
 * If it is not truthy, an {@link Error} is thrown, which depends on the given `message` parameter:
 * - If `message` is a string`, it is used to construct a new {@link Error} which then is thrown.
 * - If `message` is an instance of {@link Error}, it is thrown.
 * - If `message` is `undefined`, an {@link Error} with a default message is thrown.
 */
export function enforce(value: unknown, message?: string | Error): asserts value {
  if (!value) {
    if (!message) {
      message =
        "There was an unexpected error in the Quench module. For more details, please take a look at the console (F12).";
    }
    const error = message instanceof Error ? message : new Error(message);
    ui.notifications?.error(error.message);
    throw error;
  }
}

/**
 * Localizes a string including variable formatting, using {@link Localization.format},
 * and prepending `QUENCH.` to the string's ID.
 *
 * @internal
 * @param key - The ID of the string to be translated
 * @param [data] - Additional data
 * @returns The localized string
 */
export function localize(key: string, data?: Record<string, unknown>): string {
  return getGame().i18n.format(`QUENCH.${key}`, data);
}

/**
 * Returns a string after truncating it to a fixed length.
 *
 * @internal
 * @param string - The string to be truncated
 * @param length - New maximum length
 * @returns The truncated string
 */
export function truncate(string: string, length = 18): string {
  const dots = string.length > length ? "..." : "";
  return `${string.slice(0, Math.max(0, length)).replaceAll(/\r?\n|\r/g, " ")}${dots}`;
}

interface CreateNodeOptions {
  /** Attributes set for the HTMLElement via {@link HTMLElement.setAttribute} */
  attr?: Record<string, string>;
  /**
   * A string of HTML directly set as the element's {@link HTMLElement.innerHTML}
   * before possible children are added
   */
  html?: string;
  /* Additional children */
  children?: string | HTMLElement | Array<string | HTMLElement>;
  baseNode?: HTMLElement | undefined;
}

/**
 * Creates an HTMLElement for a given `tag` and optionally sets attributes, innerHTML, children.
 *
 * @internal
 * @param tag - A valid HTML tag name, like "a" or "span"
 * @param options - Additional options affecting the element's contents
 * @returns The created HTML element
 */
export function createNode(tag: string, options: CreateNodeOptions) {
  const element = document.createElement(tag);
  if (options.attr !== undefined)
    for (const a in options.attr) element.setAttribute(a, options.attr[a]);
  if (options.html !== undefined) element.innerHTML = options.html;
  const children = Array.isArray(options.children) ? options.children : [options.children];
  // eslint-disable-next-line unicorn/no-array-callback-reference
  for (const child of children.filter(nonNullable)) {
    element.append(typeof child === "string" ? document.createTextNode(child) : child);
  }

  if (options.baseNode !== undefined) {
    options.baseNode.append(element);
  }
  return element;
}

/**
 * A utility function acting as a type guard, ensuring an element is not null or undefined.
 *
 * @internal
 * @param value - Value that could be null or undefined
 */
export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * A utility function that retrieves Quench's `filter` setting
 *
 * @internal
 * @see {@link ClientSettings.Values["quench.preselectFilters"]}
 * @return An array of trimmed strings containing batch key filters
 */
export function getFilterSetting(): string[] {
  const filterSetting = getGame().settings.get(MODULE_ID, "preselectFilters");
  return filterSetting.split(",").map((s) => s.trim());
}

/**
 * Additional options affecting how directories are created
 */
interface CreateDirectoryOptions {
  /**
   * Whether missing directories in the path should also be created
   *
   * @defaultValue `true`
   */
  recursive?: boolean;
}

/**
 * Ensures a directory exists and optionally walks the full path,
 * creating missing directories therein, to ensure a directory's existence.
 *
 * @param fullPath - The full path of the directory to be created
 * @param options - Additional options affecting how a directory is created
 * @returns Whether the directory exists now
 */
export async function createDirectory(
  fullPath: string,
  options: CreateDirectoryOptions = {},
): Promise<boolean> {
  /**
   * Inner directory creation function; checks whether a directory exists
   * and either confirms existence or tries to create the directory.
   *
   * @async
   * @param path - The directory's full path
   * @returns Whether the directory exists now
   */
  const _createDirectory = async (path: string): Promise<boolean> => {
    let directoryExists = false;
    try {
      // Attempt directory creation
      const resp = await FilePicker.createDirectory("data", path);
      if (resp) directoryExists = true;
    } catch (error) {
      // Confirm directory existence with expected EEXIST error, throw unexpected errors
      if (typeof error === "string" && error.startsWith("EEXIST")) {
        directoryExists = true;
      } else throw error;
    }
    return directoryExists;
  };

  const { recursive = true } = options;
  if (recursive) {
    // Split path into single directories to allow checking each of them
    const directories = fullPath.split("/");
    // Paths whose existence was already verified
    const present: string[] = [];
    for (const directory of directories) {
      const currentDirectory = [...present, directory].join("/");
      const directoryExists = await _createDirectory(currentDirectory);
      // Either continue with directory creation, or return on error
      if (directoryExists) present.push(directory);
      else return false;
    }
    // Complete path's existence was confirmed
    return true;
  } else {
    return _createDirectory(fullPath);
  }
}
/**
 * Creates a directory tree mirroring a given object's tree.
 * Defined as function to enable recursive usage.
 *
 * @param obj - The object used as blueprint for the directory tree
 * @param previous - String accumulator for already created directories, needed to get a full path
 */
export async function createDirectoryTree(obj: object, previous = "") {
  // Create all dirs of current tree layer, don't need to await individual non-interfering requests
  const currentLayerDirectories = await Promise.all(
    Object.entries(obj).map(async ([directoryKey, valueObj]) => {
      const directoryExists = await createDirectory(`${previous}${directoryKey}`, {
        recursive: false,
      });
      // Return data necessary for the next level creation workflow
      return [directoryExists, directoryKey, valueObj];
    }),
  );
  // Only continue in directories that exists
  const nextLayerPromises = currentLayerDirectories
    .filter(([directoryExists]) => directoryExists)
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce((promises, [directoryExists, previousDirectory, newDirectoryObj]) => {
      // Push next layer creation request
      if (directoryExists)
        promises.push(createDirectoryTree(newDirectoryObj, `${previous}${previousDirectory}/`));
      else {
        console.error(`Could not create directory ${previous}${previousDirectory}`);
      }
      return promises;
    }, []);
  // Return Promise for next layer
  return Promise.all(nextLayerPromises);
}

/**
 * Serializes a given data object using the "pretty-format" package.
 *
 * @internal
 * @param data - Data to be serialized
 * @returns Serialized data
 */
export function serialize(data: unknown): string {
  return prettyFormat(data, {
    plugins: [formatPlugins.DOMElement, formatPlugins.DOMCollection, formatPlugins.Immutable],
  });
}
