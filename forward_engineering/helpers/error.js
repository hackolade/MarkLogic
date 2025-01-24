const _ = require('lodash');

const mapError = error => {
	if (!(error instanceof Error)) {
		return error;
	}

	return {
		message: error.message + '\n' + _.get(error, 'body.errorResponse.message', ''),
		stack: error.stack,
	};
};

module.exports = {
	mapError,
};
