const convert = require('xml-js');

const getIndexes = async (dbClient, dbName, logger) => {
	try {
		logger.log('info', '', 'Retrieving DB indexes: ' + dbName);
		logger.progress({ message: 'Retrieving indexes', containerName: dbName, entityName: '' });

		return {
			rangeIndexes: await getRangeIndexes(dbClient, dbName),
			geoPointIndexes: await getGeoPointIndexes(dbClient, dbName),
			geoRegionIndexes: await getGeoSpatialRegionIndexes(dbClient, dbName),
		};
	} catch (err) {
		logger.log('error', err, 'Retrieving DB indexes: ' + dbName);
		return {};
	}
};

const getRangeIndexes = async (dbClient, dbName) => {
	const rangeIndexesConfig = [
		getElementRangeIndexConfig(dbName),
		getAttributeRangeIndexConfig(dbName),
		getPathRangeIndexConfig(dbName),
		getFieldRangeIndexConfig(dbName),
	];

	const rangeIndexes = rangeIndexesConfig.map(async item => {
		const indexesData = await fetchIndexData(dbClient, item.query);
		const mappedData = indexesData.map(item.mapper);
		return mappedData;
	}, []);

	const allRangeIndexes = await Promise.all(rangeIndexes);
	return flatten(allRangeIndexes);
};

const getGeoPointIndexes = async (dbClient, dbName) => {
	const geoPointIndexesConfig = [
		getElementGeoSpatialPointIndexConfig(dbName),
		getElementChildGeoSpatialPointIndexConfig(dbName),
		getElementPairGeoSpatialPointIndexConfig(dbName),
		getAttributePairGeoSpatialPointIndexConfig(dbName),
		getPathGeoSpatialPointIndexConfig(dbName),
	];

	const geoPointIndexes = geoPointIndexesConfig.map(async item => {
		const indexesData = await fetchIndexData(dbClient, item.query);
		const mappedData = indexesData.map(item.mapper);
		return mappedData;
	}, []);

	const allGeoPointIndexesConfig = await Promise.all(geoPointIndexes);
	return flatten(allGeoPointIndexesConfig);
};

const getGeoSpatialRegionIndexes = async (dbClient, dbName) => {
	const geoRegionIndexesConfig = getGeoRegionIndexConfig(dbName);
	const indexesData = await fetchIndexData(dbClient, geoRegionIndexesConfig.query);
	return indexesData.map(geoRegionIndexesConfig.mapper);
};

const getElementRangeIndexConfig = dbName => {
	const indexFunc = 'database-get-range-element-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['range-element-index'];
		return {
			idxName: `Element index (${itemIndex + 1})`,
			idxType: 'Element',
			scalarType: getXmlAttributeValue(data, 'scalar-type'),
			namespaceURI: getXmlAttributeValue(data, 'namespace-uri'),
			collation: getXmlAttributeValue(data, 'collation'),
			localname: getXmlAttributeValue(data, 'localname'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getAttributeRangeIndexConfig = dbName => {
	const indexFunc = 'database-get-range-element-attribute-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['range-element-attribute-index'];
		return {
			idxName: `Attribute index (${itemIndex + 1})`,
			idxType: 'Attribute',
			scalarType: getXmlAttributeValue(data, 'scalar-type'),
			parentNamespaceURI: getXmlAttributeValue(data, 'parent-namespace-uri'),
			parentLocalname: getXmlAttributeValue(data, 'parent-localname'),
			namespaceURI: getXmlAttributeValue(data, 'namespace-uri'),
			collation: getXmlAttributeValue(data, 'collation'),
			localname: getXmlAttributeValue(data, 'localname'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getPathRangeIndexConfig = dbName => {
	const indexFunc = 'database-get-range-path-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['range-path-index'];
		return {
			idxName: `Path index (${itemIndex + 1})`,
			idxType: 'Path',
			scalarType: getXmlAttributeValue(data, 'scalar-type'),
			pathExpression: getXmlAttributeValue(data, 'path-expression'),
			collation: getXmlAttributeValue(data, 'collation'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getFieldRangeIndexConfig = dbName => {
	const indexFunc = 'database-get-range-field-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['range-field-index'];
		return {
			idxName: `Field index (${itemIndex + 1})`,
			idxType: 'Field',
			scalarType: getXmlAttributeValue(data, 'scalar-type'),
			fieldName: getXmlAttributeValue(data, 'field-name'),
			collation: getXmlAttributeValue(data, 'collation'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getElementGeoSpatialPointIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-element-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-element-index'];
		return {
			idxName: `Geospatial element index (${itemIndex + 1})`,
			idxType: 'Element',
			namespaceURI: getXmlAttributeValue(data, 'namespace-uri'),
			localname: getXmlAttributeValue(data, 'localname'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			pointFormat: getXmlAttributeValue(data, 'point-format'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getElementChildGeoSpatialPointIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-element-child-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-element-child-index'];
		return {
			idxName: `Geospatial element child index (${itemIndex + 1})`,
			idxType: 'Element child',
			namespaceURI: getXmlAttributeValue(data, 'namespace-uri'),
			localname: getXmlAttributeValue(data, 'localname'),
			parentNamespaceURI: getXmlAttributeValue(data, 'parent-namespace-uri'),
			parentLocalname: getXmlAttributeValue(data, 'parent-localname'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			pointFormat: getXmlAttributeValue(data, 'point-format'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getElementPairGeoSpatialPointIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-element-pair-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-element-pair-index'];
		return {
			idxName: `Geospatial element pair index (${itemIndex + 1})`,
			idxType: 'Element pair',
			latitudeNamespaceURI: getXmlAttributeValue(data, 'latitude-namespace-uri'),
			latitudeLocalname: getXmlAttributeValue(data, 'latitude-localname'),
			longitudeNamespaceURI: getXmlAttributeValue(data, 'longitude-namespace-uri'),
			longitudeLocalname: getXmlAttributeValue(data, 'longitude-localname'),
			parentNamespaceURI: getXmlAttributeValue(data, 'parent-namespace-uri'),
			parentLocalname: getXmlAttributeValue(data, 'parent-localname'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getAttributePairGeoSpatialPointIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-element-attribute-pair-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-element-attribute-pair-index'];
		return {
			idxName: `Geospatial attribute pair index (${itemIndex + 1})`,
			idxType: 'Attribute pair',
			latitudeNamespaceURI: getXmlAttributeValue(data, 'latitude-namespace-uri'),
			latitudeLocalname: getXmlAttributeValue(data, 'latitude-localname'),
			longitudeNamespaceURI: getXmlAttributeValue(data, 'longitude-namespace-uri'),
			longitudeLocalname: getXmlAttributeValue(data, 'longitude-localname'),
			parentNamespaceURI: getXmlAttributeValue(data, 'parent-namespace-uri'),
			parentLocalname: getXmlAttributeValue(data, 'parent-localname'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getPathGeoSpatialPointIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-path-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-path-index'];
		return {
			idxName: `Geospatial path index (${itemIndex + 1})`,
			idxType: 'Path',
			pathExpression: getXmlAttributeValue(data, 'path-expression'),
			pointFormat: getXmlAttributeValue(data, 'point-format'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			rangeValuePositions: getXmlAttributeValue(data, 'range-value-positions') === 'true',
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const getGeoRegionIndexConfig = dbName => {
	const indexFunc = 'database-get-geospatial-region-path-indexes';
	const query = getIndexQuery(indexFunc, dbName);

	const mapper = (index, itemIndex) => {
		const data = index['geospatial-region-path-index'];
		return {
			idxName: `Geospatial region index (${itemIndex + 1})`,
			idxType: 'Path',
			pathExpression: getXmlAttributeValue(data, 'path-expression'),
			coordinateSystem: getXmlAttributeValue(data, 'coordinate-system'),
			units: getXmlAttributeValue(data, 'units'),
			geohashPrecision: getXmlAttributeValue(data, 'geohash-precision'),
			invalidValues: getXmlAttributeValue(data, 'invalid-values'),
		};
	};

	return { query, mapper };
};

const fetchIndexData = async (dbClient, query) => {
	const response = await dbClient.xqueryEval(query).result();
	return sharedResponseMapper(response);
};

const getIndexQuery = (indexFuncName, dbName) => {
	return `xquery version "1.0-ml"; import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy"; let $config := admin:get-configuration() return admin:${indexFuncName}($config, xdmp:database("${dbName}"));`;
};

const sharedResponseMapper = response => {
	if (!Array.isArray(response)) {
		return [];
	}

	return response.map(item => {
		return convert.xml2js(item.value, { compact: true, textKey: 'value' });
	});
};

const getXmlAttributeValue = (data = {}, keyword) => {
	return (data[keyword] || {}).value;
};

const flatten = (arr = []) => {
	return arr.reduce((acc, data) => {
		return [...acc, ...data];
	}, []);
};

module.exports = {
	getIndexes,
};
