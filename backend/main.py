import hashlib
import json
import logging
import os
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
import requests
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, model_validator
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEBUG = os.getenv("DEBUG", "false").lower() == "true"
MOCK_LOGIN = os.getenv("MOCK_LOGIN", "false").lower() == "true"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

INSECURE_SECRETS = {
    "",
    "dev-secret-key-change-in-production",
    "your_jwt_secret_key_here",
    "your_strong_jwt_secret_key_here_at_least_32_characters",
    "dev",
    "test",
}
if SECRET_KEY in INSECURE_SECRETS or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET_KEY must be configured with a strong random value of at least 32 characters"
    )

WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")

DOUBAO_API_KEY = os.getenv("DOUBAO_API_KEY", "")
DOUBAO_API_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "english_practice.db")

SHANGHAI_TZ = timezone(timedelta(hours=8))
UTC_TZ = timezone.utc
MAX_HISTORY_DAYS = 30

app = FastAPI(title="English Practice API", debug=DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


def utcnow_iso() -> str:
    return datetime.now(UTC_TZ).strftime("%Y-%m-%dT%H:%M:%SZ")


def shanghai_now() -> datetime:
    return datetime.now(SHANGHAI_TZ)


def shanghai_today():
    return shanghai_now().date()


def parse_iso_datetime(s: str) -> datetime:
    if not isinstance(s, str):
        raise ValueError("timestamp must be a string")
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)


def to_shanghai_date(dt_utc: datetime):
    return dt_utc.astimezone(SHANGHAI_TZ).date()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        openid TEXT PRIMARY KEY,
        nickname TEXT,
        avatar TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_stats (
        openid TEXT PRIMARY KEY,
        total_practice_days INTEGER DEFAULT 0,
        continuous_days INTEGER DEFAULT 0,
        total_practice_time INTEGER DEFAULT 0,
        total_sentences INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        last_practice_date DATE,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (openid) REFERENCES users(openid)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS builtin_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
        sentence_count INTEGER NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        cover_image TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS builtin_course_sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        english TEXT NOT NULL,
        chinese TEXT NOT NULL,
        audio_url TEXT,
        sort_order INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (course_id) REFERENCES builtin_courses(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_courses (
        id TEXT PRIMARY KEY,
        openid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
        sentence_count INTEGER NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        cover_image TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_course_sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id TEXT NOT NULL,
        english TEXT NOT NULL,
        chinese TEXT NOT NULL,
        audio_url TEXT,
        sort_order INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (course_id) REFERENCES user_courses(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_practice_records (
        id TEXT PRIMARY KEY,
        openid TEXT NOT NULL,
        course_id TEXT NOT NULL,
        course_name TEXT NOT NULL,
        total_sentences INTEGER NOT NULL CHECK (total_sentences > 0),
        correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
        max_combo INTEGER NOT NULL CHECK (max_combo >= 0),
        accuracy REAL NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
        duration INTEGER NOT NULL CHECK (duration >= 0),
        practice_date DATE NOT NULL,
        practice_time TIMESTAMP NOT NULL,
        original_record_id TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
        CHECK (correct_count <= total_sentences),
        CHECK (max_combo <= total_sentences)
    )
    ''')

    # 添加original_record_id列（兼容旧版本）
    cursor.execute("PRAGMA table_info(user_practice_records)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "original_record_id" not in columns:
        cursor.execute("ALTER TABLE user_practice_records ADD COLUMN original_record_id TEXT")

    # 新增用户答题详情表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_practice_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        english TEXT NOT NULL,
        chinese TEXT NOT NULL,
        user_answer TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (record_id) REFERENCES user_practice_records(id) ON DELETE CASCADE,
        UNIQUE(record_id, question_id)
    )
    ''')

    now = utcnow_iso()

    cursor.execute("SELECT COUNT(*) as count FROM builtin_courses")
    if cursor.fetchone()["count"] == 0:
        sample_courses = [
            {
                "title": "日常口语入门",
                "description": "适合初学者的日常基础口语练习",
                "category": "daily",
                "difficulty": 1,
                "sentence_count": 10,
                "estimated_minutes": 5,
                "sentences": [
                    ("Hello, how are you?", "你好，最近怎么样？"),
                    ("I'm fine, thank you.", "我很好，谢谢。"),
                    ("What's your name?", "你叫什么名字？"),
                    ("My name is Li Ming.", "我叫李明。"),
                    ("Where are you from?", "你来自哪里？"),
                    ("I'm from Beijing.", "我来自北京。"),
                    ("Nice to meet you.", "很高兴认识你。"),
                    ("Nice to meet you too.", "我也很高兴认识你。"),
                    ("How old are you?", "你多大了？"),
                    ("I'm 25 years old.", "我25岁了。")
                ]
            },
            {
                "title": "商务英语基础",
                "description": "职场常用商务英语表达",
                "category": "business",
                "difficulty": 2,
                "sentence_count": 10,
                "estimated_minutes": 7,
                "sentences": [
                    ("I'd like to schedule a meeting for next week.", "我想安排下周开个会。"),
                    ("Could you send me the report by Friday?", "你能在周五之前把报告发给我吗？"),
                    ("The project is on track.", "项目进展顺利。"),
                    ("We need to improve our efficiency.", "我们需要提高效率。"),
                    ("Let's discuss this in the meeting.", "我们在会上讨论这个问题。"),
                    ("I'll follow up with you tomorrow.", "我明天会跟进你的。"),
                    ("The client is satisfied with our work.", "客户对我们的工作很满意。"),
                    ("We have a tight deadline.", "我们的截止日期很紧。"),
                    ("Could you explain this again?", "你能再解释一下吗？"),
                    ("Thank you for your hard work.", "谢谢你的辛勤工作。")
                ]
            },
            {
                "title": "校园生活会话",
                "description": "校园场景常用英语对话",
                "category": "campus",
                "difficulty": 1,
                "sentence_count": 10,
                "estimated_minutes": 5,
                "sentences": [
                    ("What class do you have this afternoon?", "你下午有什么课？"),
                    ("I have a math class.", "我有一节数学课。"),
                    ("When is the assignment due?", "作业什么时候交？"),
                    ("It's due next Monday.", "下周一交。"),
                    ("Where is the library?", "图书馆在哪里？"),
                    ("It's next to the teaching building.", "在教学楼旁边。"),
                    ("Do you want to study together?", "你想一起学习吗？"),
                    ("Sure, let's meet at the cafeteria.", "当然，我们在食堂见吧。"),
                    ("What's your major?", "你是什么专业的？"),
                    ("I'm majoring in computer science.", "我学的是计算机科学专业。")
                ]
            }
        ]

        for course in sample_courses:
            cursor.execute('''
            INSERT INTO builtin_courses (title, description, category, difficulty, sentence_count, estimated_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (course["title"], course["description"], course["category"], course["difficulty"],
                  course["sentence_count"], course["estimated_minutes"], now, now))

            course_id = cursor.lastrowid
            for i, (english, chinese) in enumerate(course["sentences"]):
                cursor.execute('''
                INSERT INTO builtin_course_sentences (course_id, english, chinese, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ''', (course_id, english, chinese, i + 1, now, now))

    conn.commit()
    conn.close()


init_db()


class WxLoginRequest(BaseModel):
    code: str
    nickname: Optional[str] = None
    avatar: Optional[str] = None


class Answer(BaseModel):
    questionId: str = Field(min_length=1, max_length=128)
    english: str = Field(min_length=1, max_length=2000)
    chinese: str = Field(min_length=1, max_length=2000)
    userAnswer: str = Field(min_length=0, max_length=2000)
    correctAnswer: str = Field(min_length=1, max_length=2000)
    isCorrect: bool


class PracticeRecordRequest(BaseModel):
    record_id: str = Field(min_length=1, max_length=128)
    course_id: str = Field(min_length=1, max_length=128)
    course_name: str = Field(min_length=1, max_length=200)
    total_sentences: int = Field(ge=1)
    correct_count: int = Field(ge=0)
    max_combo: int = Field(ge=0)
    accuracy: float = Field(ge=0, le=100)
    duration: int = Field(ge=0)
    practice_time: str
    answers: List[Answer] = Field(default_factory=list)

    @model_validator(mode='after')
    def check_cross_fields(self):
        if self.correct_count > self.total_sentences:
            raise ValueError('correct_count cannot exceed total_sentences')
        if self.max_combo > self.total_sentences:
            raise ValueError('max_combo cannot exceed total_sentences')
        if self.duration < 0:
            raise ValueError('duration must be non-negative')
        # 校验答案数量是否匹配
        if self.answers and len(self.answers) != self.total_sentences:
            raise ValueError('answers length must match total_sentences')
        return self


class SyncCourseSentence(BaseModel):
    english: str = Field(min_length=1, max_length=2000)
    chinese: str = Field(min_length=1, max_length=2000)
    audio_url: Optional[str] = ""


class SyncUserCourse(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=64)
    difficulty: int = Field(ge=1, le=5)
    sentence_count: int = Field(ge=0)
    estimated_minutes: int = Field(ge=0)
    description: Optional[str] = ""
    cover_image: Optional[str] = ""
    sentences: List[SyncCourseSentence] = []


class SyncPracticeRecord(PracticeRecordRequest):
    pass


class SyncRequest(BaseModel):
    last_sync_time: Optional[str] = None
    practice_records: List[SyncPracticeRecord] = []
    user_courses: List[SyncUserCourse] = []


class AIGenerateCourseRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    difficulty: int = Field(ge=1, le=5)
    sentence_count: int = Field(ge=5, le=20)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(UTC_TZ) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录已过期，请重新登录",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        openid: str = payload.get("sub")
        if openid is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE openid = ?", (openid,)).fetchone()
    conn.close()
    if user is None:
        raise credentials_exception
    return dict(user)


def validate_practice_time(practice_time_str: str, reference_label: str = "记录") -> datetime:
    try:
        client_dt = parse_iso_datetime(practice_time_str)
    except (ValueError, TypeError):
        logger.warning("invalid practice_time for %s", reference_label)
        raise HTTPException(status_code=400, detail=f"{reference_label} 的练习时间格式不正确")

    server_dt = datetime.now(UTC_TZ)
    if client_dt > server_dt + timedelta(minutes=5):
        raise HTTPException(status_code=400, detail=f"{reference_label} 的练习时间不能在未来")
    if client_dt < server_dt - timedelta(days=MAX_HISTORY_DAYS):
        raise HTTPException(status_code=400, detail=f"{reference_label} 的练习时间超过 {MAX_HISTORY_DAYS} 天")
    return client_dt


def compute_streak(openid: str, conn):
    row = conn.execute('''
        SELECT
            COALESCE(COUNT(DISTINCT practice_date), 0) AS total_days,
            MAX(practice_date) AS last_date
        FROM user_practice_records
        WHERE openid = ?
    ''', (openid,)).fetchone()

    total_days = row["total_days"]
    last_date_str = row["last_date"]
    if not last_date_str:
        return 0, 0, None

    last_date = datetime.fromisoformat(last_date_str).date()
    today = shanghai_today()
    delta = (today - last_date).days
    if delta > 1:
        return total_days, 0, last_date_str

    check_date = last_date
    continuous = 0
    while True:
        has = conn.execute('''
            SELECT 1 FROM user_practice_records
            WHERE openid = ? AND practice_date = ?
            LIMIT 1
        ''', (openid, check_date.isoformat())).fetchone()
        if has:
            continuous += 1
            check_date -= timedelta(days=1)
        else:
            break
    return total_days, continuous, last_date_str


def envelope(code: int, message: str, data=None):
    return {"code": code, "message": message, "data": data}


_ERROR_CODE_MAP = {400: 4001, 401: 4011, 403: 4031, 404: 4041, 500: 5001, 501: 5002}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = _ERROR_CODE_MAP.get(exc.status_code, exc.status_code * 10 + 1)
    return JSONResponse(status_code=200, content=envelope(code, exc.detail or "请求失败"))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("validation error on %s", request.url.path)
    return JSONResponse(status_code=200, content=envelope(4001, "参数错误"))


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled error on %s", request.url.path)
    return JSONResponse(status_code=200, content=envelope(5001, "服务暂不可用"))


@app.post("/api/auth/wx-login")
async def wx_login(req: WxLoginRequest):
    openid = None

    if MOCK_LOGIN:
        digest = hashlib.sha256(req.code.encode("utf-8")).hexdigest()[:16]
        openid = f"mock_{digest}"
    else:
        if not WECHAT_APPID or not WECHAT_SECRET:
            logger.error("WECHAT_APPID/SECRET not configured")
            raise HTTPException(status_code=500, detail="服务配置缺失")
        try:
            resp = requests.get(
                "https://api.weixin.qq.com/sns/jscode2session",
                params={
                    "appid": WECHAT_APPID,
                    "secret": WECHAT_SECRET,
                    "js_code": req.code,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            if "errcode" in data and data["errcode"] != 0:
                logger.warning("wechat login errcode=%s", data.get("errcode"))
                raise HTTPException(status_code=400, detail="微信登录失败")
            openid = data.get("openid")
            if not openid:
                raise HTTPException(status_code=400, detail="微信登录失败")
        except requests.RequestException:
            logger.exception("wechat API request failed")
            raise HTTPException(status_code=500, detail="微信服务暂时不可用")

    now = utcnow_iso()
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE openid = ?", (openid,)).fetchone()
        if not user:
            conn.execute(
                "INSERT INTO users (openid, nickname, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (openid, req.nickname or "微信用户", req.avatar or "", now, now),
            )
            conn.execute(
                "INSERT INTO user_stats (openid, created_at, updated_at) VALUES (?, ?, ?)",
                (openid, now, now),
            )
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE openid = ?", (openid,)).fetchone()
        else:
            if req.nickname or req.avatar:
                fields, params = [], []
                if req.nickname:
                    fields.append("nickname = ?")
                    params.append(req.nickname)
                if req.avatar:
                    fields.append("avatar = ?")
                    params.append(req.avatar)
                fields.append("updated_at = ?")
                params.append(now)
                params.append(openid)
                conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE openid = ?", params)
                conn.commit()
    finally:
        conn.close()

    token = create_access_token(data={"sub": openid})
    return envelope(0, "success", {
        "token": token,
        "user_info": {"openid": openid, "nickname": user["nickname"], "avatar": user["avatar"]},
    })


@app.get("/api/courses/builtin")
async def get_builtin_courses(
    category: Optional[str] = None,
    difficulty: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    conn = get_db_connection()
    try:
        query = "SELECT * FROM builtin_courses WHERE 1=1"
        params = []
        if category:
            query += " AND category = ?"
            params.append(category)
        if difficulty is not None:
            query += " AND difficulty = ?"
            params.append(difficulty)
        courses = conn.execute(query, params).fetchall()
    finally:
        conn.close()
    return envelope(0, "success", [dict(c) for c in courses])


@app.get("/api/courses/builtin/{course_id}")
async def get_builtin_course_detail(course_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        course = conn.execute("SELECT * FROM builtin_courses WHERE id = ?", (course_id,)).fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="课程不存在")
        sentences = conn.execute(
            "SELECT id, english, chinese, audio_url FROM builtin_course_sentences WHERE course_id = ? ORDER BY sort_order",
            (course_id,),
        ).fetchall()
    finally:
        conn.close()
    d = dict(course)
    d["sentences"] = [dict(s) for s in sentences]
    return envelope(0, "success", d)


@app.post("/api/practice/record")
async def upload_practice_record(req: PracticeRecordRequest, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    client_dt = validate_practice_time(req.practice_time, "当前练习")
    practice_date = shanghai_today()
    server_accuracy = (req.correct_count / req.total_sentences) * 100 if req.total_sentences > 0 else 0

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM user_practice_records WHERE id = ? AND openid = ?",
            (req.record_id, openid),
        ).fetchone()
        if existing:
            return envelope(0, "success", {"message": "Record already exists"})

        now = utcnow_iso()
        conn.execute("BEGIN IMMEDIATE")
        conn.execute('''
        INSERT INTO user_practice_records (
            id, openid, course_id, course_name, total_sentences, correct_count,
            max_combo, accuracy, duration, practice_date, practice_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            req.record_id, openid, req.course_id, req.course_name,
            req.total_sentences, req.correct_count, req.max_combo,
            server_accuracy, req.duration, practice_date.isoformat(),
            client_dt.strftime("%Y-%m-%dT%H:%M:%SZ"), now, now,
        ))

        # 保存每题答题详情
        if req.answers:
            for answer in req.answers:
                conn.execute('''
                INSERT OR IGNORE INTO user_practice_answers (
                    record_id, question_id, english, chinese, user_answer, correct_answer, is_correct, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    req.record_id, answer.questionId, answer.english, answer.chinese,
                    answer.userAnswer, answer.correctAnswer, answer.isCorrect, now
                ))

        total_days, continuous, last_date = compute_streak(openid, conn)
        total_row = conn.execute('''
            SELECT
                COALESCE(SUM(duration), 0) AS total_time,
                COALESCE(SUM(total_sentences), 0) AS total_sentences,
                COALESCE(SUM(correct_count), 0) AS total_correct
            FROM user_practice_records WHERE openid = ?
        ''', (openid,)).fetchone()

        conn.execute('''
        UPDATE user_stats SET
            total_practice_days = ?, continuous_days = ?, total_practice_time = ?,
            total_sentences = ?, total_correct = ?, last_practice_date = ?, updated_at = ?
        WHERE openid = ?
        ''', (
            total_days, continuous, total_row["total_time"],
            total_row["total_sentences"], total_row["total_correct"],
            last_date, now, openid,
        ))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        logger.exception("failed to save practice record for %s", openid)
        raise HTTPException(status_code=500, detail="保存记录失败")
    finally:
        conn.close()

    return envelope(0, "success", {"message": "Record saved successfully"})


@app.get("/api/user/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    conn = get_db_connection()
    try:
        stats = conn.execute("SELECT * FROM user_stats WHERE openid = ?", (openid,)).fetchone()
        if not stats:
            return envelope(0, "success", {
                "total_practice_days": 0, "continuous_days": 0, "total_practice_time": 0,
                "total_sentences": 0, "total_correct": 0, "accuracy": 0, "trend": [],
            })

        trend = []
        today = shanghai_today()
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            rec = conn.execute('''
                SELECT COALESCE(SUM(duration), 0) AS duration,
                       COALESCE(SUM(total_sentences), 0) AS sentences
                FROM user_practice_records
                WHERE openid = ? AND practice_date = ?
            ''', (openid, d.isoformat())).fetchone()
            trend.append({"date": d.isoformat(), "duration": rec["duration"], "sentences": rec["sentences"]})
    finally:
        conn.close()

    accuracy = (stats["total_correct"] / stats["total_sentences"]) * 100 if stats["total_sentences"] > 0 else 0
    return envelope(0, "success", {
        "total_practice_days": stats["total_practice_days"],
        "continuous_days": stats["continuous_days"],
        "total_practice_time": stats["total_practice_time"],
        "total_sentences": stats["total_sentences"],
        "total_correct": stats["total_correct"],
        "accuracy": round(accuracy, 2),
        "trend": trend,
    })


@app.post("/api/sync")
async def sync_data(req: SyncRequest, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    conn = get_db_connection()
    now = utcnow_iso()
    sync_time = now
    new_records = []
    new_courses = []

    try:
        conn.execute("BEGIN IMMEDIATE")

        for record in req.practice_records:
            client_dt = validate_practice_time(record.practice_time, f"记录 {record.record_id}")
            practice_date_shanghai = to_shanghai_date(client_dt)
            if practice_date_shanghai > shanghai_today():
                raise HTTPException(status_code=400, detail=f"记录 {record.record_id} 的练习日期在未来")
            if (shanghai_today() - practice_date_shanghai).days > MAX_HISTORY_DAYS:
                raise HTTPException(status_code=400, detail=f"记录 {record.record_id} 超过最大历史天数")

            existing = conn.execute(
                "SELECT id FROM user_practice_records WHERE id = ? AND openid = ?",
                (record.record_id, openid),
            ).fetchone()
            if existing:
                continue

            server_accuracy = (record.correct_count / record.total_sentences) * 100 if record.total_sentences > 0 else 0
            conn.execute('''
            INSERT INTO user_practice_records (
                id, openid, course_id, course_name, total_sentences, correct_count,
                max_combo, accuracy, duration, practice_date, practice_time, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.record_id, openid, record.course_id, record.course_name,
                record.total_sentences, record.correct_count, record.max_combo,
                server_accuracy, record.duration, practice_date_shanghai.isoformat(),
                client_dt.strftime("%Y-%m-%dT%H:%M:%SZ"), now, now,
            ))

            # 同步保存每题答题详情
            if hasattr(record, 'answers') and record.answers:
                for answer in record.answers:
                    conn.execute('''
                    INSERT OR IGNORE INTO user_practice_answers (
                        record_id, question_id, english, chinese, user_answer, correct_answer, is_correct, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        record.record_id, answer.questionId, answer.english, answer.chinese,
                        answer.userAnswer, answer.correctAnswer, answer.isCorrect, now
                    ))

        for course in req.user_courses:
            existing = conn.execute(
                "SELECT id FROM user_courses WHERE id = ? AND openid = ?",
                (course.id, openid),
            ).fetchone()
            if existing:
                continue
            conn.execute('''
            INSERT INTO user_courses (
                id, openid, title, description, category, difficulty,
                sentence_count, estimated_minutes, cover_image, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                course.id, openid, course.title, course.description or "",
                course.category, course.difficulty, course.sentence_count,
                course.estimated_minutes, course.cover_image or "", now, now,
            ))
            for i, sentence in enumerate(course.sentences):
                conn.execute('''
                INSERT INTO user_course_sentences (
                    course_id, english, chinese, audio_url, sort_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    course.id, sentence.english, sentence.chinese,
                    sentence.audio_url or "", i + 1, now, now,
                ))

        if req.last_sync_time:
            try:
                watermark = parse_iso_datetime(req.last_sync_time).strftime("%Y-%m-%dT%H:%M:%SZ")
            except (ValueError, TypeError):
                watermark = "1970-01-01T00:00:00Z"
            records = conn.execute('''
                SELECT * FROM user_practice_records
                WHERE openid = ? AND updated_at > ?
                ORDER BY created_at
            ''', (openid, watermark)).fetchall()
            new_records = [dict(r) for r in records]

            courses = conn.execute('''
                SELECT * FROM user_courses
                WHERE openid = ? AND updated_at > ?
                ORDER BY created_at
            ''', (openid, watermark)).fetchall()
            for c in courses:
                cd = dict(c)
                sens = conn.execute('''
                    SELECT english, chinese, audio_url FROM user_course_sentences
                    WHERE course_id = ? ORDER BY sort_order
                ''', (c["id"],)).fetchall()
                cd["sentences"] = [dict(s) for s in sens]
                new_courses.append(cd)

        total_days, continuous, last_date = compute_streak(openid, conn)
        total_row = conn.execute('''
            SELECT
                COALESCE(SUM(duration), 0) AS total_time,
                COALESCE(SUM(total_sentences), 0) AS total_sentences,
                COALESCE(SUM(correct_count), 0) AS total_correct
            FROM user_practice_records WHERE openid = ?
        ''', (openid,)).fetchone()
        conn.execute('''
        UPDATE user_stats SET
            total_practice_days = ?, continuous_days = ?, total_practice_time = ?,
            total_sentences = ?, total_correct = ?, last_practice_date = ?, updated_at = ?
        WHERE openid = ?
        ''', (
            total_days, continuous, total_row["total_time"],
            total_row["total_sentences"], total_row["total_correct"],
            last_date, now, openid,
        ))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        logger.exception("sync failed for %s", openid)
        raise HTTPException(status_code=500, detail="同步失败")
    finally:
        conn.close()

    return envelope(0, "success", {
        "sync_time": sync_time,
        "new_records": new_records,
        "new_courses": new_courses,
    })


@app.get("/api/practice/sessions/{session_id}/result")
async def get_practice_result(session_id: str, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    conn = get_db_connection()
    try:
        # 校验练习会话是否存在且属于当前用户
        record = conn.execute('''
            SELECT * FROM user_practice_records WHERE id = ? AND openid = ?
        ''', (session_id, openid)).fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="练习会话不存在")
        
        # 获取错题列表
        mistakes = conn.execute('''
            SELECT question_id, chinese, user_answer, correct_answer FROM user_practice_answers
            WHERE record_id = ? AND is_correct = 0
            ORDER BY id
        ''', (session_id,)).fetchall()

        return envelope(0, "success", {
            "sessionId": record["id"],
            "totalCount": record["total_sentences"],
            "correctCount": record["correct_count"],
            "mistakeCount": record["total_sentences"] - record["correct_count"],
            "accuracy": round(record["accuracy"], 1),
            "mistakes": [
                {
                    "questionId": m["question_id"],
                    "chinese": m["chinese"],
                    "userAnswer": m["user_answer"],
                    "correctAnswer": m["correct_answer"]
                } for m in mistakes
            ]
        })
    finally:
        conn.close()


@app.post("/api/practice/sessions/{session_id}/retry-mistakes")
async def create_retry_session(session_id: str, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")

        # 校验原练习会话是否存在且属于当前用户
        original_record = conn.execute('''
            SELECT * FROM user_practice_records WHERE id = ? AND openid = ?
        ''', (session_id, openid)).fetchone()
        if not original_record:
            raise HTTPException(status_code=404, detail="练习会话不存在")
        
        # 幂等性检查：是否已经创建过重试会话
        existing_retry = conn.execute('''
            SELECT id FROM user_practice_records WHERE original_record_id = ? AND openid = ?
            LIMIT 1
        ''', (session_id, openid)).fetchone()
        if existing_retry:
            retry_session_id = existing_retry["id"]
        else:
            # 获取错题列表
            mistakes = conn.execute('''
                SELECT question_id, english, chinese, correct_answer FROM user_practice_answers
                WHERE record_id = ? AND is_correct = 0
                ORDER BY id
            ''', (session_id,)).fetchall()

            if not mistakes:
                raise HTTPException(status_code=400, detail="该练习没有错题，无需重练")
            
            # 创建新的重试会话
            retry_session_id = f"retry_{session_id}_{uuid.uuid4().hex[:8]}"
            now = utcnow_iso()
            practice_date = shanghai_today()
            
            # 插入练习记录
            conn.execute('''
            INSERT INTO user_practice_records (
                id, openid, course_id, course_name, total_sentences, correct_count,
                max_combo, accuracy, duration, practice_date, practice_time, 
                original_record_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                retry_session_id, openid, original_record["course_id"], 
                f"[错题重练] {original_record['course_name']}", len(mistakes),
                0, 0, 0.0, 0, practice_date.isoformat(), now,
                session_id, now, now
            ))

            # 插入答题详情（预填正确答案，用户答题后会更新）
            for mistake in mistakes:
                conn.execute('''
                INSERT OR IGNORE INTO user_practice_answers (
                    record_id, question_id, english, chinese, user_answer, correct_answer, is_correct, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    retry_session_id, mistake["question_id"], mistake["english"],
                    mistake["chinese"], "", mistake["correct_answer"], False, now
                ))

            conn.commit()
        
        # 返回重试会话信息
        questions = conn.execute('''
            SELECT english, chinese FROM user_practice_answers
            WHERE record_id = ? ORDER BY id
        ''', (retry_session_id,)).fetchall()

        return envelope(0, "success", {
            "sessionId": retry_session_id,
            "questionCount": len(questions),
            "questions": [
                {
                    "english": q["english"],
                    "chinese": q["chinese"],
                    "audio_url": ""
                } for q in questions
            ]
        })
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        logger.exception("failed to create retry session for %s", openid)
        raise HTTPException(status_code=500, detail="创建重练会话失败")
    finally:
        conn.close()


@app.post("/api/ai/generate-course")
async def generate_ai_course(req: AIGenerateCourseRequest, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    if not DOUBAO_API_KEY:
        raise HTTPException(status_code=501, detail="AI 课程生成功能未配置")

    difficulty_names = {1: "入门级", 2: "初级", 3: "中级", 4: "高级", 5: "专家级"}
    difficulty_name = difficulty_names.get(req.difficulty, "中级")

    prompt = f"""
    请生成一套关于"{req.topic}"的英语学习课程，难度为{difficulty_name}，包含{req.sentence_count}个句子。

    要求：
    1. 每个句子包含英文原文和对应的中文翻译
    2. 句子内容实用，贴近生活/工作场景
    3. 难度符合要求，词汇和语法适合对应水平
    4. 句子之间有逻辑关联，围绕主题展开
    5. 返回格式为JSON，包含以下字段：
       - title: 课程标题（简洁明了，不超过20字）
       - description: 课程描述（不超过100字）
       - category: 课程分类（daily/business/campus/other）
       - sentences: 数组，每个元素包含english和chinese字段

    只返回JSON，不要其他内容。
    """

    try:
        headers = {"Authorization": f"Bearer {DOUBAO_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "doubao-pro-4k",
            "messages": [
                {"role": "system", "content": "你是一个专业的英语学习内容生成助手，擅长生成高质量的英语学习课程。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        resp = requests.post(DOUBAO_API_ENDPOINT, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        ai_text = result["choices"][0]["message"]["content"]

        m = re.search(r'({.*})', ai_text, re.DOTALL)
        if not m:
            raise ValueError("AI response did not contain JSON")
        course_data = json.loads(m.group(1))

        for field in ("title", "description", "category", "sentences"):
            if field not in course_data:
                raise ValueError(f"AI response missing field: {field}")

        sentences = course_data["sentences"]
        if not isinstance(sentences, list):
            raise ValueError("sentences must be a list")
        sentences_out = []
        for s in sentences:
            if not isinstance(s, dict) or "english" not in s or "chinese" not in s:
                continue
            sentences_out.append({"english": str(s["english"]), "chinese": str(s["chinese"])})
        if len(sentences_out) > req.sentence_count:
            sentences_out = sentences_out[:req.sentence_count]
        while len(sentences_out) < req.sentence_count:
            idx = len(sentences_out) + 1
            sentences_out.append({"english": f"Example sentence {idx}", "chinese": f"示例句子 {idx}"})

        course_id = f"user_{uuid.uuid4().hex[:16]}"
        now = utcnow_iso()
        estimated = max(5, req.sentence_count // 2)

        conn = get_db_connection()
        try:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute('''
            INSERT INTO user_courses (
                id, openid, title, description, category, difficulty,
                sentence_count, estimated_minutes, cover_image, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                course_id, openid, course_data["title"], course_data.get("description", ""),
                course_data["category"], req.difficulty, req.sentence_count,
                estimated, "", now, now,
            ))
            for i, s in enumerate(sentences_out):
                conn.execute('''
                INSERT INTO user_course_sentences (
                    course_id, english, chinese, sort_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ''', (course_id, s["english"], s["chinese"], i + 1, now, now))
            conn.commit()
        except Exception:
            conn.rollback()
            logger.exception("failed to save AI course for %s", openid)
            raise HTTPException(status_code=500, detail="课程保存失败")
        finally:
            conn.close()

        return envelope(0, "success", {
            "course_id": course_id,
            "title": course_data["title"],
            "description": course_data.get("description", ""),
            "category": course_data["category"],
            "difficulty": req.difficulty,
            "sentence_count": req.sentence_count,
            "estimated_minutes": estimated,
            "cover_image": "",
            "sentences": sentences_out,
        })
    except requests.RequestException:
        logger.exception("doubao API request failed")
        raise HTTPException(status_code=500, detail="AI 服务调用失败")
    except (json.JSONDecodeError, ValueError, KeyError):
        logger.exception("failed to parse doubao response")
        raise HTTPException(status_code=500, detail="AI 返回内容解析失败")


@app.get("/api/courses/user/{course_id}")
async def get_user_course_detail(course_id: str, current_user: dict = Depends(get_current_user)):
    openid = current_user["openid"]
    conn = get_db_connection()
    try:
        course = conn.execute(
            "SELECT * FROM user_courses WHERE id = ? AND openid = ?",
            (course_id, openid),
        ).fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="课程不存在")
        sens = conn.execute('''
            SELECT english, chinese, audio_url FROM user_course_sentences
            WHERE course_id = ? ORDER BY sort_order
        ''', (course_id,)).fetchall()
    finally:
        conn.close()
    d = dict(course)
    d["sentences"] = [dict(s) for s in sens]
    return envelope(0, "success", d)


@app.get("/api/health")
async def health():
    return envelope(0, "ok", {"status": "up"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=DEBUG)
