const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) return { code: 4011, message: '未授权或登录过期', data: null };

    const statsRes = await db.collection('user_stats').where({ _openid: OPENID }).limit(1).get();
    let stats = statsRes.data && statsRes.data[0];
    if (!stats) {
      stats = {
        total_practice_time: 0,
        total_correct: 0,
        total_sentences: 0,
        max_combo: 0,
        continuous_days: 0,
        last_practice_date: null,
      };
    }

    const totalAccuracy = stats.total_sentences > 0
      ? Math.round((stats.total_correct / stats.total_sentences) * 10000) / 100
      : 0;

    const days = event.days || 7;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const recordsRes = await db.collection('user_practice_records')
      .where({
        _openid: OPENID,
        practice_time: _.gte(since),
      })
      .orderBy('practice_time', 'asc')
      .limit(1000)
      .get();

    const dailyMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      dailyMap[formatDate(d)] = 0;
    }
    for (const r of (recordsRes.data || [])) {
      const key = formatDate(new Date(r.practice_time));
      if (dailyMap[key] !== undefined) {
        dailyMap[key] += r.duration;
      }
    }
    const recentDays = Object.keys(dailyMap).map((date) => ({ date, duration: dailyMap[date] }));

    return {
      code: 0,
      message: 'success',
      data: {
        total_practice_time: stats.total_practice_time,
        total_accuracy: totalAccuracy,
        max_combo: stats.max_combo,
        continuous_days: stats.continuous_days,
        last_practice_date: stats.last_practice_date,
        recent_days: recentDays,
      },
    };
  } catch (err) {
    console.error('[getUserStats error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
