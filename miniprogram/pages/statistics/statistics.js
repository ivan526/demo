const storage = require('../../utils/storage');
const format = require('../../utils/format');

function calculateStats(records) {
  const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
  const totalAccuracy = records.length
    ? Math.round(records.reduce((sum, record) => sum + (record.accuracy || 0), 0) / records.length)
    : 0;
  const bestCombo = records.reduce((max, record) => Math.max(max, record.max_combo || 0), 0);
  const activeDays = new Set(records.map((record) => format.formatDate(record.practice_time))).size;

  return {
    totalDuration: format.formatDuration(totalDuration),
    totalAccuracy: format.formatAccuracy(totalAccuracy),
    bestCombo: format.formatNumber(bestCombo),
    activeDays: format.formatNumber(activeDays),
    recentDays: format.buildRecentDays(records, 7),
    records: records.slice(0, 20).map((record) => Object.assign({}, record, {
      displayTime: format.formatDateTime(record.practice_time),
      displayDuration: format.formatDuration(record.duration),
      displayAccuracy: format.formatAccuracy(record.accuracy)
    }))
  };
}

Page({
  data: {
    stats: calculateStats([])
  },

  onShow() {
    this.setData({
      stats: calculateStats(storage.listPracticeRecords())
    });
  }
});
