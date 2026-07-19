const path = require('path');

const originalVersion = process.env.VERSION;
const originalStaticDir = process.env.STATIC_DIR;
const originalPort = process.env.PORT;

process.env.VERSION = 'test-1.0.0';
process.env.STATIC_DIR = path.resolve(__dirname, '../test-dist');
process.env.PORT = '0';

const request = require('supertest');
const app = require('../server');
const { validateName, getShanghaiTime } = require('../server');

describe('Greet API', () => {
  afterAll(() => {
    process.env.VERSION = originalVersion;
    process.env.STATIC_DIR = originalStaticDir;
    process.env.PORT = originalPort;
  });

  describe('POST /api/greet', () => {
    it('should return greeting with valid name', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: '张三' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.greeting).toBe('你好，张三！欢迎使用云端问候服务。');
      expect(res.body.data.version).toBe('test-1.0.0');
      expect(res.body.data.serverTime).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
    });

    it('should trim whitespace from name', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: '  李四  ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.greeting).toBe('你好，李四！欢迎使用云端问候服务。');
    });

    it('should accept English names', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: 'John Doe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.greeting).toBe('你好，John Doe！欢迎使用云端问候服务。');
    });

    it('should reject request without name field', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.field).toBe('name');
      expect(res.body.error.message).toBe('请输入您的姓名');
    });

    it('should reject null name', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: null });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty string name', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名不能为空');
    });

    it('should reject whitespace-only name', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名不能为空');
    });

    it('should reject non-string name (number)', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: 123 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名必须是字符串');
    });

    it('should reject non-string name (object)', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: { first: '张' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名必须是字符串');
    });

    it('should reject non-string name (array)', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: ['张', '三'] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject name longer than 50 characters', async () => {
      const longName = 'a'.repeat(51);
      const res = await request(app)
        .post('/api/greet')
        .send({ name: longName });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名长度不能超过50个字符');
    });

    it('should accept name with exactly 50 characters', async () => {
      const name50 = 'a'.repeat(50);
      const res = await request(app)
        .post('/api/greet')
        .send({ name: name50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept boolean true as invalid (non-string)', async () => {
      const res = await request(app)
        .post('/api/greet')
        .send({ name: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('姓名必须是字符串');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.version).toBe('test-1.0.0');
      expect(res.body.data.serverTime).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent API routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid JSON', async () => {
      const originalError = console.error;
      console.error = jest.fn();

      const res = await request(app)
        .post('/api/greet')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_JSON');

      console.error = originalError;
    });

    it('should return 404 for POST to non-existent API routes', async () => {
      const res = await request(app)
        .post('/api/nonexistent')
        .send({ name: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Static file serving', () => {
    it('should serve index.html for root path', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Hello');
    });
  });

  describe('validateName function', () => {
    it('should return error for undefined', () => {
      expect(validateName(undefined)).toBe('请输入您的姓名');
    });

    it('should return error for null', () => {
      expect(validateName(null)).toBe('请输入您的姓名');
    });

    it('should return error for non-string types', () => {
      expect(validateName(123)).toBe('姓名必须是字符串');
      expect(validateName(true)).toBe('姓名必须是字符串');
      expect(validateName(false)).toBe('姓名必须是字符串');
      expect(validateName({})).toBe('姓名必须是字符串');
      expect(validateName([])).toBe('姓名必须是字符串');
    });

    it('should return error for empty string', () => {
      expect(validateName('')).toBe('姓名不能为空');
      expect(validateName('   ')).toBe('姓名不能为空');
    });

    it('should return error for names longer than 50 chars', () => {
      expect(validateName('a'.repeat(51))).toBe('姓名长度不能超过50个字符');
    });

    it('should return null for valid names', () => {
      expect(validateName('张三')).toBeNull();
      expect(validateName('John')).toBeNull();
      expect(validateName('a'.repeat(50))).toBeNull();
    });
  });

  describe('getShanghaiTime function', () => {
    it('should return formatted time string', () => {
      const time = getShanghaiTime();
      expect(time).toMatch(/^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/);
    });
  });
});
