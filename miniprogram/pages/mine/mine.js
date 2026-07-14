const storage = require('../../utils/storage');

Page({
  data: {
    userInfo: null,
    config: {},
    loginDialogVisible: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({
      userInfo: storage.getUserInfo(),
      config: storage.getAppConfig()
    });
  },

  openLoginDialog() {
    this.setData({ loginDialogVisible: true });
  },

  closeLoginDialog() {
    this.setData({ loginDialogVisible: false });
  },

  confirmLogin() {
    if (!wx.login) {
      return;
    }

    wx.login({
      success: ({ code }) => {
        storage.saveUserInfo({
          is_login: true,
          nickname: '微信用户',
          token: code
        });
        this.setData({ loginDialogVisible: false });
        this.refresh();
      }
    });
  },

  toggleSound(event) {
    storage.saveAppConfig({ sound_enabled: event.detail.value });
    this.refresh();
  },

  toggleAutoNext(event) {
    storage.saveAppConfig({ auto_next: event.detail.value });
    this.refresh();
  }
});
