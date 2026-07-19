const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || '1.0.0';
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, '../frontend/dist');

app.use(cors());
app.use(express.json({ limit: '64kb' }));

function getShanghaiTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const shanghaiTime = new Date(utc + 8 * 3600000);

  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

function validateName(name) {
  if (name === undefined || name === null) {
    return '请输入您的姓名';
  }
  if (typeof name !== 'string') {
    return '姓名必须是字符串';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return '姓名不能为空';
  }
  if (trimmed.length > 50) {
    return '姓名长度不能超过50个字符';
  }
  return null;
}

app.post('/api/greet', (req, res) => {
  const { name } = req.body;

  const validationError = validateName(name);
  if (validationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validationError,
        field: 'name'
      }
    });
  }

  const trimmedName = name.trim();
  const greeting = `你好，${trimmedName}！欢迎使用云端问候服务。`;

  return res.json({
    success: true,
    data: {
      greeting,
      serverTime: getShanghaiTime(),
      version: VERSION
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: VERSION,
      serverTime: getShanghaiTime()
    }
  });
});

app.use(express.static(STATIC_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(STATIC_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的资源不存在'
        }
      });
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的接口不存在'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: '请求体不是有效的JSON格式'
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Greet server v${VERSION} running on port ${PORT}`);
    console.log(`Static files served from: ${STATIC_DIR}`);
  });
}

module.exports = app;
module.exports.getShanghaiTime = getShanghaiTime;
module.exports.validateName = validateName;
