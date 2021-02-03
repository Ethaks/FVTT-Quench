async function pause(millis) { return new Promise(resolve => setTimeout(resolve, millis)); }

export const quenchUtils = { pause };
