const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  try {
    if (!event.id) {
      return { code: 4001, message: '参数错误：id 不能为空', data: null };
    }
    const res = await db.collection('builtin_courses').doc(event.id).get();
    if (!res.data) {
      return { code: 4001, message: '课程不存在', data: null };
    }
    return { code: 0, message: 'success', data: res.data };
  } catch (err) {
    console.error('[getBuiltinCourseDetail error]', err);
    if (err && err.errCode === -1) {
      return { code: 4001, message: '课程不存在', data: null };
    }
    return { code: 5001, message: err && err.message, data: null };
  }
};
