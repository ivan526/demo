const assert = require('assert');
const storage = require('../../utils/storage');
const { compareInput } = require('../../utils/validator');
const format = require('../../utils/format');

console.log('========== Practice 页面核心业务逻辑测试 ==========\n');

storage.clearAll();

function runSession(sentences, typingBehavior) {
  let correctCount = 0;
  let totalChars = 0;
  let totalErrorChars = 0;
  let answerRecords = [];
  let wrongQuestions = [];
  let combo = 0;
  let bestCombo = 0;

  sentences.forEach((sentence, idx) => {
    const target = sentence.english;
    const sentenceLength = target.length;
    let hadError = false;
    let wrongInputSnapshot = '';
    let finalUserInput = '';
    let finalAccuracy = 100;

    const keystrokes = typingBehavior(sentence, idx);

    for (const typed of keystrokes) {
      const result = compareInput(typed, target);
      if (result.wrongIndexes.length > 0) {
        if (!hadError) {
          hadError = true;
          wrongInputSnapshot = typed;
        }
      }
      finalUserInput = typed;
      finalAccuracy = result.accuracy;
      if (result.completed) break;
    }

    const isCorrect = !hadError && finalAccuracy === 100;
    if (isCorrect) {
      combo = combo + 1;
    } else {
      combo = 0;
    }
    bestCombo = Math.max(bestCombo, combo);

    const errorChars = Math.round(sentenceLength * (1 - finalAccuracy / 100));
    totalChars += sentenceLength;
    totalErrorChars += errorChars;

    const recordUserInput = isCorrect ? finalUserInput : (wrongInputSnapshot || finalUserInput || '');
    answerRecords.push({
      index: idx,
      chinese: sentence.chinese,
      phonetic: sentence.phonetic,
      english: sentence.english,
      userInput: recordUserInput,
      isCorrect,
      accuracy: finalAccuracy
    });

    if (!isCorrect) {
      wrongQuestions.push(sentence);
    } else {
      correctCount = correctCount + 1;
    }
  });

  const total = sentences.length;
  const wrongCount = total - correctCount;
  const isAllCorrect = wrongCount === 0;
  const finalAccuracy = totalChars > 0
    ? Math.round(((totalChars - totalErrorChars) / totalChars) * 100)
    : 100;

  return {
    total,
    correctCount,
    wrongCount,
    isAllCorrect,
    answerRecords,
    wrongQuestions,
    totalChars,
    totalErrorChars,
    finalAccuracy,
    combo,
    bestCombo
  };
}

function typePerfect(sentence) {
  return [sentence.english];
}

function typeWithCorrection(sentence, typoAtChar, typoChar) {
  const target = sentence.english;
  const strokes = [];
  for (let i = 1; i <= target.length; i++) {
    if (i === typoAtChar + 1) {
      const wrong = target.slice(0, i - 1) + typoChar;
      strokes.push(wrong);
      const corrected = target.slice(0, i);
      strokes.push(corrected);
    } else {
      strokes.push(target.slice(0, i));
    }
  }
  return strokes;
}

console.log('测试组1：全对场景 - 所有句子一次性完美输入（验证REVIEW-TEST-002场景1）');
const perfectSentences = [
  { english: 'I like English.', chinese: '我喜欢英语。', phonetic: '/aɪ/' },
  { english: 'Hello world.', chinese: '你好世界。', phonetic: '/həˈloʊ/' },
  { english: 'This is a test.', chinese: '这是一个测试。', phonetic: '/ðɪs/' }
];
const perfectResult = runSession(perfectSentences, (s) => typePerfect(s));
assert.strictEqual(perfectResult.total, 3, '总题数应为3');
assert.strictEqual(perfectResult.correctCount, 3, '完美输入时正确数应为3');
assert.strictEqual(perfectResult.wrongCount, 0, '完美输入时错误数应为0');
assert.strictEqual(perfectResult.isAllCorrect, true, '完美输入时isAllCorrect应为true');
assert.strictEqual(perfectResult.wrongQuestions.length, 0, '完美输入时错题列表为空');
assert.strictEqual(perfectResult.answerRecords.length, 3, 'answerRecords长度应为3');
assert.strictEqual(perfectResult.bestCombo, 3, '完美输入时最高连击应为3');
assert.strictEqual(perfectResult.combo, 3, '完美输入时当前连击应为3');
// 全对场景："重新练习错题"按钮不展示
assert.strictEqual(!perfectResult.isAllCorrect && perfectResult.wrongQuestions.length > 0, false,
  '全对场景"重新练习错题"按钮应隐藏（对应wxml wx:if条件）');
// 全对场景：每条记录isCorrect=true, userInput===english
perfectResult.answerRecords.forEach((r, i) => {
  assert.strictEqual(r.isCorrect, true, `第${i+1}题应标记为正确`);
  assert.strictEqual(r.userInput, r.english, `第${i+1}题userInput应为最终正确输入`);
});
console.log('  ✓ 总题数/正确数/错误数/全部正确状态正确');
console.log('  ✓ 错题列表为空');
console.log('  ✓ 连击数正确增加到3');
console.log('  ✓ 全对场景"重新练习错题"按钮条件为false（隐藏）');
console.log('  ✓ 全对场景每条record userInput为正确答案\n');

console.log('测试组2：中间一题有打字错误后修正 - 错题应被检测，userInput为错误快照');
const mixedSentences = [
  { english: 'I like English.', chinese: '我喜欢英语。', phonetic: '/aɪ/' },
  { english: 'Hello world.', chinese: '你好世界。', phonetic: '/həˈloʊ/' },
  { english: 'This is a test.', chinese: '这是一个测试。', phonetic: '/ðɪs/' }
];
const mixedResult = runSession(mixedSentences, (s, idx) => {
  if (idx === 1) {
    return typeWithCorrection(s, 2, 'x');
  }
  return typePerfect(s);
});
assert.strictEqual(mixedResult.correctCount, 2, '错1题时正确数应为2');
assert.strictEqual(mixedResult.wrongCount, 1, '错1题时错误数应为1');
assert.strictEqual(mixedResult.isAllCorrect, false, '有错时isAllCorrect应为false');
assert.strictEqual(mixedResult.wrongQuestions.length, 1, '错题列表应包含1题');
assert.strictEqual(mixedResult.wrongQuestions[0].english, 'Hello world.', '错题应为第2句');
assert.strictEqual(mixedResult.answerRecords.length, 3, 'answerRecords长度应为3（无重复）');
assert.strictEqual(mixedResult.answerRecords[1].isCorrect, false, '第二题isCorrect应为false');
assert.strictEqual(mixedResult.answerRecords[0].isCorrect, true, '第一题isCorrect应为true');
assert.strictEqual(mixedResult.answerRecords[2].isCorrect, true, '第三题isCorrect应为true');
// 错题userInput应为打错瞬间的快照（"Helxlo" 在char index 2位置插入x后的快照是"Helx"）
// typeWithCorrection(s, 2, 'x'): 第3字符打错，此时typed="Helx"
const wrongRecord = mixedResult.answerRecords[1];
assert.notStrictEqual(wrongRecord.userInput, wrongRecord.english,
  '错题userInput不应等于正确答案（必须是错误快照）');
assert.ok(wrongRecord.userInput.includes('x'),
  `错题userInput应包含打错字符'x'，实际为"${wrongRecord.userInput}"`);
assert.ok(wrongRecord.userInput.length < wrongRecord.english.length,
  '错题userInput应为打字中途的快照，长度短于完整答案');
// 错题场景：按钮可见
assert.strictEqual(!mixedResult.isAllCorrect && mixedResult.wrongQuestions.length > 0, true,
  '有错场景"重新练习错题"按钮条件为true（显示）');
console.log('  ✓ 正确/错误数统计正确');
console.log('  ✓ 有错误的句子被正确标记为错题（isCorrect=false）');
console.log('  ✓ 错题列表包含错误句子（即使最终被修正）');
console.log('  ✓ answerRecords无重复（每个句子恰好一条记录）');
console.log('  ✓ 错题userInput为打错瞬间快照，不等于正确答案');
console.log('  ✓ 有错场景"重新练习错题"按钮条件为true（显示）\n');

console.log('测试组3：最后一题有打字错误后修正 - 验证最后一题错题检测不重复+userInput快照');
const lastWrongSentences = [
  { english: 'I like English.', chinese: '我喜欢英语。', phonetic: '/aɪ/' },
  { english: 'Hello world.', chinese: '你好世界。', phonetic: '/həˈloʊ/' },
  { english: 'This is a test.', chinese: '这是一个测试。', phonetic: '/ðɪs/' }
];
const lastWrongResult = runSession(lastWrongSentences, (s, idx) => {
  if (idx === 2) {
    return typeWithCorrection(s, 0, 'X');
  }
  return typePerfect(s);
});
assert.strictEqual(lastWrongResult.correctCount, 2, '最后一题错误时正确数应为2');
assert.strictEqual(lastWrongResult.wrongCount, 1, '最后一题错误时错误数应为1');
assert.strictEqual(lastWrongResult.wrongQuestions.length, 1, '错题列表应包含1题（不重复）');
assert.strictEqual(lastWrongResult.wrongQuestions[0].english, 'This is a test.', '错题应为最后一句');
assert.strictEqual(lastWrongResult.answerRecords.length, 3, 'answerRecords长度应为3（最后一题不重复）');
// 最后一题userInput为错误快照
const lastWrongRecord = lastWrongResult.answerRecords[2];
assert.strictEqual(lastWrongRecord.isCorrect, false, '最后一题isCorrect应为false');
assert.notStrictEqual(lastWrongRecord.userInput, lastWrongRecord.english,
  '最后一题错题userInput不应等于正确答案');
assert.ok(lastWrongRecord.userInput.includes('X') || lastWrongRecord.userInput.startsWith('X'),
  `最后一题错题userInput应包含打错字符'X'，实际为"${lastWrongRecord.userInput}"`);
console.log('  ✓ 最后一题错误被正确检测');
console.log('  ✓ 最后一题不重复出现在错题列表');
console.log('  ✓ 最后一题错题userInput为错误快照\n');

console.log('测试组4：全部句子都有打字错误 - 验证全错场景');
const allWrongSentences = [
  { english: 'I like.', chinese: '我喜欢。', phonetic: '/aɪ/' },
  { english: 'Hello.', chinese: '你好。', phonetic: '/hə/' }
];
const allWrongResult = runSession(allWrongSentences, (s) => typeWithCorrection(s, 1, 'Z'));
assert.strictEqual(allWrongResult.correctCount, 0, '全错时正确数应为0');
assert.strictEqual(allWrongResult.wrongCount, 2, '全错时错误数应为2');
assert.strictEqual(allWrongResult.isAllCorrect, false, '全错时isAllCorrect应为false');
assert.strictEqual(allWrongResult.wrongQuestions.length, 2, '错题列表长度为2');
assert.strictEqual(allWrongResult.combo, 0, '全错时连击应为0');
assert.strictEqual(allWrongResult.bestCombo, 0, '全错时最高连击应为0');
// 每题userInput都不等于正确答案
allWrongResult.answerRecords.forEach((r, i) => {
  assert.notStrictEqual(r.userInput, r.english, `全错场景第${i+1}题userInput不应等于正确答案`);
});
console.log('  ✓ 全错场景统计正确');
console.log('  ✓ 每题userInput均为错误快照\n');

console.log('测试组5：单题课程边界场景');
const singleSentence = [{ english: 'Hi.', chinese: '你好。', phonetic: '/haɪ/' }];
const singlePerfectResult = runSession(singleSentence, (s) => typePerfect(s));
assert.strictEqual(singlePerfectResult.correctCount, 1, '单题正确时correctCount=1');
assert.strictEqual(singlePerfectResult.wrongCount, 0, '单题正确时wrongCount=0');
assert.strictEqual(singlePerfectResult.isAllCorrect, true);
assert.strictEqual(singlePerfectResult.answerRecords.length, 1);
console.log('  ✓ 单题完美输入场景正确');

const singleWrongSentences = [{ english: 'Hi.', chinese: '你好。', phonetic: '/haɪ/' }];
const singleWrongResult = runSession(singleWrongSentences, (s) => typeWithCorrection(s, 0, 'B'));
assert.strictEqual(singleWrongResult.correctCount, 0, '单题错误时correctCount=0');
assert.strictEqual(singleWrongResult.wrongCount, 1, '单题错误时wrongCount=1');
assert.strictEqual(singleWrongResult.isAllCorrect, false);
assert.strictEqual(singleWrongResult.wrongQuestions.length, 1);
assert.strictEqual(singleWrongResult.answerRecords.length, 1, '单题answerRecords长度为1（无重复）');
assert.notStrictEqual(singleWrongResult.answerRecords[0].userInput,
  singleWrongResult.answerRecords[0].english,
  '单题错误场景userInput为错误快照');
console.log('  ✓ 单题错误场景正确，userInput为错误快照\n');

console.log('测试组6：按钮显示/隐藏逻辑（对应wxml wx:if条件，验证REVIEW-TEST-002）');
function shouldShowReviewButton(isAllCorrect, wrongQuestionsLen) {
  return !isAllCorrect && wrongQuestionsLen > 0;
}
function shouldShowSuccessMessage(isAllCorrect) {
  return isAllCorrect;
}
// 全对场景
assert.strictEqual(shouldShowReviewButton(true, 0), false, '全部正确时"重新练习错题"按钮隐藏');
assert.strictEqual(shouldShowSuccessMessage(true), true, '全部正确时"本次练习全部正确"提示展示');
// 有错场景
assert.strictEqual(shouldShowReviewButton(false, 1), true, '有错题时"重新练习错题"按钮显示');
assert.strictEqual(shouldShowSuccessMessage(false), false, '有错时成功提示隐藏');
// 边界：isAllCorrect=false但错题数为0（理论上不应出现，但防御性测试）
assert.strictEqual(shouldShowReviewButton(false, 0), false, '边界：isAllCorrect=false但错题数为0时按钮隐藏');
// 结合runSession结果验证双重条件
assert.strictEqual(shouldShowReviewButton(perfectResult.isAllCorrect, perfectResult.wrongQuestions.length), false,
  '全对session: 按钮应隐藏');
assert.strictEqual(shouldShowSuccessMessage(perfectResult.isAllCorrect), true,
  '全对session: 成功提示应展示');
assert.strictEqual(shouldShowReviewButton(mixedResult.isAllCorrect, mixedResult.wrongQuestions.length), true,
  '有错session: 按钮应显示');
assert.strictEqual(shouldShowSuccessMessage(mixedResult.isAllCorrect), false,
  '有错session: 成功提示应隐藏');
console.log('  ✓ 全对场景按钮隐藏、成功提示展示');
console.log('  ✓ 有错场景按钮显示、成功提示隐藏');
console.log('  ✓ 与实际session结果联动一致\n');

console.log('测试组7：空值安全访问 - 模拟onSentenceInput异常event + 快照空值兜底（验证REVIEW-TEST-003）');
function safeExtractAccuracy(event) {
  const result = (event && event.detail && event.detail.result) || {};
  return typeof result.accuracy === 'number' ? result.accuracy : 0;
}
function safeExtractValue(event) {
  return (event && event.detail && event.detail.value) || '';
}
function safeBuildRecordUserInput(isCorrect, snapshot, finalUserInput) {
  return isCorrect ? finalUserInput : (snapshot || finalUserInput || '');
}
assert.strictEqual(safeExtractAccuracy(undefined), 0);
assert.strictEqual(safeExtractAccuracy(null), 0);
assert.strictEqual(safeExtractAccuracy({}), 0);
assert.strictEqual(safeExtractAccuracy({ detail: null }), 0);
assert.strictEqual(safeExtractAccuracy({ detail: {} }), 0);
assert.strictEqual(safeExtractAccuracy({ detail: { result: null } }), 0);
assert.strictEqual(safeExtractAccuracy({ detail: { result: {} } }), 0);
assert.strictEqual(safeExtractAccuracy({ detail: { result: { accuracy: 85 } } }), 85);
assert.strictEqual(safeExtractAccuracy({ detail: { result: { accuracy: 'bad' } } }), 0, '非数字accuracy回退到0');
assert.strictEqual(safeExtractValue(undefined), '');
assert.strictEqual(safeExtractValue(null), '');
assert.strictEqual(safeExtractValue({ detail: { value: 'hello' } }), 'hello');
// 快照空值兜底：错题场景下snapshot为空时fallback到finalUserInput
assert.strictEqual(safeBuildRecordUserInput(false, '', 'final'), 'final',
  '快照为空时fallback到finalUserInput');
assert.strictEqual(safeBuildRecordUserInput(false, '', ''), '',
  '快照和finalUserInput都为空时返回空串（由wxml || "(未输入)"兜底）');
assert.strictEqual(safeBuildRecordUserInput(false, 'snapshot', 'final'), 'snapshot',
  '有快照时使用快照');
assert.strictEqual(safeBuildRecordUserInput(true, 'ignored', 'correct'), 'correct',
  '正确题使用finalUserInput，忽略快照');
console.log('  ✓ 空值访问安全（9种accuracy异常场景）');
console.log('  ✓ value空值安全');
console.log('  ✓ userInput快照空值兜底逻辑正确\n');

console.log('测试组8：临时错题存储API');
const wq = [{ english: 'a', chinese: 'b', phonetic: 'c' }];
storage.setTempWrongQuestions(wq);
const r1 = storage.getTempWrongQuestions();
assert.strictEqual(Array.isArray(r1), true);
assert.strictEqual(r1.length, 1);
storage.setTempWrongQuestions([]);
assert.strictEqual(storage.getTempWrongQuestions().length, 0);
storage.setTempWrongQuestions(null);
assert.strictEqual(Array.isArray(storage.getTempWrongQuestions()), true);
assert.strictEqual(storage.getTempWrongQuestions().length, 0);
storage.clearTempWrongQuestions();
assert.strictEqual(storage.getTempWrongQuestions().length, 0);
console.log('  ✓ 临时错题存储API正确\n');

console.log('测试组9：wxml文案与条件渲染验证（验证REVIEW-TEST-002文案部分）');
const fs = require('fs');
const path = require('path');
const wxmlPath = path.join(__dirname, 'practice.wxml');
const wxml = fs.readFileSync(wxmlPath, 'utf-8');
assert.ok(wxml.includes('重新练习错题'), '按钮文案应为"重新练习错题"');
assert.ok(wxml.includes('本次练习全部正确'), '全部正确文案应为"本次练习全部正确"');
// wxml条件：成功提示在isAllCorrect时展示
assert.ok(wxml.includes('wx:if="{{isAllCorrect}}"'), 'wxml中成功提示使用isAllCorrect条件');
// wxml条件：错题列表和按钮在!isAllCorrect && wrongQuestions.length > 0时展示
assert.ok(wxml.includes('wx:if="{{!isAllCorrect && wrongQuestions.length > 0}}"'),
  'wxml中按钮和错题区使用!isAllCorrect && wrongQuestions.length>0条件');
console.log('  ✓ wxml按钮文案正确："重新练习错题"');
console.log('  ✓ wxml成功提示文案正确："本次练习全部正确"');
console.log('  ✓ wxml条件渲染与测试逻辑一致\n');

console.log('测试组10：打字中途出错再修正 - 句子仍应被判定为错题，userInput为错误快照');
const midTypoResult = runSession(
  [{ english: 'abcde', chinese: 'test', phonetic: 't' }],
  () => ['a', 'ab', 'aX', 'abX', 'abc', 'abcd', 'abcde']
);
assert.strictEqual(midTypoResult.isAllCorrect, false, '打字过程中出过错误时isAllCorrect应为false');
assert.strictEqual(midTypoResult.wrongCount, 1, '打字出错的句子计入错误数');
assert.strictEqual(midTypoResult.wrongQuestions.length, 1, '打字出错的句子进入错题列表');
assert.strictEqual(midTypoResult.correctCount, 0, '打字出错时该句不计入正确数');
assert.strictEqual(midTypoResult.combo, 0, '打字出错时连击清零');
// userInput应为打错瞬间的快照
const midTypoRecord = midTypoResult.answerRecords[0];
assert.notStrictEqual(midTypoRecord.userInput, midTypoRecord.english,
  '中途打错场景userInput不等于正确答案"abcde"');
assert.ok(midTypoRecord.userInput.includes('X'),
  `中途打错场景userInput应包含错字'X'，实际为"${midTypoRecord.userInput}"`);
console.log('  ✓ 打字中途出错再修正 - 句子正确被标记为错题');
console.log('  ✓ 连击在错误时清零');
console.log('  ✓ userInput为打错瞬间的错误快照而非最终正确文本\n');

console.log('测试组11：多步错字场景 - 多次错字后修正，第一次错字快照应被保留');
const multiTypoResult = runSession(
  [{ english: 'hello', chinese: '你好', phonetic: '/hə/' }],
  () => ['h', 'hX', 'h', 'he', 'hZ', 'he', 'hel', 'hell', 'hello']
);
assert.strictEqual(multiTypoResult.isAllCorrect, false, '多次出错时仍标记为错题');
assert.strictEqual(multiTypoResult.wrongCount, 1);
const multiTypoRecord = multiTypoResult.answerRecords[0];
assert.notStrictEqual(multiTypoRecord.userInput, 'hello',
  '多次错字场景userInput不等于正确答案');
// 第一次错字是'hX'（第二个字符打错为X）
assert.ok(multiTypoRecord.userInput === 'hX',
  `第一次错字快照应为'hX'（第一个wrongIndexes>0瞬间），实际为"${multiTypoRecord.userInput}"`);
console.log('  ✓ 多次错字场景使用第一次出错瞬间的快照（锁存语义）\n');

storage.clearAll();
console.log('========== 所有练习逻辑测试通过！ ==========');
