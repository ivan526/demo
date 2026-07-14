const builtin = require('../../config/courses');
const storage = require('../../utils/storage');

Page({
  data: {
    activeTab: 'builtin',
    builtinCourses: [],
    customCourses: []
  },

  onShow() {
    this.setData({
      builtinCourses: builtin.builtinCourses,
      customCourses: storage.listCustomCourses()
    });
  },

  switchTab(event) {
    this.setData({
      activeTab: event.currentTarget.dataset.tab
    });
  },

  onCourseSelect(event) {
    const course = event.detail.course;
    const source = course.source ? 'custom' : 'builtin';
    wx.navigateTo({
      url: `/pages/practice/practice?courseId=${course.course_id}&source=${source}`
    });
  }
});
