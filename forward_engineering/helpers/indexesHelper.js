const getIndexes = (indexData, dbName) => {
	if (!indexData) {
		return '';
	}

	const alreadyUsedVariableNames = ['admin', 'config', 'dbId'];
	const rangeIndexes = getRangeIndexes(indexData.rangeIndexes, alreadyUsedVariableNames);
	const geoPointIndexes = getGeoPointIndexes(indexData.geoPointIndexes, [
		...alreadyUsedVariableNames,
		...rangeIndexes.indexesVarNames,
	]);
	const geoRegionIndexes = getGeoRegionIndexes(indexData.geoRegionIndexes, [
		...alreadyUsedVariableNames,
		...rangeIndexes.indexesVarNames,
		geoPointIndexes.indexesVarNames,
	]);

	const statements = [...rangeIndexes.statements, ...geoPointIndexes.statements, ...geoRegionIndexes.statements];
	if (statements.length === 0) {
		return '';
	}
	const startStatements = getStartStatements(dbName);
	const endStatements = getEndStatements();
	return startStatements + '\n\n' + statements.join('\n') + '\n\n' + endStatements;
};

const getRangeIndexes = (rangeIndexesData, alreadyUsedVariableNames) => {
	const rangeIndexHandlers = [
		{ type: 'Element', mapper: elementRangeIndexesMapper, addIndexesFuncName: 'databaseAddRangeElementIndex' },
		{
			type: 'Attribute',
			mapper: elementAttributesRangeIndexesMapper,
			addIndexesFuncName: 'databaseAddRangeElementAttributeIndex',
		},
		{ type: 'Path', mapper: rangePathIndexesMapper, addIndexesFuncName: 'databaseAddRangePathIndex' },
		{ type: 'Field', mapper: rangeFieldIndexesMapper, addIndexesFuncName: 'databaseAddRangeFieldIndex' },
	];
	return getIndexesStatementsByType(rangeIndexesData, rangeIndexHandlers, alreadyUsedVariableNames);
};

const getGeoPointIndexes = (geoPointIndexesData, alreadyUsedVariableNames) => {
	const geoPointIndexHandlers = [
		{ type: 'Element', mapper: geoElementIndexesMapper, addIndexesFuncName: 'databaseAddGeospatialElementIndex' },
		{
			type: 'Element child',
			mapper: geoElementChildIndexesMapper,
			addIndexesFuncName: 'databaseAddGeospatialElementChildIndex',
		},
		{
			type: 'Element pair',
			mapper: geoElementPairIndexesMapper,
			addIndexesFuncName: 'databaseAddGeospatialElementPairIndex',
		},
		{
			type: 'Attribute pair',
			mapper: geoAttributePairIndexesMapper,
			addIndexesFuncName: 'databaseAddGeospatialElementAttributePairIndex',
		},
		{ type: 'Path', mapper: geoPathIndexesMapper, addIndexesFuncName: 'databaseAddGeospatialPathIndex' },
	];
	return getIndexesStatementsByType(geoPointIndexesData, geoPointIndexHandlers, alreadyUsedVariableNames);
};

const getGeoRegionIndexes = (geoRegionIndexesData, alreadyUsedVariableNames) => {
	const geoRegionIndexHandlers = [
		{ mapper: geoRegionIndexesMapper, addIndexesFuncName: 'databaseAddGeospatialRegionPathIndex' },
	];
	return getIndexesStatementsByType(geoRegionIndexesData, geoRegionIndexHandlers, alreadyUsedVariableNames);
};

const getIndexesStatementsByType = (indexesData = [], handlersConfig, alreadyUsedVariableNames) => {
	let indexesVarNames = [];
	const statements = handlersConfig.reduce((acc, indexHandler) => {
		const indexTypeVarNames = [];
		const indexesForType = indexesData.filter(
			({ idxType, isActivated }) => idxType === indexHandler.type && isActivated !== false,
		);

		const indexStatements = indexesForType.map(indexData => {
			const variableName = getCheckedVariableName(indexData.idxName, [
				...alreadyUsedVariableNames,
				...indexesVarNames,
				...indexTypeVarNames,
			]);
			indexTypeVarNames.push(variableName);
			return indexHandler.mapper(indexData, variableName);
		});

		if (indexStatements.length === 0) {
			return acc;
		}
		indexesVarNames = indexesVarNames.concat(indexTypeVarNames);
		const indexesAddStatement = getIndexesAddStatement(indexHandler.addIndexesFuncName, indexTypeVarNames) + '\n';
		indexStatements.push(indexesAddStatement);

		return [...acc, ...indexStatements];
	}, []);

	return { statements, indexesVarNames };
};

const elementRangeIndexesMapper = (data, varName) => {
	const funcName = 'databaseRangeElementIndex';
	const funcArguments = [
		mapString(data.scalarType),
		mapString(data.namespaceURI),
		mapString(data.localname),
		mapString(data.scalarType === 'string' ? data.collation : ''),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const elementAttributesRangeIndexesMapper = (data, varName) => {
	const funcName = 'databaseRangeElementAttributeIndex';
	const funcArguments = [
		mapString(data.scalarType),
		mapString(data.parentNamespaceURI),
		mapString(data.parentLocalname),
		mapString(data.namespaceURI),
		mapString(data.localname),
		mapString(data.scalarType === 'string' ? data.collation : ''),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const rangePathIndexesMapper = (data, varName) => {
	const funcName = 'databaseRangePathIndex';
	const funcArguments = [
		'dbId',
		mapString(data.scalarType),
		mapString(data.pathExpression),
		mapString(data.scalarType === 'string' ? data.collation : ''),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const rangeFieldIndexesMapper = (data, varName) => {
	const funcName = 'databaseRangeFieldIndex';
	const funcArguments = [
		mapString(data.scalarType),
		mapString(data.fieldName),
		mapString(data.scalarType === 'string' ? data.collation : ''),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoElementIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialElementIndex';
	const funcArguments = [
		mapString(data.namespaceURI),
		mapString(data.localname),
		mapString(data.coordinateSystem),
		mapBoolean(data.rangeValuePositions),
		mapString(data.pointFormat),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoElementChildIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialElementChildIndex';
	const funcArguments = [
		mapString(data.parentNamespaceURI),
		mapString(data.parentLocalname),
		mapString(data.namespaceURI),
		mapString(data.localname),
		mapString(data.coordinateSystem),
		mapBoolean(data.rangeValuePositions),
		mapString(data.pointFormat),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoElementPairIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialElementPairIndex';
	const funcArguments = [
		mapString(data.parentNamespaceURI),
		mapString(data.parentLocalname),
		mapString(data.latitudeNamespaceURI),
		mapString(data.latitudeLocalname),
		mapString(data.longitudeNamespaceURI),
		mapString(data.longitudeLocalname),
		mapString(data.coordinateSystem),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoAttributePairIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialElementAttributePairIndex';
	const funcArguments = [
		mapString(data.parentNamespaceURI),
		mapString(data.parentLocalname),
		mapString(data.latitudeNamespaceURI),
		mapString(data.latitudeLocalname),
		mapString(data.longitudeNamespaceURI),
		mapString(data.longitudeLocalname),
		mapString(data.coordinateSystem),
		mapBoolean(data.rangeValuePositions),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoPathIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialPathIndex';
	const funcArguments = [
		mapString(data.pathExpression),
		mapString(data.coordinateSystem),
		mapBoolean(data.rangeValuePositions),
		mapString(data.pointFormat),
		mapString(data.invalidValues),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const geoRegionIndexesMapper = (data, varName) => {
	const funcName = 'databaseGeospatialRegionPathIndex';
	const funcArguments = [
		mapString(data.pathExpression),
		mapString(data.coordinateSystem),
		mapInteger(data.geohashPrecision),
		mapString(data.invalidValues),
		mapString(data.units),
	];

	return getIndexFuncStatement(varName, funcName, funcArguments);
};

const getIndexFuncStatement = (varName, funcName, funcArguments) => {
	return `const ${varName} = admin.${funcName}(${funcArguments.join(', ')});`;
};

const mapString = (value = '') => {
	return `"${value}"`;
};

const mapInteger = (value = 0) => {
	return parseInt(value);
};

const mapBoolean = value => {
	return value === true ? 'fn.true()' : 'fn.false()';
};

const getCheckedVariableName = (name = '', alreadyUsedVariableNames, defaultName = 'index') => {
	let updatedName = name.trim().replace(/^[^a-zA-Z_$]|[^0-9a-zA-Z_$]/gi, '_') || defaultName;
	''.trim().re;
	let nameSuffix = '';
	let i = 0;
	while (alreadyUsedVariableNames.includes(updatedName + nameSuffix)) {
		nameSuffix = ++i;
	}
	return updatedName + nameSuffix;
};

const getIndexesAddStatement = (funcName, indexesVarNames) => {
	return `config = admin.${funcName}(config, dbId, [${indexesVarNames.join(', ')}]);`;
};

const getStartStatements = dbName => {
	return (
		'const admin = require("/MarkLogic/admin.xqy");\n' +
		'let config = admin.getConfiguration();\n' +
		`const dbId = xdmp.database("${dbName}");`
	);
};

const getEndStatements = () => {
	return 'admin.saveConfiguration(config);';
};

module.exports = {
	getIndexes,
};
