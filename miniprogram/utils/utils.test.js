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

console.log('utils tests passed');
