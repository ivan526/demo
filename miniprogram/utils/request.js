const env = require('../config/env');
const storage = require('./storage');

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${env.config.baseUrl}${path}`;
}

function getAuthHeader() {
  const userInfo = storage.getUserInfo();
  if (!userInfo || !userInfo.token) {
    return {};
  }
  return {
    Authorization: `Bearer ${userInfo.token}`
  };
}

function normalizeError(error) {
  if (typeof error === 'string') {
    return { code: -1, message: error };
  }
  return {
    code: error && error.code ? error.code : -1,
    message: error && error.message ? error.message : '请求失败，请稍后重试'
  };
}

function request(options) {
  const requestOptions = Object.assign({
    method: 'GET',
    data: {},
    header: {}
  }, options);

  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.request) {
      reject(normalizeError('当前环境不支持网络请求'));
      return;
    }

    wx.request({
      url: buildUrl(requestOptions.url),
      method: requestOptions.method,
      data: requestOptions.data,
      timeout: requestOptions.timeout || env.config.timeout,
      header: Object.assign({
        'content-type': 'application/json'
      }, getAuthHeader(), requestOptions.header),
      success(response) {
        const body = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 0) {
          resolve(body.data);
          return;
        }

        const message = env.errorCodes[body.code] || body.message || '请求失败，请稍后重试';
        reject({ code: body.code || response.statusCode, message });
      },
      fail(error) {
        reject(normalizeError(error));
      }
    });
  });
}

function wxLogin(code) {
  return request({
    url: '/api/auth/wx-login',
    method: 'POST',
    data: { code }
  });
}

function getBuiltinCourses() {
  return request({ url: '/api/courses/builtin' });
}

function getBuiltinCourseDetail(id) {
  return request({ url: `/api/courses/builtin/${id}` });
}

function generateCourse(payload) {
  return request({
    url: '/api/ai/generate-course',
    method: 'POST',
    data: payload
  });
}

function syncData(payload) {
  return request({
    url: '/api/sync',
    method: 'POST',
    data: payload
  });
}

function uploadPracticeRecord(record) {
  return request({
    url: '/api/practice/record',
    method: 'POST',
    data: record
  });
}

function getUserStats() {
  return request({ url: '/api/user/stats' });
}

module.exports = {
  buildUrl,
  getAuthHeader,
  normalizeError,
  request,
  wxLogin,
  getBuiltinCourses,
  getBuiltinCourseDetail,
  generateCourse,
  syncData,
  uploadPracticeRecord,
  getUserStats
};
