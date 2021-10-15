/**
 * Pauses execution for the given number of milliseconds
 * @param {number} millis - duration to pause for in milliseconds
 * @returns {Promise}
 */
async function pause(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

/**
 * Resets the world to a blank state with no entities.
 *
 * WARNING: This will permanently delete every entity in your world (scenes, actors, items, macros, roll tables, journal entries, playlists, chat messages, folders, etc.)
 * @returns {Promise<void>}
 */
async function clearWorld() {
  const exclude = [User].map((e) => e.metadata.name);
  for (const collection of Object.values(game)) {
    if (!(collection instanceof DocumentCollection) || exclude.includes(collection.documentName))
      continue;
    if (!collection.size) continue;

    await collection.documentClass.deleteDocuments(collection.map((e) => e.id));
  }
}

/**
 * Represents the state of a test or suite
 * @enum {string}
 */
const RUNNABLE_STATE = {
  IN_PROGRESS: "progress",
  PENDING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
};

/**
 * Gets the STATE of a Test instance
 * @param {Test} test - the mocha Test instance to determine the state of
 * @returns {RUNNABLE_STATE} - the state of the test
 */
function getTestState(test) {
  if (test.pending) {
    return RUNNABLE_STATE.PENDING;
  } else if (test.state === undefined) {
    return RUNNABLE_STATE.IN_PROGRESS;
  } else if (test.state === "passed") {
    return RUNNABLE_STATE.SUCCESS;
  } else {
    return RUNNABLE_STATE.FAILURE;
  }
}

/**
 * Gets the STATE of a Suite instance, based on the STATE of its contained suites and tests
 * @param {Suite} suite - the mocha Suite instance to determine the state of
 * @returns {RUNNABLE_STATE} - the state of the suite
 */
function getSuiteState(suite) {
  if (suite.pending) return RUNNABLE_STATE.PENDING;

  // Check child tests
  const testStates = suite.tests.map(getTestState);
  const allTestSucceed = testStates.every((t) => t !== RUNNABLE_STATE.FAILURE);
  if (!allTestSucceed) return RUNNABLE_STATE.FAILURE;

  // Check child suites
  const suiteStates = suite.suites.map(getSuiteState);
  const allSuitesSucceed = suiteStates.every((t) => t !== RUNNABLE_STATE.FAILURE);
  return allSuitesSucceed ? RUNNABLE_STATE.SUCCESS : RUNNABLE_STATE.FAILURE;
}

/**
 * Returns a tuple containing the package name and the batch identifier
 *
 * @param {string} batchKey - The batch key
 * @returns {[string, string]} A tuple of package name and batch identifier
 */
function getBatchNameParts(batchKey) {
  const index = batchKey.indexOf(".");
  return [batchKey.slice(0, index), batchKey.slice(index + 1)];
}

export const internalUtils = {
  RUNNABLE_STATE,
  getTestState,
  getSuiteState,
  getBatchNameParts,
};

export const quenchUtils = {
  pause,
  clearWorld,
  _internal: internalUtils,
};
