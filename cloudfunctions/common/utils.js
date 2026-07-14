function validateRequired(obj, fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      return field;
    }
  }
  return null;
}

function isValidDifficulty(d) {
  return d === 'easy' || d === 'medium' || d === 'hard';
}

function isValidSource(s) {
  return s === 'ai' || s === 'import' || s === 'builtin';
}

module.exports = { validateRequired, isValidDifficulty, isValidSource };
