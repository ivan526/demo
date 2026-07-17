const builtin = require('../../config/courses');
const storage = require('../../utils/storage');
const format = require('../../utils/format');

function findCourse(courseId, source) {
  if (source === 'custom') {
    return storage.getCustomCourse(courseId);
  }
  if (source === 'wrongReview') {
    const wrongQuestions = storage.getTempWrongQuestions();
    storage.clearTempWrongQuestions();
    if (Array.isArray(wrongQuestions) && wrongQuestions.length > 0) {
      return {
        course_id: `wrong_review_${Date.now()}`,
        course_name: '错题回顾',
        sentences: wrongQuestions
      };
    }
    return null;
  }
  return builtin.builtinCourses.find((course) => course.course_id === courseId) || null;
}

Page({
  data: {
    course: null,
    currentIndex: 0,
    currentSentence: null,
    progressText: '0/0',
    accuracy: 100,
    combo: 0,
    bestCombo: 0,
    correctCount: 0,
    totalChars: 0,
    totalErrorChars: 0,
    startedAt: 0,
    completed: false,
    resultText: '',
    currentUserInput: '',
    answerRecords: [],
    wrongQuestions: [],
    totalSentences: 0,
    wrongCount: 0,
    isAllCorrect: false,
    isWrongReviewMode: false,
    currentSentenceHadError: false
  },

  onLoad(query) {
    const isWrongReviewMode = query.source === 'wrongReview';
    const course = findCourse(query.courseId, query.source);
    if (!course) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      return;
    }
    this.startCourse(course, isWrongReviewMode);
  },

  startCourse(course, isWrongReviewMode) {
    if (!course || !Array.isArray(course.sentences) || course.sentences.length === 0) {
      wx.showToast({ title: '课程数据异常', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
      return;
    }
    const currentSentence = course.sentences[0];
    this.setData({
      course,
      currentIndex: 0,
      currentSentence,
      progressText: `1/${course.sentences.length}`,
      accuracy: 100,
      combo: 0,
      bestCombo: 0,
      correctCount: 0,
      totalChars: 0,
      totalErrorChars: 0,
      startedAt: Date.now(),
      completed: false,
      resultText: '',
      currentUserInput: '',
      answerRecords: [],
      wrongQuestions: [],
      totalSentences: course.sentences.length,
      wrongCount: 0,
      isAllCorrect: false,
      isWrongReviewMode: isWrongReviewMode || false,
      currentSentenceHadError: false
    });
  },

  onSentenceInput(event) {
    const result = (event && event.detail && event.detail.result) || {};
    const value = (event && event.detail && event.detail.value) || '';
    const accuracy = typeof result.accuracy === 'number' ? result.accuracy : 0;
    const hasWrong = Array.isArray(result.wrongIndexes) && result.wrongIndexes.length > 0;

    const patch = { accuracy, currentUserInput: value };
    if (hasWrong && !this.data.currentSentenceHadError) {
      patch.currentSentenceHadError = true;
      patch.combo = 0;
      patch.bestCombo = Math.max(this.data.bestCombo, 0);
    }
    this.setData(patch);
  },

  onSentenceComplete(event) {
    const nextIndex = this.data.currentIndex + 1;
    const currentSentence = this.data.currentSentence;
    const result = (event && event.detail && event.detail.result) || { accuracy: 0, wrongIndexes: [] };
    const userInput = event && event.detail ? event.detail.value : this.data.currentUserInput;
    const sentenceLength = currentSentence.english.length;
    const currentAccuracy = typeof result.accuracy === 'number' ? result.accuracy : 0;
    const errorChars = Math.round(sentenceLength * (1 - currentAccuracy / 100));
    const finalHadError = this.data.currentSentenceHadError
      || (Array.isArray(result.wrongIndexes) && result.wrongIndexes.length > 0);
    const isCorrect = !finalHadError && currentAccuracy === 100;

    const combo = isCorrect ? this.data.combo + 1 : 0;
    const bestCombo = Math.max(this.data.bestCombo, combo);

    const record = {
      index: this.data.currentIndex,
      chinese: currentSentence.chinese,
      phonetic: currentSentence.phonetic,
      english: currentSentence.english,
      userInput,
      isCorrect,
      accuracy: currentAccuracy
    };

    if (nextIndex >= this.data.course.sentences.length) {
      this.finishPractice(combo, bestCombo, record, isCorrect, sentenceLength, errorChars);
      return;
    }

    const answerRecords = [...this.data.answerRecords, record];
    const wrongQuestions = isCorrect
      ? this.data.wrongQuestions
      : [...this.data.wrongQuestions, currentSentence];
    const newCorrectCount = isCorrect ? this.data.correctCount + 1 : this.data.correctCount;

    this.setData({
      totalChars: this.data.totalChars + sentenceLength,
      totalErrorChars: this.data.totalErrorChars + errorChars,
      answerRecords,
      wrongQuestions,
      currentIndex: nextIndex,
      currentSentence: this.data.course.sentences[nextIndex],
      progressText: `${nextIndex + 1}/${this.data.course.sentences.length}`,
      combo,
      bestCombo,
      correctCount: newCorrectCount,
      accuracy: 100,
      currentUserInput: '',
      currentSentenceHadError: false
    });

    const input = this.selectComponent('#sentenceInput');
    if (input) {
      input.clear();
    }
  },

  finishPractice(combo, bestCombo, lastRecord, lastIsCorrect, lastSentenceLength, lastErrorChars) {
    const total = this.data.course.sentences.length;
    const correctCount = lastIsCorrect ? this.data.correctCount + 1 : this.data.correctCount;
    const wrongCount = total - correctCount;
    const isAllCorrect = wrongCount === 0;
    const duration = Math.max(1, Math.round((Date.now() - this.data.startedAt) / 1000));

    const totalChars = this.data.totalChars + lastSentenceLength;
    const totalErrorChars = this.data.totalErrorChars + lastErrorChars;

    const finalAccuracy = totalChars > 0
      ? Math.round(((totalChars - totalErrorChars) / totalChars) * 100)
      : 100;

    storage.addPracticeRecord({
      record_id: `record_${Date.now()}`,
      course_id: this.data.course.course_id,
      course_name: this.data.course.course_name,
      total_sentences: total,
      correct_count: correctCount,
      accuracy: finalAccuracy,
      max_combo: bestCombo,
      duration,
      practice_time: new Date().toISOString()
    });

    const currentSentence = this.data.currentSentence;
    const finalAnswerRecords = [...this.data.answerRecords, lastRecord];
    const finalWrongQuestions = lastIsCorrect
      ? this.data.wrongQuestions
      : [...this.data.wrongQuestions, currentSentence];

    this.setData({
      combo,
      bestCombo,
      correctCount,
      totalChars,
      totalErrorChars,
      wrongCount,
      isAllCorrect,
      answerRecords: finalAnswerRecords,
      wrongQuestions: finalWrongQuestions,
      formattedAccuracy: format.formatAccuracy(finalAccuracy),
      completed: true,
      resultText: `完成 ${total} 句，正确率 ${format.formatAccuracy(finalAccuracy)}，用时 ${format.formatDuration(duration)}。`
    });
  },

  restart() {
    this.startCourse(this.data.course, this.data.isWrongReviewMode);
  },

  reviewWrongQuestions() {
    const wrongQuestions = this.data.wrongQuestions;
    if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
      wx.showToast({ title: '没有需要复习的错题', icon: 'none' });
      return;
    }

    storage.setTempWrongQuestions(wrongQuestions);
    wx.redirectTo({
      url: '/pages/practice/practice?courseId=wrong_review&source=wrongReview'
    });
  },

  backToCourses() {
    wx.switchTab({ url: '/pages/course/course' });
  }
});
