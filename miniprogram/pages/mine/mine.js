const storage = require('../../utils/storage');
const request = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    config: {},
    loginDialogVisible: false,
    loggingIn: false
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
    if (this.data.loggingIn) return;
    this.setData({ loginDialogVisible: false });
  },

  confirmLogin() {
    if (this.data.loggingIn) return;
    if (!wx.login) {
      wx.showToast({ title: '当前环境不支持登录', icon: 'none' });
      return;
    }

    this.setData({ loggingIn: true });
    wx.login({
      success: ({ code }) => {
        if (!code) {
          this.setData({ loggingIn: false });
          wx.showToast({ title: '微信登录失败', icon: 'none' });
          return;
        }
        request.wxLogin(code).then((data) => {
          storage.saveUserInfo({
            is_login: true,
            token: data.token,
            openid: data.user_info.openid,
            nickname: data.user_info.nickname || '微信用户',
            avatar: data.user_info.avatar || ''
          });
          this.setData({ loginDialogVisible: false, loggingIn: false });
          this.refresh();
          wx.showToast({ title: '登录成功', icon: 'success' });
        }).catch((err) => {
          this.setData({ loggingIn: false });
          wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
        });
      },
      fail: () => {
        this.setData({ loggingIn: false });
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？本地数据不会删除。',
      success: (res) => {
        if (res.confirm) {
          storage.clearUserInfo();
          this.refresh();
        }
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
