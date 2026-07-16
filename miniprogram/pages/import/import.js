const validator = require('../../utils/validator');
const storage = require('../../utils/storage');

const courseTemplate = `{
  "course_name": "我的自定义课程",
  "description": "课程描述",
  "difficulty": "easy",
  "category": "自定义",
  "sentences": [
    {
      "english": "Hello world!",
      "chinese": "你好，世界！",
      "phonetic": "/həˈləʊ wɜːld/"
    }
  ]
}`;

Page({
  data: {
    jsonInput: '',
    template: courseTemplate,
    showTemplate: false,
    errorMessage: '',
    showSuccess: false
  },

  onInputChange(event) {
    this.setData({
      jsonInput: event.detail.value,
      errorMessage: ''
    });
  },

  showTemplateModal() {
    this.setData({ showTemplate: true });
  },

  hideTemplateModal() {
    this.setData({ showTemplate: false });
  },

  copyTemplate() {
    wx.setClipboardData({
      data: this.data.template,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  useTemplate() {
    this.setData({
      jsonInput: this.data.template,
      showTemplate: false
    });
  },

  clearInput() {
    this.setData({
      jsonInput: '',
      errorMessage: ''
    });
  },

  validateAndImport() {
    const jsonInput = this.data.jsonInput.trim();

    if (!jsonInput) {
      this.setData({ errorMessage: '请输入JSON内容' });
      return;
    }

    const result = validator.validateImportedJson(jsonInput);

    if (!result.valid) {
      this.setData({ errorMessage: result.errors.join('；') });
      return;
    }

    try {
      const course = result.data;
      storage.saveCustomCourse(course);
      
      this.setData({ showSuccess: true });
      
      setTimeout(() => {
        this.setData({ showSuccess: false });
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      this.setData({ errorMessage: error.message });
    }
  }
});
