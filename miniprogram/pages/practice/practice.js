const builtin = require('../../config/courses');
const storage = require('../../utils/storage');
const format = require('../../utils/format');

function findCourse(courseId, source) {
  if (source === 'custom') {
    return storage.getCustomCourse(courseId);
  }
  return builtin.builtinCourses.find((course) => course.course_id === courseId) || builtin.builtinCourses[0];
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
    resultText: ''
  },

  onLoad(query) {
    const course = findCourse(query.courseId, query.source);
    this.startCourse(course);
  },

  startCourse(course) {
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
      resultText: ''
    });
  },

  onSentenceInput(event) {
    this.setData({
      accuracy: event.detail.result.accuracy
    });
  },

  onSentenceComplete() {
    const nextIndex = this.data.currentIndex + 1;
    const combo = this.data.combo + 1;
    const bestCombo = Math.max(this.data.bestCombo, combo);

    // 统计当前句子的字符数和错误字符数
    const currentSentence = this.data.currentSentence;
    const sentenceLength = currentSentence.english.length;
    const currentAccuracy = this.data.accuracy;
    const errorChars = Math.round(sentenceLength * (1 - currentAccuracy / 100));

    this.setData({
      totalChars: this.data.totalChars + sentenceLength,
      totalErrorChars: this.data.totalErrorChars + errorChars
    });

    if (nextIndex >= this.data.course.sentences.length) {
      // 最后一句，先统计再完成
      this.finishPractice(combo, bestCombo);
      return;
    }

    this.setData({
      currentIndex: nextIndex,
      currentSentence: this.data.course.sentences[nextIndex],
      progressText: `${nextIndex + 1}/${this.data.course.sentences.length}`,
      combo,
      bestCombo,
      correctCount: this.data.correctCount + 1,
      accuracy: 100
    });

    const input = this.selectComponent('#sentenceInput');
    if (input) {
      input.clear();
    }
  },

  finishPractice(combo, bestCombo) {
    const total = this.data.course.sentences.length;
    const correctCount = this.data.correctCount + 1;
    const duration = Math.max(1, Math.round((Date.now() - this.data.startedAt) / 1000));

    // 统计最后一句
    const currentSentence = this.data.currentSentence;
    const sentenceLength = currentSentence.english.length;
    const currentAccuracy = this.data.accuracy;
    const errorChars = Math.round(sentenceLength * (1 - currentAccuracy / 100));

    const totalChars = this.data.totalChars + sentenceLength;
    const totalErrorChars = this.data.totalErrorChars + errorChars;

    // 按字符计算真实正确率
    const accuracy = totalChars > 0 
      ? Math.round(((totalChars - totalErrorChars) / totalChars) * 100) 
      : 100;

    storage.addPracticeRecord({
      record_id: `record_${Date.now()}`,
      course_id: this.data.course.course_id,
      course_name: this.data.course.course_name,
      total_sentences: total,
      correct_count: correctCount,
      accuracy,
      max_combo: bestCombo,
      duration,
      practice_time: Date.now()
    });

    this.setData({
      combo,
      bestCombo,
      correctCount,
      totalChars,
      totalErrorChars,
      completed: true,
      resultText: `完成 ${total} 句，正确率 ${format.formatAccuracy(accuracy)}，用时 ${format.formatDuration(duration)}。`
    });
  },

  restart() {
    this.startCourse(this.data.course);
  },

  backToCourses() {
    wx.switchTab({ url: '/pages/course/course' });
  }
});
