/**
 * Represents the state of a test or suite
 *
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
export function getBatchNameParts(batchKey: string): [string, string] {
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
    throw message instanceof Error ? message : new Error(message);
  }
}

/**
 * Localizes a string including variable formatting, using {@link Localization.format}.
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
