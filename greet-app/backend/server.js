const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || '1.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: '姓名不能为空' };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '姓名不能为空' };
  }
  if (trimmed.length > 50) {
    return { valid: false, message: '姓名不能超过50个字符' };
  }
  if (/[<>"'\\]/.test(trimmed)) {
    return { valid: false, message: '姓名包含非法字符' };
  }
  return { valid: true, name: trimmed };
}

function getShanghaiTime() {
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = shanghaiTime.getUTCFullYear();
  const month = String(shanghaiTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getUTCDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getUTCHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getUTCSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

app.post('/api/greet', (req, res) => {
  try {
    const { name } = req.body;
    const validation = validateName(name);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const greeting = `你好，${validation.name}！欢迎使用云端问候服务。`;
    
    res.json({
      success: true,
      data: {
        greeting,
        serverTime: getShanghaiTime(),
        version: VERSION
      }
    });
  } catch (error) {
    console.error('Greet API Error:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: '服务暂不可用'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Greet Server is running on port ${PORT}`);
    console.log(`Version: ${VERSION}`);
  });
}

module.exports = { app, validateName, getShanghaiTime };
