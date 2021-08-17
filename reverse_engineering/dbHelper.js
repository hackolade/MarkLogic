const marklogic = require('marklogic');
const qb = marklogic.queryBuilder;
const fs = require('fs');
const schemaHelper = require('./schemaHelper');
let _;
const { dependencies } = require('./appDependencies');
const { getDBPropertiesConfig } = require('./dbPropertiesHelper');

const DOCUMENTS_ORGANIZING_COLLECTIONS = 'collections';
const DOCUMENTS_ORGANIZING_DIRECTORIES = 'directories';

let dbClient = null;
let documentOrganizingType = null;
let connectionConfig = {};

const setDependencies = ({ lodash }) => _ = lodash;

const getDBClient = ({ connectionInfo = null, database = null }) => {
	if (connectionInfo) {
		let sslOptions = {};
		if (connectionInfo.is_ssl) {
			sslOptions = {
				ssl: true,
				...readCertificateFiles(connectionInfo),
			};
		}
		connectionConfig = {
			host: connectionInfo.host,
			port: connectionInfo.port,
			user: connectionInfo.username,
			password: connectionInfo.password,
			...sslOptions,
		};

	}
	return marklogic.createDatabaseClient({
		...connectionConfig,
		...(database && { database })
	});
}

const releaseDBClient = (dbClient) => {
	if (dbClient) {
		dbClient.release();
	}
}

const getDbList = async (dbClient, logger) => {
	const systemDbs = ["Security", "App-Services", "Schemas", "Last-Login", "Fab", "Triggers", "Meters", "Modules", "Extensions"];
	logger.log('info', '', 'Getting db list started');
	const getDBListXQuery = 'xdmp:database-name(xdmp:databases())';

	const response = await dbClient.xqueryEval(getDBListXQuery).result();
	const dbList = Array.isArray(response) ? response.map(({ value }) => value) : [];
	const filteredDBList = dbList.filter(dbName => !systemDbs.includes(dbName));
	logger.log('info', { dbList: filteredDBList }, 'Getting db list finished');
	return filteredDBList;
}

const getDBCollections = async ({ dbClient, logger, minDocumentsPerCollection, collections, collectionsMatcher }) => {
	logger.log('info', '', `Getting "${dbClient.connectionParams.database}" collections list started`);

	const maxCollections = 1000;
	
	const getAllCollectionsXQueryLexiconReady = (maxCollections = 1000, collectionNameMatcher = null) => {
		const getCollectionsQuery = `cts:collections("", "limit=${maxCollections}")`;
		if (collectionNameMatcher) {
			return `${getCollectionsQuery}[${collectionNameMatcher}]`;
		}
		return getCollectionsQuery;
	}
	const getAllCollectionsXQuery = 'fn:distinct-values(for $c in for $d in xdmp:directory("/", "infinity") return xdmp:document-get-collections(xdmp:node-uri($d)) return $c)';
	const getAllCollectionsXQueryLexiconReadyFilterByMinDocuments = (minDocuments, collectionNameMatcher = null) => {
		if (collectionNameMatcher) {
			return `fn:filter(function($a) { fn:number(fn:substring-after($a, ";")) >= ${minDocuments} }, cts:collections()[${collectionNameMatcher}]!(. || ";" || cts:count(., ${minDocuments})))`;
		}
		return `fn:filter(function($a) { fn:number(fn:substring-after($a, ";")) >= ${minDocuments} }, cts:collections()!(. || ";" || cts:count(., ${minDocuments})))`;
	}

	let response;
	let collectionsList;
	const collectionsNames = collections && collections.split(',').map(item => item.trim());
	const isCollectionsListSpecified = Array.isArray(collectionsNames) && collectionsNames.length > 0;	

	try {
		if (isCollectionsListSpecified) {
			return await dependencies.async.filterSeries(collectionsNames, async collectionName => {
				const isCollectionExistQuery = `xdmp:exists(collection("${collectionName}"))`;
				const isCollectionExistResult = await dbClient.xqueryEval(isCollectionExistQuery).result();
				return dependencies.lodash.get(isCollectionExistResult, ['0', 'value'], false);
			});
		}

		const minDocuments = parseInt(minDocumentsPerCollection);
		if (!isNaN(minDocuments)) {
			const collectionsDocumentsCount = await dbClient.xqueryEval(getAllCollectionsXQueryLexiconReadyFilterByMinDocuments(minDocuments, collectionsMatcher)).result();
			if (Array.isArray(collectionsDocumentsCount)) {
				response = collectionsDocumentsCount.reduce((acc, { value }) => {
					const [name, documentsCount] = value.split(';');
					if (parseInt(documentsCount) >= minDocuments) {
						acc.push({ value: name });
					}
					return acc;
				}, []);
			}
		} else {
			response = await dbClient
				.xqueryEval(
					getAllCollectionsXQueryLexiconReady(
						maxCollections,
						collectionsMatcher
					)
				)
				.result();
		}
	} catch(err) {
		logger.log('error', err, 'Getting collections list using collection lexicon');
		response = await dbClient.xqueryEval(getAllCollectionsXQuery).result();
	}
	collectionsList = Array.isArray(response) ? response.map(({ value }) => value) : [];

	logger.log(
		'info',
		{ collectionsNumber: collectionsList.length, collectionsList },
		`Getting "${dbClient.connectionParams.database}" collections list finished`
	);

	return collectionsList;
}

const getDBDirectories = async (dbClient, logger) => {
	logger.log('info', '', 'Getting directories list');
	const getAllDirectoriesXQueryLexiconReady = 'fn:distinct-values(for $d in cts:uris() return fn:replace($d, "[^/]+$", ""))';
	const getAllDirectoriesXQuery = 'fn:distinct-values(for $d in xdmp:directory("/", "infinity") return fn:replace(xdmp:node-uri($d), "[^/]+$", ""))';
	
	let response;
	try {
		response = await dbClient.xqueryEval(getAllDirectoriesXQueryLexiconReady).result();
	} catch(err) {
		logger.log('error', err, 'Getting directories list using URI lexicon');
		response = await dbClient.xqueryEval(getAllDirectoriesXQuery).result();
	}
	const directoriesList = Array.isArray(response) ? response.map(({ value }) => value) : [];
	logger.log(
		'info',
		{ directoriesNumber: directoriesList.length, directoriesList },
		`Getting "${dbClient.connectionParams.database}" directories list finished`
	);

	return directoriesList;
}

const getDocumentOrganizingType = () => {
	return documentOrganizingType;
}

const getCollectionDocuments = async (collectionName, dbClient, recordSamplingSettings) => {
	const samplingCount = await getCollectionSamplingCount(collectionName, recordSamplingSettings);
	const documents = await dbClient.documents
		.query(
			qb
				.where(qb.collection(collectionName))
				.slice(0, samplingCount)
		)
		.result();
	return documents.map(({ content }) => content);
}

const getUndefinedCollectionDocuments = async (collectionNames, dbClient, recordSamplingSettings) => {
	let documents;
	if (collectionNames.length > 0) {
		documents = await dbClient.documents
			.query(
				qb
					.where(qb.not(qb.collection(...collectionNames)))
					.slice(0, +recordSamplingSettings.absolute.value)
			)
			.result();
	} else {
		const samplingCount = await getDirectorySamplingCount('/', recordSamplingSettings, true);
		documents = await dbClient.documents
		.query(
			qb
				.where(qb.byExample({}))
				.slice(0, samplingCount)
		)
		.result();
	}
	return documents.map(({ content }) => content);
}

const getDirectoryDocuments = async (directoryName, dbClient, recordSamplingSettings) => {
	const samplingCount = await getDirectorySamplingCount(directoryName, recordSamplingSettings);
	const documents = await dbClient.documents.query(
		qb.where(
			qb.directory(directoryName)
		).slice(0, samplingCount)
	).result();

	return documents.map(({ content }) => (content));
}

const getEntityDataPackage = (entities, documentOrganizationType, containerProperties, indexes, fieldInference) => {
	setDependencies(dependencies);
	return entities.map(entity => {
		let parentDirectoryName = '';
		if (documentOrganizationType === DOCUMENTS_ORGANIZING_DIRECTORIES) {
			parentDirectoryName = findParentDirectoryName(entity.collectionName, entities);
		}

		const documentTemplate = entity.documents.reduce((template, doc) => _.merge(template, doc), {}); 

		return {
			...entity,
			bucketInfo: {
				...containerProperties,
				...indexes,
			},
			validation: {
				jsonSchema:	getEntityJSONSchema(documentTemplate, parentDirectoryName),
			},
			...(fieldInference.active === 'field' && { documentTemplate })
		};
	});
}

const getEntityJSONSchema = (documentTemplate, parentDirectoryName) => {
	return schemaHelper.getSchema(documentTemplate, parentDirectoryName);
}

const findParentDirectoryName = (entityName, entities) => {
	if (entityName === '/') {
		return null;
	}
	
	const parentPath = entityName.split('/').slice(0, -2);
	let parentName = parentPath.join('/') + '/';
	
	if (parentPath.length === 1) {
		parentName = '/';
	}
	const parentDirectory = entities.find(entity => entity.collectionName === parentName);
	
	if (parentDirectory) {
		return parentName;
	}
	
	return findParentDirectoryName(parentName, entities);
}

const setDocumentsOrganizationType = (type) => {
	documentOrganizingType = type;
}

const getDBProperties = async (dbClient, dbName, logger) => {
	setDependencies(dependencies);

	const propertiesConfig = getDBPropertiesConfig(dbName);

	const defaultResponseMapper = (response) => {
		return _.get(response, '[0].value');
	}

	const dbPropsData = await Promise.all(propertiesConfig.map(async item => {
		let response;
		try {
			response = await dbClient.xqueryEval(item.query).result();
		} catch(err) {
			logger.log('error', err, 'Retrieving DB property ' + item.keyword);
			return { keyword: item.keyword };
		}

		return {
			keyword: item.keyword,
			value: item.mapper ? item.mapper(response) : defaultResponseMapper(response),
		};
	}));

	return dbPropsData.reduce((acc, item) => {
		acc[item.keyword] = item.value;
		return acc;
	}, {});
}

const getDirectorySamplingCount = async (directoryName, samplingSettings, recursive) => {
	if (samplingSettings.active === 'absolute') {
		return +samplingSettings.absolute.value;
	} else {
		const documentsCount = await getDirectoryDocumentsCount(directoryName, recursive);
		return Math.round(documentsCount * samplingSettings.relative.value / 100);
	}
}

const getCollectionSamplingCount = async (collectionName, samplingSettings) => {
	if (samplingSettings.active === 'absolute') {
		return +samplingSettings.absolute.value;
	} else {
		const documentsCount = await getCollectionDocumentsCount(collectionName);
		return Math.round(documentsCount * samplingSettings.relative.value / 100);
	}
}

const getCollectionDocumentsCount = async (collectionName) => {
	const query = `xdmp:estimate(cts:search(doc(), cts:collection-query("${collectionName}")))`;
	const response = await dbClient.xqueryEval(query).result();
	return _.get(response, '[0].value');
}

const getDirectoryDocumentsCount = async (directoryName, recursive = false) => {
	const query = recursive 
		? `xdmp:estimate(cts:search(fn:doc(), cts:directory-query("${directoryName}", "infinity")))`
		: `xdmp:estimate(cts:search(fn:doc(), cts:directory-query("${directoryName}")))`;
	const response = await dbClient.xqueryEval(query).result();
	return _.get(response, '[0].value');
}

const readCertificateFiles = (connectionInfo) => {
	const certificates = {};
	if (connectionInfo.ca) {
		certificates.ca = fs.readFileSync(connectionInfo.ca);
	}
	if (connectionInfo.sslCert) {
		certificates.cert = fs.readFileSync(connectionInfo.sslCert);
	}
	if (connectionInfo.sslKey) {
		certificates.key = fs.readFileSync(connectionInfo.sslKey);
	}
	return certificates;
}

module.exports = {
	DOCUMENTS_ORGANIZING_COLLECTIONS,
	DOCUMENTS_ORGANIZING_DIRECTORIES,
	getDBClient,
	releaseDBClient,
	getDBCollections,
	getDBDirectories,
	getDocumentOrganizingType,
	getCollectionDocuments,
	getDirectoryDocuments,
	getEntityDataPackage,
	setDocumentsOrganizationType,
	getDBProperties,
	getUndefinedCollectionDocuments,
	getDbList,
};