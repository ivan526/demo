const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const pageSize = Math.min(event.page_size || 50, 100);
    const page = event.page || 1;
    const skip = (page - 1) * pageSize;

    let query = db.collection('builtin_courses').where({ is_published: true });
    if (event.category) {
      query = db.collection('builtin_courses').where({
        is_published: true,
        category: event.category,
      });
    }
    if (event.difficulty) {
      query = db.collection('builtin_courses').where({
        is_published: true,
        difficulty: event.difficulty,
      });
    }

    const countRes = await query.count();
    const res = await query
      .field({ sentences: false })
      .orderBy('difficulty', 'asc')
      .orderBy('category', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      message: 'success',
      data: {
        courses: res.data,
        total: countRes.total,
        page,
        page_size: pageSize,
      },
    };
  } catch (err) {
    console.error('[getBuiltinCourses error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
