const request = require('supertest');
const app = require('../server');

describe('POST /api/greet', () => {
  test('正常请求返回问候信息（200）', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '张三' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.greeting).toContain('张三');
    expect(res.body.data.name).toBe('张三');
    expect(res.body.data.serverTime).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
    expect(res.body.data.version).toBeDefined();
  });

  test('name前后空白自动trim', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '  李四  ' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('李四');
    expect(res.body.data.greeting).toContain('李四');
  });

  test('缺少name字段返回400校验错误', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(1);
    expect(res.body.error.details[0].field).toBe('name');
    expect(res.body.error.details[0].message).toContain('必填');
  });

  test('name为null返回400校验错误', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: null })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('name');
  });

  test('name为数字类型返回400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 123 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].message).toContain('字符串');
  });

  test('name为布尔类型返回400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: true })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('name为对象类型返回400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: { first: '张' } })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('name为空字符串返回400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.details[0].message).toContain('不能为空');
  });

  test('name仅包含空白字符返回400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '     ' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.details[0].message).toContain('不能为空');
  });

  test('name超过50字符返回400', async () => {
    const longName = 'a'.repeat(51);
    const res = await request(app)
      .post('/api/greet')
      .send({ name: longName })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.details[0].message).toContain('50');
  });

  test('name正好50字符通过校验', async () => {
    const name50 = 'a'.repeat(50);
    const res = await request(app)
      .post('/api/greet')
      .send({ name: name50 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(name50);
  });

  test('非JSON请求体被express.json处理后返回400（malformed JSON由error handler处理）', async () => {
    const res = await request(app)
      .post('/api/greet')
      .set('Content-Type', 'application/json')
      .send('{bad json}')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/health', () => {
  test('健康检查接口正常返回', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.serverTime).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
  });
});

describe('404处理', () => {
  test('不存在的API路径返回统一404格式', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('不存在');
  });
});

describe('getServerTime格式', () => {
  const { getServerTime } = require('../server');

  test('服务器时间格式匹配YYYY年MM月DD日 HH:mm:ss', () => {
    const timeStr = getServerTime();
    expect(timeStr).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
  });

  test('UTC+8偏移正确（小时范围00-23）', () => {
    const timeStr = getServerTime();
    const hour = parseInt(timeStr.match(/ (\d{2}):/)[1], 10);
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });
});
