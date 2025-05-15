const _ = require('lodash');
const { getDBClient, testConnection, applyScript } = require('./applyToInstanceHelper');
const { generateContainerScript } = require('./generateContainerScript');
const { generateScript } = require('./generateScript');
const { mapError } = require('./helpers/error');
const { getParsedSchemasDatabase } = require('./helpers/schema');

module.exports = {
	generateContainerScript,
	generateScript,

	async applyToInstance(data, logger, cb, app) {
		try {
			if (!data.script) {
				return cb({ message: 'Empty script' });
			}

			const containerProps = _.get(data.containerData, '[0]', {});
			let schemaDB = containerProps.schemaDB || getParsedSchemasDatabase(data.script);
			if (!schemaDB) {
				return cb({ message: "Schema database wasn't specified" });
			}

			const client = getDBClient(data, schemaDB);
			await applyScript(client, data.script);
			cb();
		} catch (err) {
			logger.log('error', mapError(err), 'Apply to instance Error');
			console.log(err);
			cb(mapError(err));
		}
	},

	async testConnection(connectionInfo, logger, cb, app) {
		try {
			const client = getDBClient(connectionInfo);
			await testConnection(client);
			return cb();
		} catch (err) {
			logger.log('error', mapError(err), 'Connection failed');
			return cb(mapError(err));
		}
	},
};
