const request = require('supertest');
const app = require('../index');

describe('POST /api/greet', () => {
  test('成功响应：正常姓名', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '张三' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.msg).toBe('success');
    expect(res.body.data.greeting).toBe('你好，张三 ~ 👋');
    expect(res.body.data.server_time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(res.body.data.version).toBe('v1.0.0');
  });

  test('成功响应：英文姓名', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 'Tom' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.greeting).toBe('你好，Tom ~ 👋');
  });

  test('成功响应：带数字和下划线的姓名', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 'test_123' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.greeting).toBe('你好，test_123 ~ 👋');
  });

  test('错误响应：姓名为空', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40003);
    expect(res.body.msg).toBe('姓名不能为空');
    expect(res.body.data).toBeNull();
  });

  test('错误响应：姓名为空格', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '   ' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40003);
    expect(res.body.msg).toBe('姓名不能为空');
    expect(res.body.data).toBeNull();
  });

  test('错误响应：姓名长度小于2', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: 'A' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40001);
    expect(res.body.msg).toBe('姓名长度必须在2-20字符之间');
    expect(res.body.data).toBeNull();
  });

  test('错误响应：姓名长度大于20', async () => {
    const longName = 'a'.repeat(21);
    const res = await request(app)
      .post('/api/greet')
      .send({ name: longName });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40001);
    expect(res.body.msg).toBe('姓名长度必须在2-20字符之间');
    expect(res.body.data).toBeNull();
  });

  test('错误响应：包含特殊字符', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '张三@123' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40002);
    expect(res.body.msg).toBe('姓名包含非法字符');
    expect(res.body.data).toBeNull();
  });

  test('错误响应：包含特殊字符空格', async () => {
    const res = await request(app)
      .post('/api/greet')
      .send({ name: '张 三' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(40002);
    expect(res.body.msg).toBe('姓名包含非法字符');
    expect(res.body.data).toBeNull();
  });
});

describe('GET /health', () => {
  test('健康检查接口正常', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('v1.0.0');
    expect(res.body.server_time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
