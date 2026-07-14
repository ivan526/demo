# 云函数与数据库配置（BE-001）

本目录包含英语句子练习小程序 MVP 第一阶段云开发后端代码。

## 目录结构

```
cloudfunctions/
├── config/                         # 数据库配置（非部署代码，仅文档/参考）
│   ├── db-schema.json              # 5张数据表的字段定义、索引、权限规则
│   └── database-rules.json         # 云数据库安全规则 JSON（控制台手动配置）
├── common/                         # 共享模块参考实现（供 BE-002/003/004 复用）
│   ├── errors.js                   # 错误码（4001/4002/4011/4031/5001/5002）
│   ├── response.js                 # 统一返回格式 + wrapHandler 异常捕获
│   ├── auth.js                     # openid 鉴权 + 用户自动建档
│   ├── utils.js                    # 参数校验工具
│   └── index.js                    # 统一导出
├── init-data/
│   └── builtin-courses.js          # 10套内置课程数据（200句，4易4中2难）
├── initDB/                         # 一次性初始化云函数：创建集合 + 注入内置课程
├── login/                          # POST /api/auth/wx-login 对应云函数
├── getBuiltinCourses/              # GET  /api/courses/builtin 课程列表（不含sentences）
├── getBuiltinCourseDetail/         # GET  /api/courses/builtin/{id} 课程详情
├── uploadPracticeRecord/           # POST /api/practice/record 上传练习记录（自动更新统计）
├── getUserStats/                   # GET  /api/user/stats 用户统计 + 近N天每日时长
├── syncData/                       # POST /api/sync 增量同步（占位，BE-004完善）
└── generateAiCourse/               # POST /api/ai/generate-course AI课程骨架（BE-003实现）
```

## 环境配置步骤（需在微信开发者工具中手动完成）

### 1. 创建云开发环境
1. 使用微信开发者工具打开前端工程（由 FE-001 交付），填写 AppID
2. 工具栏点击「云开发」→「开通」→ 新建环境，环境名建议 `english-typing-prod`
3. 记录环境 ID，填入前端 `miniprogram/config/env.js`
4. 在云开发控制台「设置」→「全局设置」中开通：云函数、云数据库、云存储

### 2. 创建云数据库集合
在云开发控制台「数据库」中手动新建以下 5 个集合（或部署后调用 initDB 自动创建）：

| 集合名 | 用途 | 权限（见下方权限配置） |
|--------|------|----------------------|
| `users` | 用户表 | 仅创建者可读写 |
| `builtin_courses` | 内置课程表 | 所有用户可读，仅管理员可写 |
| `user_courses` | 用户自定义课程表 | 仅创建者可读写 |
| `user_practice_records` | 用户练习记录表 | 仅创建者可读写 |
| `user_stats` | 用户统计表 | 仅创建者可读写 |

**推荐在控制台为每个集合设置权限**：
- `users`：「仅创建者可读写」
- `builtin_courses`：「所有用户可读，仅创建者可读写」（通过云函数写入）
- `user_courses` / `user_practice_records` / `user_stats`：「仅创建者可读写」

### 3. 创建数据库索引
在每个集合的「索引管理」中创建以下索引（或参考 `config/db-schema.json`）：
- `users.openid`：唯一索引
- `builtin_courses.category`、`builtin_courses.is_published`、`builtin_courses.difficulty+category` 复合索引
- `user_courses._openid`、`user_courses._openid+created_at` 复合
- `user_practice_records._openid`、`user_practice_records._openid+practice_time` 复合
- `user_stats._openid`：唯一索引

### 4. 部署云函数
1. 在微信开发者工具中，右键 `cloudfunctions/` 目录 → 选择当前云环境
2. 逐个右键每个云函数目录 → 「上传并部署：云端安装依赖」
3. 必须部署的函数：`initDB`、`login`、`getBuiltinCourses`、`getBuiltinCourseDetail`、`uploadPracticeRecord`、`getUserStats`
4. `syncData` 和 `generateAiCourse` 可先部署占位，等 BE-003/BE-004 完善

### 5. 初始化内置数据
1. 在云开发控制台「云函数」→ 找到 `initDB` → 点击「云端测试」→ 直接运行（无需传参）
2. initDB 会：
   - 自动创建所有集合（如不存在）
   - 注入 10 套内置课程，共 200 句
   - 重复调用不会重复写入（检测到已有数据则跳过）
3. 在云开发控制台「数据库」→ `builtin_courses` 集合确认有 10 条数据

### 6. 云存储权限
在云开发控制台「存储」→「权限设置」选择「所有用户可读，仅创建者可读写」。

## API 契约

所有云函数响应统一格式：
```json
{ "code": 0, "message": "success", "data": { ... } }
```

错误码：
| code | 含义 |
|------|------|
| 0 | 成功 |
| 4001 | 参数错误 |
| 4002 | 内容违规 |
| 4011 | 未授权/登录过期 |
| 4031 | 权限不足 |
| 5001 | 服务器内部错误 |
| 5002 | AI 服务调用失败 |

### login（POST 等效）
```js
// 入参：{ code?, nickname?, avatar? }
// 出参：{ token: openid, user_info: { openid, nickname, avatar } }
```

### getBuiltinCourses
```js
// 入参：{ page?, page_size?, category?, difficulty? }
// 出参：{ courses: [...], total, page, page_size }
```

### getBuiltinCourseDetail
```js
// 入参：{ id: "文档ID" }
// 出参：完整课程对象（含 sentences 数组）
```

### uploadPracticeRecord
```js
// 入参：{ record_id, course_id, course_name, total_sentences, correct_count,
//         accuracy, max_combo, duration, practice_time(ms时间戳) }
// 自动幂等（同 record_id 不会重复入库）
// 自动维护 user_stats：累加时长/题量、更新最高连击、计算连续学习天数
```

### getUserStats
```js
// 入参：{ days?: 7 }
// 出参：{ total_practice_time, total_accuracy, max_combo, continuous_days,
//         last_practice_date, recent_days: [{date, duration}] }
```

## 内置课程数据说明

- **10 套课程 / 200 句**：每套 20 句
- **难度分布**：易×4、中×4、难×2
- **主题覆盖**：日常、校园、生活、美食、购物、交通、办公、旅游、商务、面试
- 每句包含 `english`（英文）、`chinese`（中文释义）、`phonetic`（国际音标）

## 校验清单

- [ ] 云开发环境创建完成，云函数/云数据库/云存储均已开通
- [ ] 5 张数据库集合已创建
- [ ] 集合权限配置正确（builtin_courses 可读，其余仅本人可读写）
- [ ] 推荐索引已创建
- [ ] 8 个云函数全部部署成功
- [ ] initDB 云函数执行成功，builtin_courses 有 10 条数据
- [ ] 云函数调用测试通过：login / getBuiltinCourses / getBuiltinCourseDetail
