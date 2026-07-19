const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;

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

function validateName(name) {
  if (typeof name !== 'string') {
    return { valid: false, message: '姓名必须是字符串' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, message: '姓名不能为空' };
  }
  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, message: `姓名长度不能少于${MIN_NAME_LENGTH}个字符` };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, message: `姓名长度不能超过${MAX_NAME_LENGTH}个字符` };
  }
  return { valid: true, value: trimmed };
}

app.post('/api/greet', (req, res) => {
  const { name } = req.body || {};
  const validation = validateName(name);
  if (!validation.valid) {
    return res.status(400).json({
      code: 400,
      message: validation.message,
      data: null
    });
  }

  const version = process.env.VERSION || '1.0.0';
  const greeting = `你好，${validation.value}！欢迎使用云端问候服务 🌟`;
  const serverTime = getServerTime();

  return res.json({
    greeting,
    serverTime,
    version: `v${version}`
  });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    data: null
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    code: status,
    message: err.message || '服务器内部错误',
    data: null
  });
});

module.exports = app;
module.exports.getServerTime = getServerTime;
module.exports.validateName = validateName;
