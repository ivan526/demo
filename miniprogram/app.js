const storage = require('./utils/storage');

App({
  globalData: {
    appName: '英语敲敲练',
    networkAvailable: true
  },

  onLaunch() {
    storage.initStorage();
    this.watchNetwork();
  },

  watchNetwork() {
    if (typeof wx === 'undefined' || !wx.getNetworkType || !wx.onNetworkStatusChange) {
      return;
    }

    wx.getNetworkType({
      success: ({ networkType }) => {
        this.globalData.networkAvailable = networkType !== 'none';
      }
    });

    wx.onNetworkStatusChange(({ isConnected }) => {
      this.globalData.networkAvailable = isConnected;
    });
  }
});
