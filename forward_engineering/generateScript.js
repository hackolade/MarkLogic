const _ = require('lodash');
const { getIndexes } = require('./helpers/indexesHelper');
const {
	getSchemasDatabaseAdditionalStatement,
	getValidationSchemaData,
	getSchemaInsertStatement,
	getStartStatements,
} = require('./helpers/schema');

function generateScript(data, logger, cb, app) {
	const { jsonSchema, containerData } = data;

	logger.clear();
	try {
		const schemasDatabase = _.get(containerData, 'schemaDB');
		let schemasDatabaseStatement = '';
		if (schemasDatabase) {
			schemasDatabaseStatement = '\n\n' + getSchemasDatabaseAdditionalStatement(schemasDatabase);
		}
		const schemaStatement = getSchemaInsertStatement(getValidationSchemaData(JSON.parse(jsonSchema)));
		const script = getStartStatements() + schemasDatabaseStatement + '\n\n' + schemaStatement;
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
	generateScript,
};
