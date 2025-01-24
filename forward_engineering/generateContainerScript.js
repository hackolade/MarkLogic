const _ = require('lodash');
const { getIndexes } = require('./helpers/indexesHelper');
const { getValidationSchemaData, getSchemaInsertStatement, getStartStatements } = require('./helpers/schema');

function generateContainerScript(data, logger, cb, app) {
	try {
		const { collections, containerData } = data;
		const dbName = _.get(containerData, '[0].name', '');
		logger.clear();

		let script = collections
			.map(collectionSchema => getValidationSchemaData(JSON.parse(collectionSchema)))
			.reduce((script, schemaData) => {
				return script + '\n\n' + getSchemaInsertStatement(schemaData);
			}, getStartStatements());

		const indexes = getIndexes(containerData[2], dbName);
		script = script + (indexes && '\n\n' + indexes);

		cb(null, script);
	} catch (e) {
		logger.log('error', { message: e.message, stack: e.stack }, 'Forward-Engineering Error');
		setTimeout(() => {
			cb({ message: e.message, stack: e.stack });
		}, 150);
		return;
	}
}

module.exports = {
	generateContainerScript,
};
