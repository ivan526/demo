const request = require('supertest');
const { validateName, getServerTime } = require('../app');
const app = require('../app');

describe('validateName', () => {
  test('accepts valid name within range', () => {
    const result = validateName('张三');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('张三');
  });

  test('accepts name at minimum length (2 chars)', () => {
    const result = validateName('ab');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('ab');
  });

  test('accepts name at maximum length (20 chars)', () => {
    const result = validateName('abcdefghijklmnopqrst');
    expect(result.valid).toBe(true);
  });

  test('trims whitespace and accepts', () => {
    const result = validateName('  hello  ');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('hello');
  });

  test('rejects empty string', () => {
    const result = validateName('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('姓名不能为空');
  });

  test('rejects whitespace-only string', () => {
    const result = validateName('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('姓名不能为空');
  });

  test('rejects null', () => {
    const result = validateName(null);
    expect(result.valid).toBe(false);
  });

  test('rejects undefined', () => {
    const result = validateName(undefined);
    expect(result.valid).toBe(false);
  });

  test('rejects non-string (number)', () => {
    const result = validateName(123);
    expect(result.valid).toBe(false);
  });

  test('rejects name shorter than 2 chars', () => {
    const result = validateName('a');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('2');
  });

  test('rejects name longer than 20 chars', () => {
    const result = validateName('abcdefghijklmnopqrstu');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('20');
  });
});

describe('getServerTime', () => {
  test('returns formatted time string', () => {
    const time = getServerTime();
    expect(typeof time).toBe('string');
    expect(time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('POST /api/greet', () => {
  test('returns greeting with valid name', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '张三' })
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.msg).toBe('success');
    expect(res.body.data.greeting).toContain('张三');
    expect(res.body.data.greeting).toContain('欢迎使用云端问候服务');
    expect(res.body.data.server_time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(res.body.data.version).toMatch(/^v/);
  });

  test('returns version from env var VERSION', async () => {
    const originalVersion = process.env.VERSION;
    process.env.VERSION = '2.5.0';
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '李四' })
      .expect(200);
    expect(res.body.data.version).toBe('v2.5.0');
    if (originalVersion === undefined) {
      delete process.env.VERSION;
    } else {
      process.env.VERSION = originalVersion;
    }
  });

  test('returns default version when env var not set', async () => {
    delete process.env.VERSION;
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '王五' })
      .expect(200);
    expect(res.body.data.version).toBe('v1.0.0');
  });

  test('rejects empty name with 400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '' })
      .expect(400);

    expect(res.body.code).toBe(40003);
    expect(res.body.msg).toBe('姓名不能为空');
    expect(res.body.data).toBe(null);
  });

  test('rejects missing body with 400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({})
      .expect(400);

    expect(res.body.code).toBe(40003);
    expect(res.body.data).toBe(null);
  });

  test('rejects name shorter than 2 chars with 400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 'a' })
      .expect(400);

    expect(res.body.code).toBe(40001);
    expect(res.body.msg).toContain('2');
    expect(res.body.data).toBe(null);
  });

  test('rejects name longer than 20 chars with 400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 'abcdefghijklmnopqrstu' })
      .expect(400);

    expect(res.body.code).toBe(40001);
    expect(res.body.msg).toContain('20');
    expect(res.body.data).toBe(null);
  });

  test('rejects whitespace-only name with 400', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '   ' })
      .expect(400);

    expect(res.body.code).toBe(40003);
    expect(res.body.msg).toBe('姓名不能为空');
    expect(res.body.data).toBe(null);
  });

  test('trims name before processing', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '  张三  ' })
      .expect(200);

    expect(res.body.data.greeting).toContain('张三');
    expect(res.body.data.greeting).not.toContain('  张三  ');
  });

  test('returns 404 for unknown API routes', async () => {
    const res = await request(app)
      .get('/api/unknown')
      .expect(404);

    expect(res.body.code).toBe(404);
    expect(res.body.msg).toBe('请求的资源不存在');
    expect(res.body.data).toBe(null);
  });

  test('returns 404 for non-API routes when dist is missing', async () => {
    const res = await request(app)
      .get('/')
      .expect(404);

    expect(res.body.code).toBe(404);
    expect(res.body.msg).toBe('请求的资源不存在');
    expect(res.body.data).toBe(null);
  });

  test('handles malformed JSON with 400 error', async () => {
    const res = await request(app)
      .post('/api/greet')
      .set('Content-Type', 'application/json')
      .send('{invalid json}')
      .expect(400);

    expect(res.body.code).toBe(400);
    expect(res.body.msg).toBe('请求参数格式错误');
    expect(res.body.data).toBe(null);
  });
});
