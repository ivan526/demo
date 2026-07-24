const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
// 捕获JSON解析错误
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      code: 400,
      msg: '请求参数格式错误',
      data: null
    });
  }
  next(err);
});

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;

function getServerTime() {
  const now = new Date();
  return now.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}

function validateName(name) {
  if (typeof name !== 'string') {
    return { valid: false, code: 40003, message: '姓名不能为空' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, code: 40003, message: '姓名不能为空' };
  }
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, code: 40001, message: '姓名长度必须在2-20字符之间' };
  }
  // 特殊字符黑名单校验，只允许中文、英文、数字、下划线、减号
  const specialCharReg = /[^\u4e00-\u9fa5a-zA-Z0-9_-]/;
  if (specialCharReg.test(trimmed)) {
    return { valid: false, code: 40002, message: '姓名包含非法字符' };
  }
  return { valid: true, value: trimmed };
}

app.post('/api/greet', (req, res) => {
  const { name } = req.body || {};
  const validation = validateName(name);
  if (!validation.valid) {
    return res.status(400).json({
      code: validation.code,
      msg: validation.message,
      data: null
    });
  }

  const version = process.env.VERSION || '1.0.0';
  const greeting = `你好，${validation.value}！欢迎使用云端问候服务 🌟`;
  const server_time = getServerTime();

  return res.json({
    code: 0,
    msg: "success",
    data: {
      greeting,
      server_time,
      version: `v${version}`
    }
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
    msg: '请求的资源不存在',
    data: null
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 50001,
    msg: '服务器内部错误',
    data: null
  });
});

module.exports = app;
module.exports.getServerTime = getServerTime;
module.exports.validateName = validateName;
