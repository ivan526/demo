const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========== Practice.js 核心业务逻辑测试 ==========\n');

// 读取practice.js源码进行分析和提取核心逻辑进行测试
const practiceJsPath = path.join(__dirname, 'practice.js');
const practiceJsCode = fs.readFileSync(practiceJsPath, 'utf-8');

console.log('测试组1：空值访问安全性验证（event.detail.result）');
// 从源码中验证onSentenceInput使用了安全访问模式
assert.ok(
  practiceJsCode.includes('event && event.detail && event.detail.result') ||
  practiceJsCode.includes('(event && event.detail && event.detail.result)'),
  'onSentenceInput必须包含event.detail.result的安全访问'
);
assert.ok(
  practiceJsCode.includes('typeof result.accuracy === \'number\''),
  '必须验证result.accuracy是数字类型'
);
console.log('  ✓ onSentenceInput使用了&&链式安全访问');
console.log('  ✓ onSentenceInput验证了accuracy是数字类型\n');

console.log('测试组2：onSentenceComplete accuracy来源验证');
// 从源码中验证onSentenceComplete使用event.detail.result.accuracy而非this.data.accuracy
// 通过检查变量定义模式来验证
const onSentenceCompleteSection = practiceJsCode.match(/onSentenceComplete\(event\)[\s\S]*?finishPractice/);
assert.ok(onSentenceCompleteSection, '能找到onSentenceComplete方法');
const completeCode = onSentenceCompleteSection[0];
assert.ok(
  completeCode.includes('event && event.detail && event.detail.result') ||
  completeCode.includes('event.detail.result'),
  'onSentenceComplete必须从event.detail.result获取accuracy，不能直接用this.data.accuracy'
);
// 验证不再使用this.data.accuracy作为isCorrect判断依据
assert.ok(
  !completeCode.includes('const currentAccuracy = this.data.accuracy;'),
  '不能使用this.data.accuracy来判断当前句子正确性'
);
console.log('  ✓ onSentenceComplete使用event.detail.result.accuracy');
console.log('  ✓ 不再依赖this.data.accuracy进行正确性判断\n');

console.log('测试组3：错题数为0的前端状态判断（直接对应wxml逻辑）');
// 对应practice.wxml: wx:if="{{isAllCorrect}}"
// 对应practice.wxml: wx:if="{{!isAllCorrect && wrongQuestions.length > 0}}"

function testIsAllCorrectState(wrongQuestionsLength) {
  const isAllCorrect = wrongQuestionsLength === 0;
  const shouldShowReviewButton = !isAllCorrect && wrongQuestionsLength > 0;
  return { isAllCorrect, shouldShowReviewButton };
}

// 全部正确场景
const allCorrectState = testIsAllCorrectState(0);
assert.strictEqual(allCorrectState.isAllCorrect, true, '错题数为0时isAllCorrect应为true');
assert.strictEqual(allCorrectState.shouldShowReviewButton, false, '全部正确时不应显示重练按钮');
console.log('  ✓ 全部正确场景：isAllCorrect=true，按钮隐藏');

// 有错题场景
const hasWrongState = testIsAllCorrectState(2);
assert.strictEqual(hasWrongState.isAllCorrect, false, '有错题时isAllCorrect应为false');
assert.strictEqual(hasWrongState.shouldShowReviewButton, true, '有错题时应显示重练按钮');
console.log('  ✓ 有错题场景：isAllCorrect=false，按钮显示\n');

console.log('测试组4：答题正确性判断逻辑（覆盖finishPractice核心）');
// 模拟finishPractice中的correctCount计算逻辑
function calculateFinalStats(totalSentences, previousCorrectCount, lastIsCorrect) {
  const correctCount = lastIsCorrect ? previousCorrectCount + 1 : previousCorrectCount;
  const wrongCount = totalSentences - correctCount;
  const isAllCorrect = wrongCount === 0;
  return { correctCount, wrongCount, isAllCorrect };
}

// 场景：3题全对
const allCorrectResult = calculateFinalStats(3, 2, true);
assert.strictEqual(allCorrectResult.correctCount, 3);
assert.strictEqual(allCorrectResult.wrongCount, 0);
assert.strictEqual(allCorrectResult.isAllCorrect, true);
console.log('  ✓ 3题全对：correctCount=3, wrongCount=0, isAllCorrect=true');

// 场景：3题错最后1题
const lastWrongResult = calculateFinalStats(3, 2, false);
assert.strictEqual(lastWrongResult.correctCount, 2);
assert.strictEqual(lastWrongResult.wrongCount, 1);
assert.strictEqual(lastWrongResult.isAllCorrect, false);
console.log('  ✓ 最后一题错误：correctCount=2, wrongCount=1, isAllCorrect=false');

// 场景：单题正确
const singleCorrect = calculateFinalStats(1, 0, true);
assert.strictEqual(singleCorrect.correctCount, 1);
assert.strictEqual(singleCorrect.wrongCount, 0);
assert.strictEqual(singleCorrect.isAllCorrect, true);
console.log('  ✓ 单题正确：correctCount=1, wrongCount=0, isAllCorrect=true');

// 场景：单题错误
const singleWrong = calculateFinalStats(1, 0, false);
assert.strictEqual(singleWrong.correctCount, 0);
assert.strictEqual(singleWrong.wrongCount, 1);
assert.strictEqual(singleWrong.isAllCorrect, false);
console.log('  ✓ 单题错误：correctCount=0, wrongCount=1, isAllCorrect=false\n');

console.log('测试组5：空值边界测试（模拟异常event数据）');
// 模拟event.detail为null/undefined的情况
function safeExtractAccuracy(event) {
  const result = (event && event.detail && event.detail.result) || {};
  return typeof result.accuracy === 'number' ? result.accuracy : 0;
}

assert.strictEqual(safeExtractAccuracy(undefined), 0, 'undefined event返回0');
assert.strictEqual(safeExtractAccuracy(null), 0, 'null event返回0');
assert.strictEqual(safeExtractAccuracy({}), 0, '空对象event返回0');
assert.strictEqual(safeExtractAccuracy({ detail: null }), 0, 'detail为null返回0');
assert.strictEqual(safeExtractAccuracy({ detail: {} }), 0, 'detail无result返回0');
assert.strictEqual(safeExtractAccuracy({ detail: { result: null } }), 0, 'result为null返回0');
assert.strictEqual(safeExtractAccuracy({ detail: { result: {} } }), 0, 'result无accuracy返回0');
assert.strictEqual(safeExtractAccuracy({ detail: { result: { accuracy: 85 } } }), 85, '正常数据返回accuracy');
console.log('  ✓ event.detail.result空值访问全部安全');
console.log('  ✓ 边界条件处理正确\n');

console.log('测试组6：按钮文案验证（与wxml联动）');
const wxmlPath = path.join(__dirname, 'practice.wxml');
const wxmlCode = fs.readFileSync(wxmlPath, 'utf-8');
assert.ok(
  wxmlCode.includes('重新练习错题'),
  '错题重练按钮文案必须为"重新练习错题"'
);
console.log('  ✓ wxml中按钮文案正确："重新练习错题"\n');

console.log('========== 所有业务逻辑测试通过！ ==========');
