const { setDependencies, dependencies } = require('./appDependencies');
const { getDBClient, testConnection, applyScript } = require('./applyToInstanceHelper');
const { getIndexes } = require('./helpers/indexesHelper');

const setLocalDependencies = ({ lodash }) => (_ = lodash);
let _;

module.exports = {
	generateContainerScript(data, logger, cb, app) {
		setDependencies(app);
		setLocalDependencies(dependencies);

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
	},

	generateScript(data, logger, cb, app) {
		setDependencies(app);
		setLocalDependencies(dependencies);

		let { jsonSchema, containerData } = data;
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
	},

	async applyToInstance(data, logger, cb, app) {
		try {
			setDependencies(app);
			setLocalDependencies(dependencies);
			logger.clear();
			logger.log('info', data, data.hiddenKeys);

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
		logger.clear();
		logger.log('info', connectionInfo, 'Test connection', connectionInfo.hiddenKeys);
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

const getValidationSchemaData = jsonSchema => {
	return {
		schema: {
			..._.pick(jsonSchema, ['$schema', 'id', 'type', 'title', 'description', 'additionalProperties']),
			...getAdoptedSchema(jsonSchema),
		},
		uri: getSchemaURI(jsonSchema),
	};
};

const getAdoptedSchema = schema => {
	const availableKeys = [
		'enum',
		'additionalItems',
		'maxItems',
		'minItems',
		'uniqueItems',
		'multipleOf',
		'maximum',
		'exclusiveMaximum',
		'minimum',
		'exclusiveMinimum',
		'maxProperties',
		'minProperties',
		'required',
		'additionalProperties',
		'properties',
		'patternProperties',
		'dependencies',
		'maxLength',
		'minLength',
		'pattern',
		'format',
		'description',
	];
	const adoptedSchema = {
		type: getType(schema.type),
		..._.pick(schema, availableKeys),
		...getChoices(schema),
	};

	if (schema.properties) {
		adoptedSchema.properties = getProperties(schema.properties);
	}

	if (schema.patternProperties) {
		adoptedSchema.patternProperties = getProperties(schema.properties);
	}

	if (schema.items) {
		adoptedSchema.items = getArrayItems(schema.items);
	}

	return adoptedSchema;
};

const getType = type => {
	switch (type) {
		case 'geoSpatial':
			return 'object';
		case 'binary':
			return 'string';
		default:
			return type;
	}
};

const getProperties = properties => {
	const adoptedProperties = {};
	for (const key in properties) {
		adoptedProperties[key] = getAdoptedSchema(properties[key]);
	}
	return adoptedProperties;
};

const getArrayItems = arrayItems => {
	if (Array.isArray(arrayItems)) {
		return arrayItems.map(getAdoptedSchema);
	} else {
		return getAdoptedSchema(arrayItems);
	}
};

const getSchemaURI = schema => {
	if (schema.schemaURI) {
		let schemaUri = schema.schemaURI;
		if (!schemaUri.startsWith('/')) {
			schemaUri = '/' + schemaUri;
		}
		if (!schemaUri.toLowerCase().endsWith('.json')) {
			schemaUri = schemaUri + '.json';
		}
		return schemaUri;
	} else {
		const collectionName = schema.code || schema.collectionName || schema.title;
		return `/${collectionName}.json`;
	}
};

const getStartStatements = () => {
	return `'use strict';\n\ndeclareUpdate();`;
};

const getSchemaInsertStatement = ({ uri, schema }) => {
	return `xdmp.documentInsert("${uri}", ${JSON.stringify(schema, null, 2)});`;
};

const getChoices = schema => {
	const choices = {};
	if (Array.isArray(schema.allOf)) {
		choices.allOf = schema.allOf.map(getAdoptedSchema);
	}
	if (Array.isArray(schema.anyOf)) {
		choices.anyOf = schema.anyOf.map(getAdoptedSchema);
	}
	if (Array.isArray(schema.oneOf)) {
		choices.oneOf = schema.oneOf.map(getAdoptedSchema);
	}
	if (schema.not) {
		choices.not = getAdoptedSchema(schema.not);
	}

	return choices;
};

const getSchemasDatabaseAdditionalStatement = databaseName => {
	return `// schemasDatabase=${databaseName}`;
};

const getParsedSchemasDatabase = script => {
	return (script.match(/\/\/ schemasDatabase=(\w+)/) || [])[1];
};

const mapError = error => {
	if (!(error instanceof Error)) {
		return error;
	}

	return {
		message: error.message + '\n' + _.get(error, 'body.errorResponse.message', ''),
		stack: error.stack,
	};
};
