# 英语练习小程序 - 后端服务

基于 FastAPI + SQLite 实现的英语练习小程序后端服务。

## 功能特性

- ✅ 微信登录认证（支持 Mock 模式便于开发，同一 code 返回同一账号）
- ✅ JWT 鉴权机制（HS256，30天有效期）
- ✅ 内置课程库（日常、商务、校园三大类）
- ✅ 练习记录上传与统计
- ✅ 连续天数计算（服务器端防作弊，离线补录归属到实际练习日）
- ✅ 数据同步接口（增量同步，UTC 时间戳对齐）
- ✅ AI 课程生成（集成豆包 / 火山方舟 API）
- ✅ 全局异常处理，统一 `{code,message,data}` 响应格式
- ✅ SQLite 数据库（无需额外安装，开箱即用）
- ✅ CORS 本地开发白名单

## 技术栈

- **框架**: FastAPI 0.104.1
- **数据库**: SQLite 3（Python 内置，WAL 模式）
- **认证**: JWT (PyJWT 2.8)
- **AI 能力**: 字节跳动豆包（火山方舟）API

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

必填配置：
- `JWT_SECRET_KEY`: JWT 签名密钥，必须是至少 32 字符的强随机串（可用 `python -c "import secrets; print(secrets.token_hex(32))"` 生成）
- `WECHAT_APPID` / `WECHAT_SECRET`: 微信小程序凭证（开启 MOCK_LOGIN 时可留空）
- `DOUBAO_API_KEY`: 豆包（火山方舟）API 密钥（不需要 AI 生成功能可留空，调用 AI 接口将返回 501）

### 3. 启动服务

```bash
python main.py
```

服务默认监听 `0.0.0.0:8000`，访问 `http://localhost:8000/docs` 可查看 Swagger 接口文档，`http://localhost:8000/api/health` 为健康检查端点。

## 开发模式

如需开启调试和 Mock 登录模式，修改 `.env`：

```env
DEBUG=true
MOCK_LOGIN=true
```

Mock 模式说明：登录接口返回稳定账号，同一 `code` 始终返回同一 `openid`（推荐使用 `code: "dev-user-1"` 之类的固定字符串进行本地开发），不会每次生成新用户丢失数据。

## 前端配置

修改前端 `miniprogram/config/env.js` 中的 `baseUrl` 为后端服务地址（dev 默认已配置为 `http://127.0.0.1:8000`）：

```javascript
dev: {
  baseUrl: 'http://127.0.0.1:8000',
  // ...
}
```

## 项目结构

```
backend/
├── main.py              # 主应用，包含所有 API 实现
├── requirements.txt     # 依赖列表
├── .env.example         # 环境变量配置模板
├── .gitignore           # Git 忽略配置
└── README.md            # 部署文档
```

运行后自动生成：
- `english_practice.db` — SQLite 数据库文件（已在 .gitignore 中）
- `__pycache__/` — Python 字节码缓存（已在 .gitignore 中）

## API 接口

所有接口返回格式统一为：
```json
{"code": 0, "message": "success", "data": <payload>}
```

错误码：
- `0` — 成功
- `4001` — 参数错误
- `4011` — 登录已过期
- `4031` — 无权限
- `4041` — 资源不存在
- `5001` — 服务暂不可用
- `5002` — AI 服务调用失败

### 认证
- `POST /api/auth/wx-login` - 微信登录（Mock 模式下 code 作为稳定用户标识）

### 课程
- `GET /api/courses/builtin` - 获取内置课程列表（支持 category/difficulty 筛选）
- `GET /api/courses/builtin/{id}` - 获取内置课程详情
- `GET /api/courses/user/{id}` - 获取用户自定义课程详情（含 AI 生成课程）
- `POST /api/ai/generate-course` - AI 生成自定义课程

### 练习
- `POST /api/practice/record` - 上传单次练习记录（服务器重算 accuracy 与归属日期防作弊）
- `GET /api/user/stats` - 获取用户统计数据（含最近 7 天趋势）

### 同步
- `POST /api/sync` - 数据同步（携带 `last_sync_time` 做增量下载，body 中批量上传历史记录与课程）

### 运维
- `GET /api/health` - 健康检查

## 数据库设计

- `users` — 用户表（openid 主键，微信昵称/头像）
- `user_stats` — 用户聚合统计表（总天数、连续天数、总时长、总句数、总正确数、最近练习日）
- `builtin_courses` / `builtin_course_sentences` — 内置课程与句子
- `user_courses` / `user_course_sentences` — 用户自定义/AI 生成课程与句子
- `user_practice_records` — 逐条练习记录（含 practice_date 上海时区日期、practice_time UTC ISO 时间戳）

所有时间字段统一使用 UTC ISO8601 `YYYY-MM-DDTHH:MM:SSZ` 存储，避免时区与字符串比较错误。

## 生产部署建议

1. **反向代理**: 使用 Nginx 作为反向代理，配置 HTTPS
2. **进程管理**: 使用 systemd 或 supervisor 管理服务进程
3. **日志**: 配置日志轮转，避免日志文件过大
4. **备份**: 定期备份 SQLite 数据库文件
5. **安全**:
   - 确保 `JWT_SECRET_KEY` 使用强随机字符串（≥32 字符）
   - 关闭 `DEBUG` 和 `MOCK_LOGIN` 模式
   - 将 CORS `allow_origins` 收紧到实际小程序域名
   - 视情况添加 API 速率限制

## 常见问题

### Q: 如何初始化数据库？
A: 首次启动服务时会自动创建数据库和表，并预置 3 套示例课程。

### Q: 如何添加更多内置课程？
A: 可以直接修改 `main.py` 中的 `init_db()` 函数，添加更多课程数据。

### Q: AI 课程生成功能不可用？
A: 请检查 `DOUBAO_API_KEY` 是否正确配置，以及网络是否能访问火山方舟端点（`https://ark.cn-beijing.volces.com`）。未配置时接口返回 5002。

### Q: Mock 模式下登录两次数据不一样？
A: 请使用固定 code（例如 `dev-user-1`），同一 code 会映射到同一 openid；随机 code 会生成新用户，这是设计行为。
