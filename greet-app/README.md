# 云端问候页面 (Greet App)

一个简洁的云端问候Web应用，包含前后端完整实现。

## 技术栈

- **后端**: Node.js + Express v4
- **前端**: 原生 HTML5 + CSS3 + JavaScript (无框架依赖)

## 功能特性

### 后端
- ✅ POST `/api/greet` 接口，包含完整参数校验
- ✅ 服务器时间获取（UTC+8时区，格式：YYYY年MM月DD日 HH:mm:ss）
- ✅ 版本号从环境变量读取
- ✅ 静态文件托管前端资源
- ✅ 统一错误处理中间件
- ✅ 单元测试覆盖所有校验场景

### 前端
- ✅ 输入页面，居中布局，响应式适配PC/移动端
- ✅ 结果页面，展示问候语、服务器时间、版本号
- ✅ 前端输入校验，与后端校验规则完全一致
- ✅ 错误提示（输入错误、接口错误、网络错误）
- ✅ Loading状态，提交按钮点击后显示加载动画
- ✅ 页面路由逻辑
- ✅ 代码压缩混淆，总页面大小小于100KB（实际：~7.7KB）

## 项目结构

```
greet-app/
├── backend/
│   ├── package.json      # 后端依赖配置
│   ├── server.js         # Express服务器主文件
│   ├── server.test.js    # 单元测试
│   └── build.js          # 前端代码压缩构建脚本
└── frontend/
    └── dist/
        ├── index.html    # 主页面
        ├── style.css     # 样式文件（已压缩）
        └── app.js        # 前端逻辑（已压缩混淆）
```

## 快速开始

### 安装依赖

```bash
cd greet-app/backend
npm install
```

### 运行服务

```bash
# 基础启动
npm start

# 带版本号（可选）
VERSION=1.0.1 PORT=3000 npm start
```

### 运行测试

```bash
npm test
```

### 构建前端（压缩混淆）

```bash
node build.js
```

## API 文档

### POST `/api/greet`

获取问候信息

**请求体：**
```json
{
  "name": "张三"
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "data": {
    "greeting": "你好，张三！欢迎使用云端问候服务。",
    "serverTime": "2024年01月15日 14:30:45",
    "version": "1.0.0"
  }
}
```

**错误响应（400）：**
```json
{
  "success": false,
  "message": "姓名不能为空"
}
```

**参数校验规则：**
- 姓名不能为空（含纯空格）
- 姓名长度不超过50个字符
- 不允许包含 `< > " ' \` 等特殊字符（XSS防护）

## 输入校验规则

前端与后端使用完全一致的校验逻辑：
1. 去除首尾空白字符
2. 非空校验
3. 长度校验（≤50字符）
4. 非法字符校验（XSS防护）

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 性能指标

- 前端总文件大小：~7.7 KB（远低于100KB限制）
- 首屏加载时间：< 100ms
- API响应时间：< 10ms
