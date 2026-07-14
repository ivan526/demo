const courses = require('../../config/courses');
const storage = require('../../utils/storage');
const format = require('../../utils/format');

Page({
  data: {
    recommendedCourses: [],
    stats: {
      totalDuration: '0分00秒',
      practiceCount: '0',
      bestCombo: '0'
    }
  },

  onShow() {
    const records = storage.listPracticeRecords();
    const totalDuration = records.reduce((sum, record) => sum + record.duration, 0);
    const bestCombo = records.reduce((max, record) => Math.max(max, record.max_combo || 0), 0);

    this.setData({
      recommendedCourses: courses.builtinCourses.slice(0, 2),
      stats: {
        totalDuration: format.formatDuration(totalDuration),
        practiceCount: format.formatNumber(records.length),
        bestCombo: format.formatNumber(bestCombo)
      }
    });
  },

  onCourseSelect(event) {
    const courseId = event.detail.course.course_id;
    wx.navigateTo({
      url: `/pages/practice/practice?courseId=${courseId}&source=builtin`
    });
  },

  goCourse() {
    wx.switchTab({ url: '/pages/course/course' });
  }
});
