const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const builtinCourses = require('./builtin-courses');

const COLLECTIONS = ['users', 'builtin_courses', 'user_courses', 'user_practice_records', 'user_stats'];

async function ensureCollection(db, name) {
  try {
    await db.createCollection(name);
    console.log(`[initDB] collection created: ${name}`);
  } catch (e) {
    if (e && e.errCode === -501001) {
      console.log(`[initDB] collection already exists: ${name}`);
    } else if (e && e.errCode === -501003) {
      console.log(`[initDB] collection already exists (alt): ${name}`);
    } else {
      console.log(`[initDB] ensureCollection ${name} note:`, e.errMsg || e.message);
    }
  }
}

async function seedBuiltinCourses(db) {
  const col = db.collection('builtin_courses');
  const existing = await col.count();
  if (existing.total > 0) {
    console.log(`[initDB] builtin_courses already has ${existing.total} records, skipping seed`);
    return { skipped: true, count: existing.total };
  }
  const now = new Date();
  const docs = builtinCourses.map((c) => ({
    ...c,
    is_published: true,
    created_at: now,
    updated_at: now,
  }));
  let inserted = 0;
  for (const doc of docs) {
    await col.add({ data: doc });
    inserted++;
  }
  console.log(`[initDB] seeded ${inserted} builtin courses`);
  return { skipped: false, count: inserted };
}

exports.main = async (event) => {
  const db = cloud.database();
  const result = { collections: {}, seed: null };
  for (const name of COLLECTIONS) {
    await ensureCollection(db, name);
    result.collections[name] = 'ok';
  }
  result.seed = await seedBuiltinCourses(db);
  return { code: 0, message: 'init done', data: result };
};
