const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || 'v1.0.0';

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源托管
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 获取UTC+8时间，格式YYYY-MM-DD HH:mm:ss
function getServerTime() {
  const now = new Date();
  const offset = 8 * 60; // UTC+8偏移分钟数
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utc + (offset * 60000));
  
  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const day = String(localTime.getDate()).padStart(2, '0');
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');
  const seconds = String(localTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 问候接口
app.post('/api/greet', (req, res) => {
  try {
    const { name } = req.body;
    
    // 校验参数
    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 40003,
        msg: '姓名不能为空',
        data: null
      });
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return res.status(400).json({
        code: 40001,
        msg: '姓名长度必须在2-20字符之间',
        data: null
      });
    }
    
    // 校验特殊字符：只允许中文、英文、数字、下划线
    const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      return res.status(400).json({
        code: 40002,
        msg: '姓名包含非法字符',
        data: null
      });
    }
    
    // 成功响应
    res.json({
      code: 0,
      msg: 'success',
      data: {
        greeting: `你好，${trimmedName} ~ 👋`,
        server_time: getServerTime(),
        version: VERSION
      }
    });
  } catch (err) {
    console.error('服务器错误:', err);
    res.status(500).json({
      code: 50001,
      msg: '服务器内部错误',
      data: null
    });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, server_time: getServerTime() });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`版本: ${VERSION}`);
  });
}

module.exports = app;
