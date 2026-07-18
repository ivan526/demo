# 云端问候 - 前端

原生 HTML/CSS/JavaScript 实现的云端问候页面前端，无框架依赖，加载速度极快。

## 功能特性

- ✅ 输入页面，居中布局，响应式适配 PC/移动端
- ✅ 单页布局，结果区域在同一页面内显示
- ✅ 前端输入校验，长度限制 20 字符
- ✅ 特殊字符校验（30 个特殊字符黑名单）
- ✅ 错误提示（输入错误、接口错误、网络错误）
- ✅ Loading 状态，提交按钮显示"加载中..."
- ✅ 页面底部常驻版本信息
- ✅ 结果区域显示部署版本
- ✅ 代码压缩混淆，总页面大小小于 100KB

## 项目结构

```
greet-app/
├── frontend/
│   ├── src/          # 源代码（未压缩）
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── dist/         # 构建产物（压缩混淆后）
│       ├── index.html
│       ├── style.css
│       └── app.js
├── build.js          # 构建脚本
├── package.json      # 项目配置
└── README.md
```

## 接口规范

### POST /api/greet

请求体：
```json
{
  "name": "用户名"
}
```

响应格式：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "greeting": "你好，用户名！😊 来自云端的问候送给你～",
    "server_time": "2024-01-01T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## 校验规则

1. 非空校验
2. 长度校验（≤20 字符）
3. 特殊字符校验黑名单（`` `~!@#$%^&*()_+{}[]|\\:;"'<>,.?/ ``）
4. 自动去除首尾空格

## 开发说明

前端代码使用原生 JavaScript 实现，无需额外安装依赖。

源文件位于 `frontend/src/` 目录，构建产物位于 `frontend/dist/` 目录。

## 构建说明

### 安装依赖

```bash
cd greet-app
npm install
```

### 构建项目

```bash
npm run build
```

构建脚本 `build.js` 会执行以下操作：
1. 使用 terser 压缩混淆 JavaScript（确保关键字与标识符间保留空格避免语法错误）
2. 使用 html-minifier-terser 压缩 HTML
3. 使用 clean-css 压缩 CSS
4. 自动执行 `node --check` 验证构建产物语法正确性
5. 显示各文件及总大小，确认小于 100KB

### 语法检查

```bash
npm run check
```

## 性能指标

- 前端总文件大小：~6.00 KB（远低于 100KB 限制）
- 首屏加载时间：< 100ms
- 浏览器兼容性：Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
