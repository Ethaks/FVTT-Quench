import path from "node:path";
import url from "node:url";
import fs from "fs-extra";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/**
 * An object containing various configuration values related to Foundry VTT and the system's build process.
 *
 * @typedef {object} FoundryConfig
 * @property {string | undefined} dataPath - The path to the user data directory.
 * @property {string | undefined} appPath - The path to Foundry's app directory.
 * @property {string | undefined} routePrefix - The prefix to use for all routes.
 * @property {boolean} openBrowser - Whether to open the browser when starting the development server.
 */

/** @type {Partial<FoundryConfig>} */
const rawFoundryConfig = await fs
  .readJson(path.resolve(__dirname, "..", "foundryconfig.json"))
  .catch(() => ({}));

/**
 * An object containing various configuration values related to Foundry VTT and the system's build process.
 *
 * @type {FoundryConfig}
 */
export const FOUNDRY_CONFIG = Object.freeze({
  dataPath: undefined,
  appPath: undefined,
  routePrefix: undefined,
  openBrowser: false,
  ...rawFoundryConfig,
});

/**
 * Returns a URL including the configured route prefix from {@link FOUNDRY_CONFIG}.
 *
 * @param {string} relativePath - A URL
 * @param {boolean} [absolute=true] - Whether the URL should start with a `/`
 * @returns {string} A URL including the configured route prefix
 */
export function resolveUrl(relativePath, absolute = true) {
  const routeStart = absolute ? "/" : "";
  const routePrefix = FOUNDRY_CONFIG.routePrefix ? `${FOUNDRY_CONFIG.routePrefix}/` : "";
  return `${routeStart}${routePrefix}${relativePath}`;
}

/**
 * Removes the configured route prefix from a URL.
 *
 * @param {string} prefixedUrl - A URL possibly containing the configured route prefix
 * @returns {string} A URL without the configured route prefix
 */
export function removePrefix(prefixedUrl) {
  const routePrefix = FOUNDRY_CONFIG.routePrefix ? `${FOUNDRY_CONFIG.routePrefix}/` : "";
  return prefixedUrl.replace(routePrefix, "");
}
