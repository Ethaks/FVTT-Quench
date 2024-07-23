module.exports.readVersion = (contents) => JSON.parse(contents).version;

module.exports.writeVersion = (contents, version) => {
	const json = JSON.parse(contents);
	json.version = version;
	json.download = `https://github.com/Ethaks/FVTT-Quench/releases/download/v${version}/module.zip`;
	return JSON.stringify(json);
};
