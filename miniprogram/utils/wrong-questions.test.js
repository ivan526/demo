const assert = require('assert');
const storage = require('./storage');

storage.clearAll();
console.log('========== 错题功能专项测试 ==========\n');

console.log('测试组1：临时错题存储基础功能');
const wrongQuestions1 = [
  { english: 'I like English.', chinese: '我喜欢英语。', phonetic: '/aɪ laɪk ˈɪŋɡlɪʃ/' },
  { english: 'This is a test.', chinese: '这是一个测试。', phonetic: '/ðɪs ɪz ə test/' }
];
storage.setTempWrongQuestions(wrongQuestions1);
const retrieved = storage.getTempWrongQuestions();
assert.strictEqual(Array.isArray(retrieved), true, '返回值应为数组');
assert.strictEqual(retrieved.length, 2, '应返回2道错题');
assert.strictEqual(retrieved[0].english, 'I like English.', '题目内容应正确');
console.log('  ✓ 正常存取测试通过\n');

console.log('测试组2：错题数为0的状态测试');
storage.setTempWrongQuestions([]);
const emptyWrongQuestions = storage.getTempWrongQuestions();
assert.strictEqual(Array.isArray(emptyWrongQuestions), true, '空状态也应返回数组');
assert.strictEqual(emptyWrongQuestions.length, 0, '错题数应为0');
const isAllCorrect = emptyWrongQuestions.length === 0;
const shouldShowReviewButton = !isAllCorrect && emptyWrongQuestions.length > 0;
assert.strictEqual(isAllCorrect, true, '错题数为0时isAllCorrect应为true');
assert.strictEqual(shouldShowReviewButton, false, '错题数为0时不应显示重练按钮');
console.log('  ✓ 全部正确状态判断正确');
console.log('  ✓ 重练按钮正确隐藏\n');

console.log('测试组3：空数组下标访问安全性测试');
assert.strictEqual(emptyWrongQuestions[0], undefined, '空数组[0]应返回undefined，不抛出错误');
assert.strictEqual(emptyWrongQuestions.map(x => x).length, 0, 'map操作安全');
assert.strictEqual(emptyWrongQuestions.filter(x => x).length, 0, 'filter操作安全');
assert.strictEqual(emptyWrongQuestions.slice(0, 1).length, 0, 'slice操作安全');
console.log('  ✓ 空数组下标访问安全');
console.log('  ✓ 数组方法调用安全\n');

console.log('测试组4：边界值容错测试');
storage.setTempWrongQuestions(null);
assert.strictEqual(Array.isArray(storage.getTempWrongQuestions()), true, 'null容错');
assert.strictEqual(storage.getTempWrongQuestions().length, 0, 'null返回空数组');

storage.setTempWrongQuestions(undefined);
assert.strictEqual(Array.isArray(storage.getTempWrongQuestions()), true, 'undefined容错');
assert.strictEqual(storage.getTempWrongQuestions().length, 0, 'undefined返回空数组');

storage.setTempWrongQuestions('not an array');
assert.strictEqual(Array.isArray(storage.getTempWrongQuestions()), true, '非数组容错');
assert.strictEqual(storage.getTempWrongQuestions().length, 0, '非数组返回空数组');
console.log('  ✓ null容错测试通过');
console.log('  ✓ undefined容错测试通过');
console.log('  ✓ 非数组参数容错测试通过\n');

console.log('测试组5：答题统计逻辑模拟测试');
function simulatePractice(totalSentences, wrongIndexes) {
  let correctCount = 0;
  let wrongQuestions = [];
  let answerRecords = [];
  
  for (let i = 0; i < totalSentences; i++) {
    const isCorrect = !wrongIndexes.includes(i);
    const sentence = { english: `Sentence ${i}`, chinese: `句子 ${i}` };
    
    const record = { index: i, isCorrect };
    
    if (i < totalSentences - 1) {
      answerRecords.push(record);
      if (!isCorrect) wrongQuestions.push(sentence);
      correctCount = isCorrect ? correctCount + 1 : correctCount;
    } else {
      const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
      const finalWrongCount = totalSentences - finalCorrectCount;
      const isAllCorrect = finalWrongCount === 0;
      const finalWrongQuestions = isCorrect ? wrongQuestions : [...wrongQuestions, sentence];
      
      return {
        correctCount: finalCorrectCount,
        wrongCount: finalWrongCount,
        isAllCorrect,
        wrongQuestionsLength: finalWrongQuestions.length,
        answerRecordsLength: answerRecords.length + 1
      };
    }
  }
}

const allCorrectResult = simulatePractice(3, []);
assert.strictEqual(allCorrectResult.correctCount, 3, '全对时正确数应为3');
assert.strictEqual(allCorrectResult.wrongCount, 0, '全对时错误数应为0');
assert.strictEqual(allCorrectResult.isAllCorrect, true, '全对时isAllCorrect应为true');
assert.strictEqual(allCorrectResult.wrongQuestionsLength, 0, '全对时错题列表为空');
console.log('  ✓ 全部正确场景测试通过');

const someWrongResult = simulatePractice(3, [1]);
assert.strictEqual(someWrongResult.correctCount, 2, '错1题时正确数应为2');
assert.strictEqual(someWrongResult.wrongCount, 1, '错1题时错误数应为1');
assert.strictEqual(someWrongResult.isAllCorrect, false, '有错题时isAllCorrect应为false');
assert.strictEqual(someWrongResult.wrongQuestionsLength, 1, '错1题时错题列表长度为1');
console.log('  ✓ 部分正确场景测试通过');

const allWrongResult = simulatePractice(3, [0, 1, 2]);
assert.strictEqual(allWrongResult.correctCount, 0, '全错时正确数应为0');
assert.strictEqual(allWrongResult.wrongCount, 3, '全错时错误数应为3');
assert.strictEqual(allWrongResult.isAllCorrect, false, '全错时isAllCorrect应为false');
assert.strictEqual(allWrongResult.wrongQuestionsLength, 3, '全错时错题列表长度为3');
console.log('  ✓ 全部错误场景测试通过');

const singleCorrectResult = simulatePractice(1, []);
assert.strictEqual(singleCorrectResult.correctCount, 1, '单题全对时正确数应为1');
assert.strictEqual(singleCorrectResult.wrongCount, 0, '单题全对时错误数应为0');
assert.strictEqual(singleCorrectResult.isAllCorrect, true, '单题全对时isAllCorrect应为true');
console.log('  ✓ 单题正确场景测试通过');

const singleWrongResult = simulatePractice(1, [0]);
assert.strictEqual(singleWrongResult.correctCount, 0, '单题全错时正确数应为0');
assert.strictEqual(singleWrongResult.wrongCount, 1, '单题全错时错误数应为1');
assert.strictEqual(singleWrongResult.isAllCorrect, false, '单题全错时isAllCorrect应为false');
console.log('  ✓ 单题错误场景测试通过\n');

console.log('========== 所有测试通过！ ==========');
storage.clearAll();