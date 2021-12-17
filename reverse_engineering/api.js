'use strict';
const marklogic = require('marklogic');
const {
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
} = require('./dbHelper');
const { prepareError } = require('./generalHelper');
const logHelper = require('./logHelper');
const { setDependencies } = require('./appDependencies');
const { getIndexes } = require('./indexesHelper');
const { dependencies } = require('./appDependencies');
const UNDEFINED_COLLECTION_NAME = 'Documents with undefined collection';

module.exports = {
	connect: function (connectionInfo, logger, cb) {
		const dbClient = getDBClient({ connectionInfo });
		logger.log('info', '', 'Got DB client');
		cb(dbClient);
	},

	disconnect: function (connectionInfo, cb) {
		cb();
	},

	testConnection: function (connectionInfo, logger, cb, app) {
		logInfo('Test connection', connectionInfo, logger);
		this.connect(connectionInfo, logger, async (dbClient) => {
			try {
				await dbClient.checkConnection().result();
				logger.log('info', '', 'Test connection: Connection successful');
				cb();
			} catch (err) {
				logger.log('info', '', 'Test connection: Connection failed');
				cb(prepareError(err));
			}
			this.disconnect(connectionInfo, () => {});
		});
	},

	getDbCollectionsNames: async function(connectionInfo, logger, cb, app) {
		const timeoutMessage = 'Getting collections/directories timeout';
		logInfo('Retrieving databases, collections/directories lists', connectionInfo, logger);
		logger.log('info', '', 'Getting databases, collections/directories lists');
		setDependencies(app);
		const timeoutValue = connectionInfo.queryRequestTimeout || 1000 * 60 * 2;
		let timeoutHandler;

		try {
			logger.progress({ message: 'Getting database list', containerName: '', entityName: '' });
			
			const dbClient = getDBClient({ connectionInfo });
			const dbNames = connectionInfo.database
				? [connectionInfo.database]
				: await getDbList(dbClient, logger);

			const result = await dependencies.async.mapSeries(dbNames, async dbName => {
				const dbClient = getDBClient({ database: dbName });
				let dbCollections = [];

				try {
					const getTimeoutHandler = () => {
						return new Promise((resolve, reject) => {
							timeoutHandler = setTimeout(() => {
								reject(new Error(timeoutMessage));
							}, timeoutValue);
						});
					}

					switch (connectionInfo.documentsOrganizing) {
						case 'directories':
							dbCollections = await getDBDirectories(dbClient, logger);
							setDocumentsOrganizationType(DOCUMENTS_ORGANIZING_DIRECTORIES);
							break;
						default:
							dbCollections = await Promise.race([
								getDBCollections({
									dbClient,
									logger,
									minDocumentsPerCollection:
										connectionInfo.minDocuments,
									collections: connectionInfo.collections,
									collectionsMatcher: connectionInfo.collectionsMatcher
								}),
								getTimeoutHandler(),
							]);
							if (!(connectionInfo.minDocuments || connectionInfo.collections)) {
								dbCollections.push(UNDEFINED_COLLECTION_NAME);
							}
							setDocumentsOrganizationType(DOCUMENTS_ORGANIZING_COLLECTIONS);
					}
				} catch (err) {
					if (err.message !== timeoutMessage) {
						throw err;
					}
					logger.progress({ message: 'Error getting collections list', containerName: dbName, entityName: '' });
					logger.log('error', err, `Retrieving collections/directories list for "${dbName}" DB`);
					return null;
				} finally {
					clearTimeout(timeoutHandler);
				}
				
				return {
					dbCollections,
					dbName,
				}
			});

			cb(null, result.filter(Boolean));
		} catch (err) {
			logger.log('error', err, 'Connecting to a DB for a retrieving collections/directories information');
			cb(prepareError(err));
		} finally {
			clearTimeout(timeoutHandler);
		}
	},

	getDbCollectionsData: async function(data, logger, cb, app) {
		logger.log('info', data, 'Retrieving documents', data.hiddenKeys);
		setDependencies(app);
		
		const recordSamplingSettings = data.recordSamplingSettings;
		const maxFetchOperationsAtATime = 10;

		try {
			const documentOrganizationType = getDocumentOrganizingType();

			const result = await dependencies.async.mapSeries(data.collectionData.dataBaseNames, async dbName => {
				logger.progress({ message: 'Documents sampling started', containerName: dbName, entityName: '' });
				const entityNames = data.collectionData.collections[dbName] || [];
				const dbClient = getDBClient({ database: dbName });

				const containerProperties = await getDBProperties(dbClient, dbName, logger);
				const indexes = await getIndexes(dbClient, dbName, logger);
			
				const entities = await dependencies.async.mapLimit(entityNames, maxFetchOperationsAtATime, async entityName => {
					logger.log('info', '', `Retrieving "${dbName}:${entityName}" documents started`);
					let documents;
					if (documentOrganizationType === DOCUMENTS_ORGANIZING_COLLECTIONS) {
						if (entityName === UNDEFINED_COLLECTION_NAME) {
							const collectionNames = await getDBCollections({ dbClient, logger });
							if (collectionNames.length > 1000) {
								documents = [];
							} else {
								documents = await getUndefinedCollectionDocuments(collectionNames, dbClient, recordSamplingSettings);
							}
						} else {
							documents = await getCollectionDocuments(entityName, dbClient, recordSamplingSettings);
						}
					} else {
						documents = await getDirectoryDocuments(entityName || '', dbClient, recordSamplingSettings);
					}
					logger.progress({ message: 'Sample documents loaded', containerName: dbName, entityName });					
					logger.log('info', '', `Retrieving "${dbName}:${entityName}" documents finished`);

					if (!data.includeEmptyCollection && documents.length === 0) {
						return null;
					}
					return {
						dbName,
						collectionName: entityName  === UNDEFINED_COLLECTION_NAME ? 'Undefined collection' : entityName || '',
						documents,
						entityLevel: {
							storeAsCollDir: DOCUMENTS_ORGANIZING_COLLECTIONS ? 'collection' : 'directory'
						},
					};
				});
				
				releaseDBClient(dbClient);
				return getEntityDataPackage(entities.filter(Boolean), documentOrganizationType, containerProperties, indexes, data.fieldInference);
			});

			logger.progress({ message: 'Reverse-Engineering completed', containerName: '', entityName: '' });
			
			const dbCollectionsData = dependencies.lodash.flatten(result);
			cb(null, dbCollectionsData);
		} catch (err) {
			logger.log('error', err, 'Retrieving collections/directories documents');
			cb(prepareError(err));
		}
	}
};

const logInfo = (step, connectionInfo, logger) => {
	logger.clear();
	logger.log('info', logHelper.getSystemInfo(connectionInfo.appVersion), step);
	logger.log('info', connectionInfo, 'connectionInfo', connectionInfo.hiddenKeys);
};
