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

    const required = ['record_id', 'course_id', 'course_name', 'total_sentences', 'correct_count', 'accuracy', 'max_combo', 'duration', 'practice_time'];
    for (const f of required) {
      if (event[f] === undefined || event[f] === null) {
        return { code: 4001, message: `参数错误：${f} 不能为空`, data: null };
      }
    }

    const practiceTime = new Date(event.practice_time);
    const now = new Date();

    const record = {
      _openid: OPENID,
      record_id: event.record_id,
      course_id: event.course_id,
      course_name: event.course_name,
      total_sentences: event.total_sentences,
      correct_count: event.correct_count,
      accuracy: event.accuracy,
      max_combo: event.max_combo,
      duration: event.duration,
      practice_time: practiceTime,
      created_at: now,
    };

    const dup = await db.collection('user_practice_records')
      .where({ _openid: OPENID, record_id: event.record_id })
      .limit(1)
      .get();
    if (dup.data && dup.data.length > 0) {
      return { code: 0, message: 'success', data: { success: true, deduplicated: true } };
    }

    await db.collection('user_practice_records').add({ data: record });

    const statsCol = db.collection('user_stats');
    const existingStats = await statsCol.where({ _openid: OPENID }).limit(1).get();
    const practiceDate = formatDate(practiceTime);

    if (existingStats.data && existingStats.data.length > 0) {
      const stats = existingStats.data[0];
      let continuousDays = stats.continuous_days || 0;
      const lastDate = stats.last_practice_date;
      if (lastDate) {
        const last = new Date(lastDate + 'T00:00:00');
        const today = new Date(practiceDate + 'T00:00:00');
        const diffDays = Math.round((today - last) / (24 * 60 * 60 * 1000));
        if (diffDays === 1) {
          continuousDays += 1;
        } else if (diffDays > 1) {
          continuousDays = 1;
        }
      } else {
        continuousDays = 1;
      }

      await statsCol.doc(stats._id).update({
        data: {
          total_practice_time: _.inc(event.duration),
          total_correct: _.inc(event.correct_count),
          total_sentences: _.inc(event.total_sentences),
          max_combo: Math.max(stats.max_combo || 0, event.max_combo),
          continuous_days: continuousDays,
          last_practice_date: practiceDate,
          updated_at: now,
        },
      });
    } else {
      await statsCol.add({
        data: {
          _openid: OPENID,
          total_practice_time: event.duration,
          total_correct: event.correct_count,
          total_sentences: event.total_sentences,
          max_combo: event.max_combo,
          continuous_days: 1,
          last_practice_date: practiceDate,
          updated_at: now,
        },
      });
    }

    return { code: 0, message: 'success', data: { success: true } };
  } catch (err) {
    console.error('[uploadPracticeRecord error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
