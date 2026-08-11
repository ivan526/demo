# 云端问候页面

一个简洁美观的云端问候页面，支持姓名输入、问候展示、服务器时间和版本显示。

## 功能特性

- ✅ 姓名输入框，长度限制2-20字符
- ✅ 实时输入校验和错误提示
- ✅ 加载状态动画
- ✅ 展示问候语、服务器时间、版本号
- ✅ 响应式设计，适配移动端和桌面端
- ✅ 纯原生HTML/CSS/JavaScript，无框架依赖
- ✅ 代码压缩混淆，总文件体积小于100KB

## 技术栈

- 原生HTML5
- CSS3 (CSS变量、Flexbox、Grid、动画)
- 原生JavaScript (ES6+)
- 构建工具: Terser (JS压缩), html-minifier (HTML压缩), clean-css (CSS压缩)
- 代码检查: ESLint
- 类型检查: TypeScript (仅检查模式)

## 目录结构

```
greeting-page/
├── src/
│   ├── index.html      # 主页面
│   ├── style.css       # 样式文件
│   └── app.js          # 业务逻辑
├── dist/               # 构建输出目录
├── scripts/
│   └── build.js        # 构建脚本
├── package.json        # 项目配置
├── .eslintrc.json      # ESLint配置
└── README.md           # 说明文档
```

## 快速开始

### 安装依赖

```bash
cd greeting-page
npm install
```

### 构建

```bash
npm run build
```

构建后的文件位于 `dist/` 目录。

### 代码检查

```bash
# ESLint检查
npm run lint

# ESLint自动修复
npm run lint:fix

# TypeScript类型检查
npm run typecheck
```

### 本地预览

使用任意HTTP服务器托管 `dist/` 或 `src/` 目录：

```bash
# 使用Python
python3 -m http.server 8080 --directory dist

# 或使用Node.js http-server
npx http-server dist -p 8080
```

然后访问 http://localhost:8080

## 接口说明

### POST /api/greet

请求参数：
```json
{
  "name": "张三"
}
```

响应格式：
```json
{
  "greeting": "你好，张三！欢迎使用云端问候服务",
  "serverTime": "2024-01-15 14:30:00",
  "version": "v1.0.0"
}
```

错误响应：
```json
{
  "error": "姓名不能为空"
}
```

## 验收标准

- [x] build: 通过
- [x] lint: 通过
- [x] typecheck: 通过
- [x] 总文件体积: < 100KB
- [x] 响应式适配: 通过
- [x] 输入校验: 通过
- [x] 错误提示: 通过
- [x] 加载状态: 通过
- [x] 页面路由: 通过

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
