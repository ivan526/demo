const ErrorCode = {
  SUCCESS: 0,
  PARAM_ERROR: 4001,
  CONTENT_VIOLATION: 4002,
  UNAUTHORIZED: 4011,
  FORBIDDEN: 4031,
  INTERNAL_ERROR: 5001,
  AI_SERVICE_ERROR: 5002,
};

const ErrorMessage = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.CONTENT_VIOLATION]: '内容违规',
  [ErrorCode.UNAUTHORIZED]: '未授权或登录过期',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.AI_SERVICE_ERROR]: 'AI服务调用失败',
};

class AppError extends Error {
  constructor(code, message) {
    super(message || ErrorMessage[code] || 'unknown error');
    this.code = code;
  }
}

module.exports = { ErrorCode, ErrorMessage, AppError };
