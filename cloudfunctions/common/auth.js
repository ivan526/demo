const cloud = require('wx-server-sdk');
const { AppError, ErrorCode } = require('./errors');

async function getOpenId() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }
  return OPENID;
}

async function getOrCreateUser(openid) {
  const db = cloud.database();
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

async function requireUser() {
  const openid = await getOpenId();
  return getOrCreateUser(openid);
}

module.exports = { getOpenId, getOrCreateUser, requireUser };
