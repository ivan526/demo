const ENV = {
  dev: {
    baseUrl: 'https://api.example.com',
    timeout: 10000,
    retryTimes: 1,
    aiDailyLimit: 3
  },
  prod: {
    baseUrl: 'https://api.example.com',
    timeout: 10000,
    retryTimes: 1,
    aiDailyLimit: 3
  }
};

const currentEnv = 'dev';

module.exports = {
  currentEnv,
  config: ENV[currentEnv],
  errorCodes: {
    4001: '参数错误',
    4002: '内容违规',
    4011: '登录已过期，请重新登录',
    4031: '没有操作权限',
    5001: '服务暂不可用',
    5002: 'AI 服务调用失败'
  }
};
