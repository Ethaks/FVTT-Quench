/**
 * Pauses execution for the given number of milliseconds
 * @param {number} millis - duration to pause for in milliseconds
 * @returns {Promise}
 */
async function pause(millis) { return new Promise(resolve => setTimeout(resolve, millis)); }

export const quenchUtils = { pause };
