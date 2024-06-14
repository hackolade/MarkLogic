const fs = require('fs');
const marklogic = require('marklogic');

const getDBClient = (connectionInfo, database = null) => {
	let sslOptions = {};
	if (connectionInfo.is_ssl) {
		sslOptions = {
			ssl: true,
			...readCertificateFiles(connectionInfo),
		};
	}
	return marklogic.createDatabaseClient({
		host: connectionInfo.host,
		port: connectionInfo.port,
		user: connectionInfo.username,
		password: connectionInfo.password,
		...(database && { database }),
		...sslOptions,
	});
};

const testConnection = dbClient => {
	return dbClient.checkConnection().result();
};

const applyScript = (dbClient, script) => {
	return dbClient.eval(script).result();
};

const readCertificateFiles = connectionInfo => {
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
};

module.exports = {
	getDBClient,
	testConnection,
	applyScript,
};
