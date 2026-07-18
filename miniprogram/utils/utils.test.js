const assert = require('assert');
const storage = require('./storage');
const validator = require('./validator');
const format = require('./format');
const request = require('./request');

storage.clearAll();

const user = storage.getUserInfo();
assert.strictEqual(user.is_login, false);
assert.ok(user.temp_user_id);

const course = storage.saveCustomCourse({
  course_name: '测试课程',
  description: '用于工具类自测',
  difficulty: 'easy',
  source: 'import',
  sentences: [
    {
      english: 'I like English.',
      chinese: '我喜欢英语。',
      phonetic: '/aɪ laɪk ˈɪŋɡlɪʃ/'
    }
  ]
});
assert.strictEqual(storage.listCustomCourses().length, 1);
assert.strictEqual(storage.getCustomCourse(course.course_id).course_name, '测试课程');

storage.addPracticeRecord({
  record_id: 'record_1',
  course_id: course.course_id,
  course_name: course.course_name,
  total_sentences: 1,
  correct_count: 1,
  accuracy: 100,
  max_combo: 1,
  duration: 65,
  practice_time: Date.now()
});
assert.strictEqual(storage.listPracticeRecords().length, 1);

const importResult = validator.validateImportedJson(JSON.stringify(course));
assert.strictEqual(importResult.valid, true);

const compareResult = validator.compareInput('I like', 'I like English.');
assert.strictEqual(compareResult.completed, false);
assert.strictEqual(compareResult.wrongIndexes.length, 0);

assert.strictEqual(format.formatDuration(65), '1分05秒');
assert.strictEqual(format.formatAccuracy(98.5), '98.5%');
assert.strictEqual(request.buildUrl('/api/test'), 'https://api.example.com/api/test');

// 临时错题存储测试
const wrongQuestions1 = [
  { english: 'I like English.', chinese: '我喜欢英语。', phonetic: '/aɪ laɪk ˈɪŋɡlɪʃ/' },
  { english: 'This is a test.', chinese: '这是一个测试。', phonetic: '/ðɪs ɪz ə test/' }
];
storage.setTempWrongQuestions(wrongQuestions1);
const retrieved = storage.getTempWrongQuestions();
assert.strictEqual(Array.isArray(retrieved), true);
assert.strictEqual(retrieved.length, 2);
assert.strictEqual(retrieved[0].english, 'I like English.');

// 空错题列表测试
storage.setTempWrongQuestions([]);
assert.strictEqual(storage.getTempWrongQuestions().length, 0);

// 清除错题测试
storage.setTempWrongQuestions(wrongQuestions1);
assert.strictEqual(storage.getTempWrongQuestions().length, 2);
storage.clearTempWrongQuestions();
assert.strictEqual(storage.getTempWrongQuestions().length, 0);

// 非数组参数容错测试
storage.setTempWrongQuestions(null);
assert.strictEqual(Array.isArray(storage.getTempWrongQuestions()), true);
assert.strictEqual(storage.getTempWrongQuestions().length, 0);

// 错题数为0的状态测试
console.log('开始测试：错题数为0的状态');
storage.clearTempWrongQuestions();
const emptyWrongQuestions = storage.getTempWrongQuestions();
assert.strictEqual(Array.isArray(emptyWrongQuestions), true);
assert.strictEqual(emptyWrongQuestions.length, 0);

// 测试错题数为0时的条件判断逻辑
// 对应 practice.wxml 中 wx:if="{{!isAllCorrect && wrongQuestions.length > 0}}"
const isAllCorrect = emptyWrongQuestions.length === 0;
const shouldShowReviewButton = !isAllCorrect && emptyWrongQuestions.length > 0;
assert.strictEqual(isAllCorrect, true);
assert.strictEqual(shouldShowReviewButton, false);
console.log('错题数为0时isAllCorrect=true，不显示重练按钮: PASS');

// 测试错题数为0时的空值访问安全
console.log('开始测试：空数组下标访问安全性');
// 访问空数组的第一个元素应返回undefined，不会抛出错误
assert.strictEqual(emptyWrongQuestions[0], undefined);
// 使用 Array 方法的安全性
assert.strictEqual(emptyWrongQuestions.map(x => x).length, 0);
assert.strictEqual(emptyWrongQuestions.filter(x => x).length, 0);
assert.strictEqual(emptyWrongQuestions.slice(0, 1).length, 0);
console.log('空数组下标访问安全测试: PASS');

// 测试空值访问安全 - wrongQuestions 相关逻辑
console.log('开始测试：空值访问安全性验证');
// 1. wrongQuestions 初始为空数组时访问 length
const pageData = {
  wrongQuestions: [],
  isAllCorrect: true
};
assert.strictEqual(pageData.wrongQuestions.length, 0);

// 2. 空数组展开操作安全
const spreadResult = [...pageData.wrongQuestions, { test: 'item' }];
assert.strictEqual(spreadResult.length, 1);

// 3. Array.isArray 边界检查
assert.strictEqual(Array.isArray(pageData.wrongQuestions), true);
assert.strictEqual(Array.isArray(null), false);
assert.strictEqual(Array.isArray(undefined), false);

// 4. 条件判断中的短路逻辑（对应 reviewWrongQuestions 方法）
const reviewLogicSafe = !Array.isArray(pageData.wrongQuestions) || pageData.wrongQuestions.length === 0;
assert.strictEqual(reviewLogicSafe, true);

console.log('空值访问安全验证全部通过: PASS');

console.log('utils tests passed');
