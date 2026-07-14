const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const FREE_DAILY_LIMIT = 3;
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) return { code: 4011, message: '未授权或登录过期', data: null };

    const { topic, difficulty, sentence_count } = event;
    if (!topic || !difficulty || !sentence_count) {
      return { code: 4001, message: '参数错误：topic/difficulty/sentence_count 必填', data: null };
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return { code: 4001, message: '参数错误：difficulty 必须是 easy/medium/hard', data: null };
    }
    const count = parseInt(sentence_count, 10);
    if (isNaN(count) || count < 5 || count > 30) {
      return { code: 4001, message: '参数错误：sentence_count 必须在 5-30 之间', data: null };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const recentCount = await db.collection('user_practice_records')
      .where({
        _openid: OPENID,
      })
      .count();

    return {
      code: 5002,
      message: 'AI 课程生成功能将在 BE-003 迭代中实现（豆包API + 内容安全审核）。当前版本仅提供接口契约骨架。',
      data: null,
    };
  } catch (err) {
    console.error('[generateAiCourse error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
