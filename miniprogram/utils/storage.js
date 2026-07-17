const validator = require('./validator');

const STORAGE_KEYS = {
  userInfo: 'user_info',
  practiceRecords: 'practice_records',
  customCourses: 'custom_courses',
  appConfig: 'app_config',
  tempWrongQuestions: 'temp_wrong_questions'
};

const DEFAULT_CONFIG = {
  sound_enabled: true,
  auto_next: true,
  default_difficulty: 'easy',
  last_sync_time: 0
};

function getWxStorage() {
  if (typeof wx !== 'undefined' && wx.getStorageSync) {
    return wx;
  }

  const memory = getWxStorage.memory || {};
  getWxStorage.memory = memory;

  return {
    getStorageSync(key) {
      return memory[key];
    },
    setStorageSync(key, value) {
      memory[key] = value;
    },
    removeStorageSync(key) {
      delete memory[key];
    }
  };
}

function read(key, fallback) {
  const value = getWxStorage().getStorageSync(key);
  return value === undefined || value === '' ? fallback : value;
}

function write(key, value) {
  getWxStorage().setStorageSync(key, value);
  return value;
}

function remove(key) {
  getWxStorage().removeStorageSync(key);
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function initStorage() {
  if (!read(STORAGE_KEYS.userInfo, null)) {
    write(STORAGE_KEYS.userInfo, {
      temp_user_id: createId('temp'),
      is_login: false,
      openid: '',
      nickname: '',
      avatar: ''
    });
  }

  if (!Array.isArray(read(STORAGE_KEYS.practiceRecords, []))) {
    write(STORAGE_KEYS.practiceRecords, []);
  }

  if (!Array.isArray(read(STORAGE_KEYS.customCourses, []))) {
    write(STORAGE_KEYS.customCourses, []);
  }

  write(STORAGE_KEYS.appConfig, Object.assign({}, DEFAULT_CONFIG, read(STORAGE_KEYS.appConfig, {})));
}

function getUserInfo() {
  return read(STORAGE_KEYS.userInfo, null);
}

function saveUserInfo(userInfo) {
  return write(STORAGE_KEYS.userInfo, Object.assign({}, getUserInfo(), userInfo));
}

function clearUserInfo() {
  const tempUserId = getUserInfo() ? getUserInfo().temp_user_id : createId('temp');
  return write(STORAGE_KEYS.userInfo, {
    temp_user_id: tempUserId,
    is_login: false,
    openid: '',
    nickname: '',
    avatar: ''
  });
}

function listPracticeRecords() {
  return read(STORAGE_KEYS.practiceRecords, []);
}

function addPracticeRecord(record) {
  const check = validator.validatePracticeRecord(record);
  if (!check.valid) {
    throw new Error(check.errors.join('; '));
  }

  const nextRecord = Object.assign({ is_synced: false }, record);
  const records = [nextRecord].concat(listPracticeRecords()).slice(0, 1000);
  return write(STORAGE_KEYS.practiceRecords, records);
}

function updatePracticeRecord(recordId, patch) {
  const records = listPracticeRecords().map((record) => (
    record.record_id === recordId ? Object.assign({}, record, patch) : record
  ));
  return write(STORAGE_KEYS.practiceRecords, records);
}

function removePracticeRecord(recordId) {
  return write(STORAGE_KEYS.practiceRecords, listPracticeRecords().filter((record) => record.record_id !== recordId));
}

function clearPracticeRecords() {
  return write(STORAGE_KEYS.practiceRecords, []);
}

function listCustomCourses() {
  return read(STORAGE_KEYS.customCourses, []);
}

function getCustomCourse(courseId) {
  return listCustomCourses().find((course) => course.course_id === courseId) || null;
}

function saveCustomCourse(course) {
  const check = validator.validateCourse(course);
  if (!check.valid) {
    throw new Error(check.errors.join('; '));
  }

  const nextCourse = Object.assign({
    course_id: createId('course'),
    created_time: Date.now(),
    is_synced: false,
    source: 'import'
  }, course, {
    sentence_count: course.sentences.length
  });

  const withoutOld = listCustomCourses().filter((item) => item.course_id !== nextCourse.course_id);
  const courses = [nextCourse].concat(withoutOld).slice(0, 50);
  write(STORAGE_KEYS.customCourses, courses);
  return nextCourse;
}

function removeCustomCourse(courseId) {
  return write(STORAGE_KEYS.customCourses, listCustomCourses().filter((course) => course.course_id !== courseId));
}

function clearCustomCourses() {
  return write(STORAGE_KEYS.customCourses, []);
}

function getAppConfig() {
  return Object.assign({}, DEFAULT_CONFIG, read(STORAGE_KEYS.appConfig, {}));
}

function saveAppConfig(patch) {
  return write(STORAGE_KEYS.appConfig, Object.assign({}, getAppConfig(), patch));
}

function resetAppConfig() {
  return write(STORAGE_KEYS.appConfig, DEFAULT_CONFIG);
}

function setTempWrongQuestions(questions) {
  return write(STORAGE_KEYS.tempWrongQuestions, Array.isArray(questions) ? questions : []);
}

function getTempWrongQuestions() {
  return read(STORAGE_KEYS.tempWrongQuestions, []);
}

function clearTempWrongQuestions() {
  return remove(STORAGE_KEYS.tempWrongQuestions);
}

function clearAll() {
  Object.keys(STORAGE_KEYS).forEach((key) => remove(STORAGE_KEYS[key]));
  initStorage();
}

module.exports = {
  STORAGE_KEYS,
  DEFAULT_CONFIG,
  initStorage,
  getUserInfo,
  saveUserInfo,
  clearUserInfo,
  listPracticeRecords,
  addPracticeRecord,
  updatePracticeRecord,
  removePracticeRecord,
  clearPracticeRecords,
  listCustomCourses,
  getCustomCourse,
  saveCustomCourse,
  removeCustomCourse,
  clearCustomCourses,
  getAppConfig,
  saveAppConfig,
  resetAppConfig,
  setTempWrongQuestions,
  getTempWrongQuestions,
  clearTempWrongQuestions,
  clearAll
};
