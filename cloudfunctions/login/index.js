const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getOrCreateUser(openid) {
  const users = db.collection('users');
  const res = await users.where({ openid }).limit(1).get();
  if (res.data && res.data.length > 0) {
    return res.data[0];
  }
  const now = new Date();
  const newUser = {
    openid,
    nickname: '',
    avatar: '',
    created_at: now,
    updated_at: now,
  };
  const addRes = await users.add({ data: newUser });
  return { _id: addRes._id, ...newUser };
}

function success(data) {
  return { code: 0, message: 'success', data };
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      return { code: 4011, message: '未授权或登录过期', data: null };
    }
    const user = await getOrCreateUser(OPENID);

    let nickname = user.nickname;
    let avatar = user.avatar;
    if (event.nickname && !nickname) nickname = event.nickname;
    if (event.avatar && !avatar) avatar = event.avatar;
    if (nickname !== user.nickname || avatar !== user.avatar) {
      await db.collection('users').doc(user._id).update({
        data: { nickname, avatar, updated_at: new Date() },
      });
    }

    return success({
      token: OPENID,
      user_info: {
        openid: OPENID,
        nickname,
        avatar,
      },
    });
  } catch (err) {
    console.error('[login error]', err);
    return { code: 5001, message: err && err.message, data: null };
  }
};
