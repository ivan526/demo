"""Comprehensive backend tests covering auth, courses, practice, sync, stats."""
import uuid
import pytest

from .conftest import _login, _auth_headers


def _submit_practice(
    client,
    token,
    record_id,
    course_id="course1",
    course_name="测试课程",
    total=3,
    correct=2,
    answers=None,
    practice_time="2026-07-17T10:00:00Z",
    duration=60,
):
    if answers is None:
        answers = [
            {
                "questionId": f"q{i+1}",
                "english": f"Hello {i+1}",
                "chinese": f"你好{i+1}",
                "phonetic": f"/həˈləʊ {i+1}/",
                "userAnswer": f"ans{i+1}" if i < correct else f"wrong{i+1}",
                "correctAnswer": f"correct{i+1}",
                "isCorrect": i < correct,
            }
            for i in range(total)
        ]
    payload = {
        "record_id": record_id,
        "course_id": course_id,
        "course_name": course_name,
        "total_sentences": total,
        "correct_count": correct,
        "max_combo": correct,
        "accuracy": round(correct / total * 100, 2) if total > 0 else 0,
        "duration": duration,
        "practice_time": practice_time,
        "answers": answers,
    }
    r = client.post(
        "/api/practice/record",
        json=payload,
        headers=_auth_headers(token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0, body
    return body


def test_health_endpoint(client):
    c, _ = client
    r = c.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["status"] == "up"


def test_wx_login_mock_creates_user(client):
    c, _ = client
    r = c.post("/api/auth/wx-login", json={"code": "testcode1", "nickname": "Alice", "avatar": "http://example.com/a.png"})
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert "token" in body["data"]
    assert body["data"]["user_info"]["nickname"] == "Alice"
    assert body["data"]["user_info"]["avatar"] == "http://example.com/a.png"
    assert body["data"]["user_info"]["openid"].startswith("mock_")


def test_wx_login_idempotent_updates_profile(client):
    c, _ = client
    r1 = c.post("/api/auth/wx-login", json={"code": "same-code", "nickname": "First"})
    assert r1.status_code == 200
    token1 = r1.json()["data"]["token"]
    openid1 = r1.json()["data"]["user_info"]["openid"]

    r2 = c.post("/api/auth/wx-login", json={"code": "same-code", "nickname": "Second", "avatar": "http://x"})
    assert r2.status_code == 200
    assert r2.json()["data"]["user_info"]["openid"] == openid1
    assert r2.json()["data"]["user_info"]["nickname"] == "Second"
    assert r2.json()["data"]["user_info"]["avatar"] == "http://x"


def test_builtin_courses_list(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/builtin", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert isinstance(body["data"], list)
    assert len(body["data"]) >= 3
    course = body["data"][0]
    assert "id" in course
    assert "title" in course
    assert "difficulty" in course


def test_builtin_courses_filter_by_category(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/builtin?category=daily", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    for course in body["data"]:
        assert course["category"] == "daily"


def test_builtin_course_detail_returns_phonetic(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/builtin/1", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert "sentences" in body["data"]
    assert len(body["data"]["sentences"]) == 10
    for s in body["data"]["sentences"]:
        assert "english" in s
        assert "chinese" in s
        assert "phonetic" in s
        assert s["phonetic"] == ""


def test_builtin_course_detail_not_found(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/builtin/99999", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4041


def test_practice_record_submit_and_idempotent(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=rid, total=3, correct=2)

    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "course1",
            "course_name": "测试课程",
            "total_sentences": 3,
            "correct_count": 2,
            "max_combo": 2,
            "accuracy": 66.67,
            "duration": 60,
            "practice_time": "2026-07-17T10:00:00Z",
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert "already exists" in body["data"]["message"]


def test_practice_record_invalid_time_rejected(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "course1",
            "course_name": "测试课程",
            "total_sentences": 3,
            "correct_count": 2,
            "max_combo": 2,
            "accuracy": 66.67,
            "duration": 60,
            "practice_time": "2099-01-01T00:00:00Z",
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4001


def test_practice_record_validation_error(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "course1",
            "course_name": "测试课程",
            "total_sentences": 3,
            "correct_count": 5,
            "max_combo": 2,
            "accuracy": 66.67,
            "duration": 60,
            "practice_time": "2026-07-17T10:00:00Z",
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4001


def test_practice_result_endpoint(client):
    c, main_mod = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    answers = [
        {"questionId": "q1", "english": "Hello", "chinese": "你好", "phonetic": "/həˈləʊ/",
         "userAnswer": "Hello", "correctAnswer": "Hello", "isCorrect": True},
        {"questionId": "q2", "english": "Thanks", "chinese": "谢谢", "phonetic": "/θæŋks/",
         "userAnswer": "Thank", "correctAnswer": "Thanks", "isCorrect": False},
    ]
    _submit_practice(c, token, record_id=rid, total=2, correct=1, answers=answers)

    r = c.get(f"/api/practice/sessions/{rid}/result", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    data = body["data"]
    assert data["sessionId"] == rid
    assert data["totalCount"] == 2
    assert data["correctCount"] == 1
    assert data["mistakeCount"] == 1
    assert len(data["mistakes"]) == 1
    assert data["mistakes"][0]["questionId"] == "q2"
    assert data["mistakes"][0]["phonetic"] == "/θæŋks/"


def test_practice_result_not_found_for_other_user(client):
    c, _ = client
    token_a, _ = _login(c, "userA")
    token_b, _ = _login(c, "userB")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token_a, record_id=rid, total=2, correct=1)

    r = c.get(f"/api/practice/sessions/{rid}/result", headers=_auth_headers(token_b))
    assert r.status_code == 200
    assert r.json()["code"] == 4041


def test_retry_session_not_found(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.post("/api/practice/sessions/nonexistent/retry-mistakes", headers=_auth_headers(token))
    assert r.status_code == 200
    assert r.json()["code"] == 4041


def test_user_stats_initial(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/user/stats", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["total_practice_days"] == 0
    assert body["data"]["continuous_days"] == 0
    assert body["data"]["total_sentences"] == 0
    assert body["data"]["accuracy"] == 0
    assert "trend" in body["data"]
    assert len(body["data"]["trend"]) == 7


def test_user_stats_after_practice(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=rid, total=3, correct=2, duration=120)

    r = c.get("/api/user/stats", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["total_sentences"] == 3
    assert body["data"]["total_correct"] == 2
    assert body["data"]["total_practice_time"] == 120
    assert body["data"]["total_practice_days"] >= 1


def test_sync_course_with_phonetic(client):
    c, _ = client
    token, _ = _login(c, "user1")
    course_id = f"uc_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/sync",
        json={
            "last_sync_time": "1970-01-01T00:00:00Z",
            "practice_records": [],
            "user_courses": [
                {
                    "id": course_id,
                    "title": "My Course",
                    "category": "daily",
                    "difficulty": 1,
                    "sentence_count": 2,
                    "estimated_minutes": 2,
                    "description": "desc",
                    "cover_image": "",
                    "sentences": [
                        {"english": "Hello", "chinese": "你好", "phonetic": "/həˈləʊ/", "audio_url": ""},
                        {"english": "Bye", "chinese": "再见", "phonetic": "/baɪ/", "audio_url": ""},
                    ],
                }
            ],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert len(body["data"]["new_courses"]) == 1
    synced_course = body["data"]["new_courses"][0]
    assert synced_course["id"] == course_id
    assert len(synced_course["sentences"]) == 2
    assert synced_course["sentences"][0]["phonetic"] == "/həˈləʊ/"
    assert synced_course["sentences"][1]["phonetic"] == "/baɪ/"


def test_sync_user_course_detail_has_phonetic(client):
    c, _ = client
    token, _ = _login(c, "user1")
    course_id = f"uc_{uuid.uuid4().hex[:12]}"
    c.post(
        "/api/sync",
        json={
            "user_courses": [
                {
                    "id": course_id,
                    "title": "Phonetic Course",
                    "category": "daily",
                    "difficulty": 1,
                    "sentence_count": 1,
                    "estimated_minutes": 1,
                    "sentences": [
                        {"english": "Hi", "chinese": "嗨", "phonetic": "/haɪ/"},
                    ],
                }
            ],
            "practice_records": [],
        },
        headers=_auth_headers(token),
    )
    r = c.get(f"/api/courses/user/{course_id}", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["sentences"][0]["phonetic"] == "/haɪ/"


def test_sync_user_course_not_found(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/user/nonexistent", headers=_auth_headers(token))
    assert r.status_code == 200
    assert r.json()["code"] == 4041


def test_sync_practice_record(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/sync",
        json={
            "last_sync_time": "1970-01-01T00:00:00Z",
            "practice_records": [
                {
                    "record_id": rid,
                    "course_id": "c1",
                    "course_name": "Course",
                    "total_sentences": 2,
                    "correct_count": 1,
                    "max_combo": 1,
                    "accuracy": 50.0,
                    "duration": 30,
                    "practice_time": "2026-07-17T09:00:00Z",
                    "answers": [
                        {"questionId": "q1", "english": "A", "chinese": "甲", "phonetic": "/eɪ/",
                         "userAnswer": "A", "correctAnswer": "A", "isCorrect": True},
                        {"questionId": "q2", "english": "B", "chinese": "乙", "phonetic": "/biː/",
                         "userAnswer": "X", "correctAnswer": "B", "isCorrect": False},
                    ],
                }
            ],
            "user_courses": [],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert len(body["data"]["new_records"]) == 1

    r2 = c.get(f"/api/practice/sessions/{rid}/result", headers=_auth_headers(token))
    assert r2.status_code == 200
    data = r2.json()["data"]
    assert data["totalCount"] == 2
    assert data["mistakeCount"] == 1
    assert data["mistakes"][0]["phonetic"] == "/biː/"


def test_sync_retry_record_sets_original_record_id(client):
    c, main_mod = client
    token, _ = _login(c, "user1")

    original_rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=original_rid, total=2, correct=1)

    retry_body = c.post(
        f"/api/practice/sessions/{original_rid}/retry-mistakes",
        headers=_auth_headers(token),
    ).json()
    retry_sid = retry_body["data"]["sessionId"]

    sync_rid = f"syncrec_{uuid.uuid4().hex[:8]}"
    r = c.post(
        "/api/sync",
        json={
            "practice_records": [
                {
                    "record_id": retry_sid,
                    "course_id": "c1",
                    "course_name": "[Retry] Course",
                    "total_sentences": 1,
                    "correct_count": 1,
                    "max_combo": 1,
                    "accuracy": 100.0,
                    "duration": 15,
                    "practice_time": "2026-07-17T10:30:00Z",
                    "answers": [
                        {"questionId": "q2", "english": "B", "chinese": "乙", "phonetic": "/biː/",
                         "userAnswer": "B", "correctAnswer": "B", "isCorrect": True},
                    ],
                }
            ],
            "user_courses": [],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 0

    conn = main_mod.get_db_connection()
    try:
        row = conn.execute(
            "SELECT original_record_id FROM user_practice_records WHERE id = ?",
            (retry_sid,),
        ).fetchone()
        assert row is not None
        assert row["original_record_id"] == original_rid
    finally:
        conn.close()


def test_ai_generate_course_unconfigured(client, monkeypatch):
    c, _ = client
    token, _ = _login(c, "user1")
    monkeypatch.delenv("DOUBAO_API_KEY", raising=False)
    import importlib
    import main as main_mod
    main_mod.DOUBAO_API_KEY = ""
    r = c.post(
        "/api/ai/generate-course",
        json={"topic": "test", "difficulty": 2, "sentence_count": 5},
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 5002


def test_cross_user_course_access_blocked(client):
    c, _ = client
    token_a, _ = _login(c, "userA")
    token_b, _ = _login(c, "userB")
    course_id = f"uc_{uuid.uuid4().hex[:12]}"
    c.post(
        "/api/sync",
        json={
            "user_courses": [
                {
                    "id": course_id,
                    "title": "A's course",
                    "category": "daily",
                    "difficulty": 1,
                    "sentence_count": 1,
                    "estimated_minutes": 1,
                    "sentences": [{"english": "A", "chinese": "甲"}],
                }
            ],
            "practice_records": [],
        },
        headers=_auth_headers(token_a),
    )
    r = c.get(f"/api/courses/user/{course_id}", headers=_auth_headers(token_b))
    assert r.status_code == 200
    assert r.json()["code"] == 4041


def test_practice_result_not_found(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/practice/sessions/nonexistent/result", headers=_auth_headers(token))
    assert r.status_code == 200
    assert r.json()["code"] == 4041


def test_sync_invalid_future_date_rejected(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.post(
        "/api/sync",
        json={
            "practice_records": [
                {
                    "record_id": "future_rec",
                    "course_id": "c1",
                    "course_name": "C",
                    "total_sentences": 1,
                    "correct_count": 1,
                    "max_combo": 1,
                    "accuracy": 100.0,
                    "duration": 10,
                    "practice_time": "2099-01-01T00:00:00Z",
                }
            ],
            "user_courses": [],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 4001


def test_sync_deduplicates_existing_courses(client):
    c, _ = client
    token, _ = _login(c, "user1")
    course_id = f"uc_{uuid.uuid4().hex[:12]}"
    course_payload = {
        "id": course_id,
        "title": "My Course",
        "category": "daily",
        "difficulty": 1,
        "sentence_count": 1,
        "estimated_minutes": 1,
        "sentences": [{"english": "Hi", "chinese": "嗨", "phonetic": "/haɪ/"}],
    }
    r1 = c.post(
        "/api/sync",
        json={"user_courses": [course_payload], "practice_records": []},
        headers=_auth_headers(token),
    )
    assert r1.status_code == 200
    assert r1.json()["code"] == 0

    r2 = c.post(
        "/api/sync",
        json={"user_courses": [course_payload], "practice_records": []},
        headers=_auth_headers(token),
    )
    assert r2.status_code == 200
    assert r2.json()["code"] == 0


def test_builtin_courses_filter_by_difficulty(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.get("/api/courses/builtin?difficulty=1", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    for course in body["data"]:
        assert course["difficulty"] == 1


def test_practice_record_answers_length_mismatch(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "c1",
            "course_name": "C",
            "total_sentences": 3,
            "correct_count": 1,
            "max_combo": 1,
            "accuracy": 33.3,
            "duration": 30,
            "practice_time": "2026-07-17T10:00:00Z",
            "answers": [
                {"questionId": "q1", "english": "A", "chinese": "甲", "phonetic": "",
                 "userAnswer": "A", "correctAnswer": "A", "isCorrect": True},
            ],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 4001


def test_user_stats_after_multiple_practices(client):
    c, _ = client
    token, _ = _login(c, "user1")
    for i in range(2):
        _submit_practice(c, token, record_id=f"rec_{uuid.uuid4().hex[:12]}_{i}", total=2, correct=1, duration=60)

    r = c.get("/api/user/stats", headers=_auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["total_sentences"] == 4
    assert body["data"]["total_correct"] == 2
    assert body["data"]["total_practice_time"] == 120
    assert body["data"]["continuous_days"] >= 1


def test_retry_after_perfect_score_is_blocked(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=rid, total=2, correct=2)
    r = c.post(f"/api/practice/sessions/{rid}/retry-mistakes", headers=_auth_headers(token))
    assert r.status_code == 200
    assert r.json()["code"] == 4001


def test_practice_record_invalid_time_format(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "c1",
            "course_name": "C",
            "total_sentences": 1,
            "correct_count": 1,
            "max_combo": 1,
            "accuracy": 100.0,
            "duration": 10,
            "practice_time": "not-a-date",
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 4001


def test_sync_too_old_date_rejected(client):
    c, _ = client
    token, _ = _login(c, "user1")
    r = c.post(
        "/api/sync",
        json={
            "practice_records": [
                {
                    "record_id": "old_rec",
                    "course_id": "c1",
                    "course_name": "C",
                    "total_sentences": 1,
                    "correct_count": 1,
                    "max_combo": 1,
                    "accuracy": 100.0,
                    "duration": 10,
                    "practice_time": "2000-01-01T00:00:00Z",
                }
            ],
            "user_courses": [],
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 4001


def test_sync_returns_new_records_and_updates_stats(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=rid, total=2, correct=1, duration=45)

    r = c.post(
        "/api/sync",
        json={"last_sync_time": "1970-01-01T00:00:00Z", "practice_records": [], "user_courses": []},
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert len(body["data"]["new_records"]) >= 1
    assert "sync_time" in body["data"]


def test_practice_record_without_answers(client):
    c, _ = client
    token, _ = _login(c, "user1")
    rid = f"rec_{uuid.uuid4().hex[:12]}"
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": rid,
            "course_id": "c1",
            "course_name": "C",
            "total_sentences": 2,
            "correct_count": 2,
            "max_combo": 2,
            "accuracy": 100.0,
            "duration": 30,
            "practice_time": "2026-07-17T10:00:00Z",
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    assert r.json()["code"] == 0

    r2 = c.get(f"/api/practice/sessions/{rid}/result", headers=_auth_headers(token))
    assert r2.status_code == 200
    data = r2.json()["data"]
    assert data["totalCount"] == 2
    assert data["correctCount"] == 2
    assert data["mistakeCount"] == 0
    assert data["mistakes"] == []
