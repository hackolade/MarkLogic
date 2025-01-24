const _ = require('lodash');

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
	return Array.isArray(arrayItems) ? arrayItems.map(getAdoptedSchema) : getAdoptedSchema(arrayItems);
};

const getStartStatements = () => {
	return `'use strict';\n\ndeclareUpdate();`;
};

const getSchemaInsertStatement = ({ uri, schema }) => {
	return `xdmp.documentInsert("${uri}", ${JSON.stringify(schema, null, 2)});`;
};

const getSchemasDatabaseAdditionalStatement = databaseName => {
	return `// schemasDatabase=${databaseName}`;
};

const getParsedSchemasDatabase = script => {
	return (script.match(/\/\/ schemasDatabase=(\w+)/) || [])[1];
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
	}

	const collectionName = schema.code || schema.collectionName || schema.title;

	return `/${collectionName}.json`;
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

const getValidationSchemaData = jsonSchema => {
	return {
		schema: {
			..._.pick(jsonSchema, ['$schema', 'id', 'type', 'title', 'description', 'additionalProperties']),
			...getAdoptedSchema(jsonSchema),
		},
		uri: getSchemaURI(jsonSchema),
	};
};

module.exports = {
	getParsedSchemasDatabase,
	getValidationSchemaData,
	getSchemaInsertStatement,
	getSchemasDatabaseAdditionalStatement,
	getStartStatements,
};
