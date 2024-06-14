let _;
const { dependencies } = require('./appDependencies');

const setDependencies = ({ lodash }) => (_ = lodash);

const snippetsPath = '../snippets/';

const snippets = {
	'box': require(snippetsPath + 'geoSpatial-box.json'),
	'circle': require(snippetsPath + 'geoSpatial-circle.json'),
	'linestring': require(snippetsPath + 'geoSpatial-linestring.json'),
	'multilinestring': require(snippetsPath + 'geoSpatial-multilinestring.json'),
	'multipoint': require(snippetsPath + 'geoSpatial-multipoint.json'),
	'multipolygon': require(snippetsPath + 'geoSpatial-multipolygon.json'),
	'point': require(snippetsPath + 'geoSpatial-point.json'),
	'polygon': require(snippetsPath + 'geoSpatial-polygon.json'),
};

module.exports = {
	getSchemaTemplate(parentDirectory) {
		return {
			$schema: 'http://json-schema.org/draft-04/schema#',
			type: 'object',
			additionalProperties: false,
			properties: {},
		};
	},

	getSchema(templateDocument, parentDirectory) {
		setDependencies(dependencies);
		const schema = {
			...this.getSchemaTemplate(),
			...this.getType(templateDocument),
		};

		if (parentDirectory) {
			schema.parentCollection = parentDirectory;
		}
		return schema;
	},

	getObjectSchema(objectData) {
		const properties = Object.entries(objectData).reduce((properties, [key, value]) => {
			properties[key] = this.getType(value);
			return properties;
		}, {});

		const snippetType = this.getSnippetType(objectData);
		if (snippetType) {
			const snippet = snippets[snippetType.subType];
			if (snippet) {
				const snippetSchema = this.getSchemaFromSnippet(snippet);
				return {
					type: snippetType.childType,
					subType: snippetType.subType,
					properties: {
						...properties,
						...snippetSchema,
					},
				};
			}
		}

		return {
			type: 'object',
			properties,
		};
	},

	getArraySchema(arrayData) {
		if (arrayData.length === 0) {
			return { type: 'array' };
		}

		const items = arrayData.map(item => {
			return this.getType(item);
		});
		const uniqItems = _.uniqWith(items, _.isEqual);
		if (uniqItems.length === 1) {
			return {
				type: 'array',
				items: uniqItems[0],
			};
		}

		return {
			type: 'array',
			items,
		};
	},

	getSnippetType(objectData) {
		const geoSpatialTypes = [
			'box',
			'circle',
			'linestring',
			'multilinestring',
			'multipoint',
			'multipolygon',
			'point',
			'polygon',
		];
		const isGeoSpatial =
			typeof objectData.type === 'string' &&
			geoSpatialTypes.includes(objectData.type.toLowerCase()) &&
			Array.isArray(objectData.coordinates);
		if (isGeoSpatial) {
			return {
				childType: 'geoSpatial',
				subType: objectData.type,
			};
		}
		return null;
	},

	getType(value) {
		const valueType = this.getValueType(value);
		switch (valueType) {
			case 'scalar':
				return {};
			case 'array':
				return this.getArraySchema(value);
			case 'object':
				return this.getObjectSchema(value);
			default:
				return {};
		}
	},

	getValueType(value) {
		if (Array.isArray(value)) {
			return 'array';
		}
		if (typeof value === 'object' && value !== null) {
			return 'object';
		}
		return 'scalar';
	},

	getSchemaFromSnippet(snippet) {
		const isArray = snippet.type === 'array' || snippet.parentType === 'array';
		let schema = isArray ? [] : {};

		for (let i in snippet.properties) {
			const field = snippet.properties[i];
			let currentSchema = {
				type: field.type,
			};

			if (field.properties) {
				const properties = this.getSchemaFromSnippet(field);

				if (currentSchema.type === 'array') {
					currentSchema.items = properties;
				} else {
					currentSchema.properties = properties;
				}
			}

			if (field.sample) {
				currentSchema.sample = field.sample;
			}

			if (isArray) {
				schema.push(currentSchema);
			} else {
				schema[field.name] = currentSchema;
			}
		}

		return schema;
	},
};
