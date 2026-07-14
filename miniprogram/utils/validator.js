function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function validateSentence(sentence, index) {
  const errors = [];
  const prefix = typeof index === 'number' ? `第${index + 1}句` : '句子';

  if (!isPlainObject(sentence)) {
    return [`${prefix}必须是对象`];
  }

  ['english', 'chinese', 'phonetic'].forEach((field) => {
    if (!normalizeText(sentence[field])) {
      errors.push(`${prefix}缺少${field}字段`);
    }
  });

  if (normalizeText(sentence.english).length > 300) {
    errors.push(`${prefix}英文句子过长`);
  }

  return errors;
}

function validateCourse(course) {
  const errors = [];

  if (!isPlainObject(course)) {
    return ['课程数据必须是对象'];
  }

  if (!normalizeText(course.course_name)) {
    errors.push('课程名称不能为空');
  }

  if (!['easy', 'medium', 'hard'].includes(course.difficulty)) {
    errors.push('课程难度必须是 easy、medium 或 hard');
  }

  if (!Array.isArray(course.sentences) || course.sentences.length === 0) {
    errors.push('课程至少需要包含1个句子');
  } else {
    course.sentences.forEach((sentence, index) => {
      errors.push(...validateSentence(sentence, index));
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateImportedJson(raw) {
  try {
    const course = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const result = validateCourse(course);
    return {
      valid: result.valid,
      data: result.valid ? course : null,
      errors: result.errors
    };
  } catch (error) {
    return {
      valid: false,
      data: null,
      errors: ['JSON格式错误，请检查括号、逗号和引号']
    };
  }
}

function validatePracticeRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    return { valid: false, errors: ['练习记录必须是对象'] };
  }

  ['record_id', 'course_id', 'course_name'].forEach((field) => {
    if (!normalizeText(record[field])) {
      errors.push(`练习记录缺少${field}字段`);
    }
  });

  ['total_sentences', 'correct_count', 'accuracy', 'max_combo', 'duration', 'practice_time'].forEach((field) => {
    if (typeof record[field] !== 'number' || Number.isNaN(record[field])) {
      errors.push(`${field}必须是数字`);
    }
  });

  if (record.accuracy < 0 || record.accuracy > 100) {
    errors.push('accuracy必须在0到100之间');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function compareInput(input, target) {
  const inputText = String(input || '');
  const targetText = String(target || '');
  const chars = targetText.split('').map((char, index) => {
    const typed = inputText[index] || '';
    const status = !typed ? 'pending' : typed === char ? 'correct' : 'wrong';
    return { char, typed, status };
  });
  const wrongIndexes = chars
    .map((item, index) => (item.status === 'wrong' ? index : -1))
    .filter((index) => index >= 0);

  return {
    chars,
    wrongIndexes,
    completed: inputText === targetText,
    accuracy: targetText.length ? Math.round(((targetText.length - wrongIndexes.length) / targetText.length) * 100) : 0
  };
}

module.exports = {
  normalizeText,
  validateSentence,
  validateCourse,
  validateImportedJson,
  validatePracticeRecord,
  compareInput
};
