function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${pad(minutes % 60)}分`;
  }

  return `${minutes}分${pad(restSeconds)}秒`;
}

function formatAccuracy(value) {
  const number = Math.max(0, Math.min(100, Number(value) || 0));
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

function formatDate(timestamp, separator) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const sep = separator || '-';
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(sep);
}

function formatDateTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return `${formatDate(date.getTime())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatNumber(value, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return fallback || '0';
  }
  if (number >= 10000) {
    return `${(number / 10000).toFixed(1)}万`;
  }
  return String(number);
}

function buildRecentDays(records, days) {
  const count = days || 7;
  const today = new Date();
  const result = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = formatDate(date.getTime());
    const duration = records
      .filter((record) => formatDate(record.practice_time) === key)
      .reduce((sum, record) => sum + (Number(record.duration) || 0), 0);

    result.push({ date: key.slice(5), duration });
  }

  return result;
}

module.exports = {
  formatDuration,
  formatAccuracy,
  formatDate,
  formatDateTime,
  formatNumber,
  buildRecentDays
};
