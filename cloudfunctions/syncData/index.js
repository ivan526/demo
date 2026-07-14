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

async function upsertRecords(openid, records) {
  const results = [];
  for (const r of records || []) {
    if (!r.record_id) continue;
    const exists = await db.collection('user_practice_records')
      .where({ _openid: openid, record_id: r.record_id })
      .limit(1)
      .get();
    const practiceTime = r.practice_time ? new Date(r.practice_time) : new Date();
    const data = {
      _openid: openid,
      record_id: r.record_id,
      course_id: r.course_id,
      course_name: r.course_name,
      total_sentences: r.total_sentences,
      correct_count: r.correct_count,
      accuracy: r.accuracy,
      max_combo: r.max_combo,
      duration: r.duration,
      practice_time: practiceTime,
      created_at: new Date(),
    };
    if (exists.data && exists.data.length > 0) {
      results.push({ record_id: r.record_id, status: 'skipped' });
    } else {
      await db.collection('user_practice_records').add({ data });
      results.push({ record_id: r.record_id, status: 'added' });
    }
  }
  return results;
}

async function upsertCourses(openid, courses) {
  const results = [];
  for (const c of courses || []) {
    if (!c.course_id) continue;
    const exists = await db.collection('user_courses')
      .where({ _openid: openid, course_id: c.course_id })
      .limit(1)
      .get();
    const data = {
      _openid: openid,
      course_id: c.course_id,
      course_name: c.course_name,
      description: c.description || '',
      difficulty: c.difficulty,
      sentence_count: c.sentence_count,
      sentences: c.sentences,
      source: c.source,
      updated_at: new Date(),
    };
    if (exists.data && exists.data.length > 0) {
      await db.collection('user_courses').doc(exists.data[0]._id).update({ data: { ...data, updated_at: new Date() } });
      results.push({ course_id: c.course_id, status: 'updated' });
    } else {
      await db.collection('user_courses').add({ data: { ...data, created_at: new Date() } });
      results.push({ course_id: c.course_id, status: 'added' });
    }
  }
  return results;
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) return { code: 4011, message: '未授权或登录过期', data: null };

    const lastSyncTime = event.last_sync_time ? new Date(event.last_sync_time) : new Date(0);
    const newSyncTime = Date.now();

    const recordResults = await upsertRecords(OPENID, event.local_records || []);
    const courseResults = await upsertCourses(OPENID, event.local_courses || []);

    const cloudRecords = await db.collection('user_practice_records')
      .where({ _openid: OPENID })
      .orderBy('practice_time', 'desc')
      .limit(200)
      .get();

    const cloudCourses = await db.collection('user_courses')
      .where({ _openid: OPENID })
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    let user = await db.collection('users').where({ openid: OPENID }).limit(1).get();
    let userInfo = { nickname: '', avatar: '' };
    if (user.data && user.data.length > 0) {
      const u = user.data[0];
      userInfo = { nickname: u.nickname || '', avatar: u.avatar || '' };
    }

    return {
      code: 0,
      message: 'success',
      data: {
        new_sync_time: newSyncTime,
        cloud_records: cloudRecords.data,
        cloud_courses: cloudCourses.data,
        cloud_config: { user_info: userInfo },
        conflicts: [],
        local_results: { records: recordResults, courses: courseResults },
      },
    };
  } catch (err) {
    console.error('[syncData error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
