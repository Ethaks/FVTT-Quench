import { minify } from "terser";

/**
 * This plugin forces ESM minification in the `renderChunk` hook for the `quench.js` file.
 * This is necessary because Vite force-disabled minification for ESM files to protect developers from themselves,
 * and added no ability for devs to acknowledge the risk and force it anyway.
 * PRs and issues regarding this are in eternal limbo, see #6555 for the latest.
 *
 * Using the rollup terser plugin fails to minify whitespace for some reason,
 * so this plugin uses the terser API directly.
 *
 * @TODO: Remove in case https://github.com/vitejs/vite/issues/6555 or an equivalent is ever merged.
 * @returns {import("vite").Plugin)}
 */
export function forceMinifyEsm() {
	return {
		name: "forceMinifyEsm",
		renderChunk: {
			order: "post",
			async handler(code, chunk, outputOptions) {
				if (outputOptions.format === "es" && chunk.fileName === "quench.js") {
					return await minify(code, {
						keep_classnames: true,
						ecma: 2020,
						module: true,
						compress: { unsafe: true },
						sourceMap: { content: chunk.map },
					});
				}
				return { code, map: chunk.map };
			},
		},
	};
}
