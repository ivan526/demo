const { ErrorCode, ErrorMessage } = require('./errors');

function success(data = {}) {
  return {
    code: ErrorCode.SUCCESS,
    message: ErrorMessage[ErrorCode.SUCCESS],
    data,
  };
}

function fail(code, message) {
  return {
    code,
    message: message || ErrorMessage[code] || 'unknown error',
    data: null,
  };
}

function wrapHandler(handler) {
  return async (event, context) => {
    try {
      const result = await handler(event, context);
      return success(result);
    } catch (err) {
      console.error('[cloudfunction error]', err);
      if (err && err.code) {
        return fail(err.code, err.message);
      }
      return fail(ErrorCode.INTERNAL_ERROR, err && err.message);
    }
  };
}

module.exports = { success, fail, wrapHandler };
