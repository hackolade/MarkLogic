const prepareError = error => {
	if (!(error instanceof Error)) {
		return error;
	}

	return {
		message: error.message,
		stack: error.stack,
	};
};

module.exports = {
	prepareError,
};
