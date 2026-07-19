const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || '1.0.0';
const DIST_DIR = path.join(__dirname, 'dist');

app.use(cors());
app.use(express.json({ limit: '100kb' }));

function getServerTime() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8.getUTCFullYear();
  const month = String(utc8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8.getUTCDate()).padStart(2, '0');
  const hours = String(utc8.getUTCHours()).padStart(2, '0');
  const minutes = String(utc8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(utc8.getUTCSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

function validateGreetBody(body) {
  const errors = [];

  if (body === null || body === undefined || typeof body !== 'object') {
    errors.push({ field: 'name', message: '请求体必须是JSON对象' });
    return errors;
  }

  const { name } = body;

  if (name === undefined || name === null) {
    errors.push({ field: 'name', message: 'name字段为必填项' });
    return errors;
  }

  if (typeof name !== 'string') {
    errors.push({ field: 'name', message: 'name必须是字符串类型' });
    return errors;
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    errors.push({ field: 'name', message: 'name不能为空字符串' });
    return errors;
  }

  if (trimmedName.length > 50) {
    errors.push({ field: 'name', message: 'name长度不能超过50个字符' });
    return errors;
  }

  return errors;
}

app.post('/api/greet', (req, res) => {
  const errors = validateGreetBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '参数校验失败',
        details: errors
      }
    });
  }

  const name = req.body.name.trim();
  const serverTime = getServerTime();

  res.json({
    success: true,
    data: {
      greeting: `你好，${name}！欢迎使用云端问候服务。`,
      name,
      serverTime,
      version: VERSION
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      serverTime: getServerTime(),
      version: VERSION
    }
  });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `接口 ${req.method} ${req.path} 不存在`
    }
  });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status === 500 ? '服务器内部错误' : err.message;

  if (status === 500) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cloud Greet Server v${VERSION} running on port ${PORT}`);
    console.log(`Server time (UTC+8): ${getServerTime()}`);
    console.log(`Static files: ${fs.existsSync(DIST_DIR) ? DIST_DIR : '(dist目录不存在，静态托管已禁用)'}`);
  });
}

module.exports = app;
module.exports.getServerTime = getServerTime;
module.exports.validateGreetBody = validateGreetBody;
