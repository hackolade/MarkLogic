const getDBPropertiesConfig = dbName => {
	const xqueryAdminNamespace =
		'import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";';
	const xqueryAdminConfig = 'let $config := admin:get-configuration()';
	const propHandlers = [
		{
			keyword: 'securityDB',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} let $schemaDBId := admin:database-get-security-database($config, xdmp:database("${dbName}")) return admin:database-get-name($config, $schemaDBId)`,
		},
		{
			keyword: 'schemaDB',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} let $schemaDBId := admin:database-get-schema-database($config, xdmp:database("${dbName}")) return admin:database-get-name($config, $schemaDBId)`,
		},
		{
			keyword: 'triggersDB',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} let $schemaDBId := admin:database-get-triggers-database($config, xdmp:database("${dbName}")) return admin:database-get-name($config, $schemaDBId)`,
		},
		{
			keyword: 'dataEncryption',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-data-encryption($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'language',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-language($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'stemmedSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-stemmed-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'wordSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-word-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'wordPositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-word-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastPhraseSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-phrase-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastReverseSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-reverse-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'tripleIndex',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-triple-index($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'triplePositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-triple-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastCaseSensitiveSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-case-sensitive-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastdiacriticSensitiveSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-diacritic-sensitive-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastElementWordSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-element-word-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'elementWordPositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-element-word-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastElementPhraseSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-element-phrase-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'elementValuePositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-element-value-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'attributeValuePositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-attribute-value-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'threeCharacterSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-three-character-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'threeCharacterWordPositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-three-character-word-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastElementCharacterSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-element-character-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'trailingWildcardSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-trailing-wildcard-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'trailingWildcardWordPositions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-trailing-wildcard-word-positions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'fastElementTrailingWildcardSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-fast-element-trailing-wildcard-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'twoCharacterSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-two-character-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'oneCharacterSearches',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-one-character-searches($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'uriLexicon',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-uri-lexicon($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'collectionLexicon',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-collection-lexicon($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'reindexerEnable',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-reindexer-enable($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'reindexerThrottle',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-reindexer-throttle($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'reindexerTimestamp',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-reindexer-timestamp($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'directoryCreation',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-directory-creation($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'maintainLastModified',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-maintain-last-modified($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'maintainDirectoryLastModified',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-maintain-directory-last-modified($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inheritPermissions',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-inherit-permissions($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inheritCollections',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-inherit-collections($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inheritQuality',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-inherit-quality($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryLimit',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-limit($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryListSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-list-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryTreeSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-tree-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryRangeIndexSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-range-index-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryReverseIndexSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-reverse-index-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryTripleIndexSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-triple-index-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'inMemoryGeospatialRegionIndexSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-in-memory-geospatial-region-index-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'largeSizeThreshold',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-large-size-threshold($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'locking',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-locking($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'journaling',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-journaling($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'journalSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-journal-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'preallocateJournals',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-preallocate-journals($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'preloadMappedData',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-preload-mapped-data($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'preloadReplicaMappedData',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-preload-replica-mapped-data($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'rangeIndexOptimize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-range-index-optimize($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'positionsListMaxSize',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-positions-list-max-size($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'formatCompatibility',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-format-compatibility($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'indexDetection',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-index-detection($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'expungeLocks',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-expunge-locks($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'tfNormalization',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-tf-normalization($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'rebalancerEnable',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-rebalancer-enable($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'rebalancerThrottle',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-rebalancer-throttle($config, xdmp:database("${dbName}"))`,
		},
		{
			keyword: 'assignmentPolicy',
			query: `${xqueryAdminNamespace} ${xqueryAdminConfig} return admin:database-get-assignment-policy($config, xdmp:database("${dbName}"))`,
		},
	];

	return propHandlers;
};

module.exports = {
	getDBPropertiesConfig,
};
