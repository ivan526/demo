"""Tests for /api/practice/sessions/{id}/result and /retry-mistakes endpoints.

Covers four required scenarios:
  1. Permission: user cannot access another user's session.
  2. Idempotency: repeated retry-mistakes calls return the same sessionId.
  3. Empty mistakes: a perfect score (no wrong answers) returns 400.
  4. Normal retry flow: create retry, verify phonetic is present, submit answers.
"""
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
    correct=1,
    answers=None,
):
    """Helper: submit a practice record via /api/practice/record."""
    if answers is None:
        answers = [
            {
                "questionId": f"q{i+1}",
                "english": f"Hello {i+1}",
                "chinese": f"你好{i+1}",
                "phonetic": f"/həˈləʊ {i+1}/",
                "userAnswer": f"ans{i+1}",
                "correctAnswer": f"correct{i+1}",
                "isCorrect": (i < correct),
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
        "accuracy": round(correct / total * 100, 2),
        "duration": 60,
        "practice_time": "2026-07-17T10:00:00Z",
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


def _create_retry(client, token, session_id, expected_code=0):
    r = client.post(
        f"/api/practice/sessions/{session_id}/retry-mistakes",
        headers=_auth_headers(token),
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_permission_cannot_access_other_users_session(client):
    """RVW-BE permission test: user A cannot read or retry user B's session."""
    c, _ = client
    token_a, openid_a = _login(c, "userA")
    token_b, openid_b = _login(c, "userB")

    rid_a = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token_a, record_id=rid_a, total=3, correct=1)

    # User B attempts to read A's result -> 404
    r = c.get(
        f"/api/practice/sessions/{rid_a}/result",
        headers=_auth_headers(token_b),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4041, body  # 404 mapped to 4041
    assert "不存在" in body["message"]

    # User B attempts to retry A's session -> 404
    r = c.post(
        f"/api/practice/sessions/{rid_a}/retry-mistakes",
        headers=_auth_headers(token_b),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4041, body


def test_idempotency_double_retry_returns_same_session(client):
    """RVW-BE-004 idempotency: two retry-mistakes calls return the same sessionId."""
    c, _ = client
    token, _ = _login(c, "user1")

    rid = f"rec_{uuid.uuid4().hex[:12]}"
    _submit_practice(c, token, record_id=rid, total=3, correct=1)

    body1 = _create_retry(c, token, rid)
    assert body1["code"] == 0
    sid1 = body1["data"]["sessionId"]
    assert body1["data"]["questionCount"] == 2  # 3 - 1 correct = 2 mistakes

    body2 = _create_retry(c, token, rid)
    assert body2["code"] == 0
    sid2 = body2["data"]["sessionId"]

    assert sid1 == sid2, "idempotent retry must return the same sessionId"
    assert body2["data"]["questionCount"] == 2


def test_empty_mistakes_returns_400(client):
    """REVIEW-TEST-003: perfect score (no mistakes) returns 400."""
    c, _ = client
    token, _ = _login(c, "user1")

    rid = f"rec_{uuid.uuid4().hex[:12]}"
    # All answers correct -> no mistakes
    _submit_practice(c, token, record_id=rid, total=3, correct=3)

    r = c.post(
        f"/api/practice/sessions/{rid}/retry-mistakes",
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 4001, body
    assert "没有错题" in body["message"]


def test_normal_retry_flow_and_phonetic_field(client):
    """Full-flow test: result includes phonetic; retry session works; retry record can be saved."""
    c, main_mod = client
    token, _ = _login(c, "user1")

    rid = f"rec_{uuid.uuid4().hex[:12]}"
    answers = [
        {
            "questionId": "q1",
            "english": "Hello",
            "chinese": "你好",
            "phonetic": "/həˈləʊ/",
            "userAnswer": "Hello",
            "correctAnswer": "Hello",
            "isCorrect": True,
        },
        {
            "questionId": "q2",
            "english": "Thank you",
            "chinese": "谢谢你",
            "phonetic": "/θæŋk juː/",
            "userAnswer": "Thanks",
            "correctAnswer": "Thank you",
            "isCorrect": False,
        },
        {
            "questionId": "q3",
            "english": "Goodbye",
            "chinese": "再见",
            "phonetic": "/ɡʊdˈbaɪ/",
            "userAnswer": "Bye",
            "correctAnswer": "Goodbye",
            "isCorrect": False,
        },
    ]
    _submit_practice(
        c, token, record_id=rid, total=3, correct=1, answers=answers
    )

    # Fetch result and verify phonetic is present in mistakes
    r = c.get(
        f"/api/practice/sessions/{rid}/result",
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    data = body["data"]
    assert data["sessionId"] == rid
    assert data["totalCount"] == 3
    assert data["correctCount"] == 1
    assert data["mistakeCount"] == 2
    assert len(data["mistakes"]) == 2
    for m in data["mistakes"]:
        assert "phonetic" in m, "mistake must include phonetic field"
        assert m["phonetic"] in ("/θæŋk juː/", "/ɡʊdˈbaɪ/")
        assert m["questionId"] in ("q2", "q3")
        assert m["english"] in ("Thank you", "Goodbye")

    # Create retry session
    retry_body = _create_retry(c, token, rid)
    assert retry_body["code"] == 0
    retry_sid = retry_body["data"]["sessionId"]
    assert retry_body["data"]["questionCount"] == 2
    for q in retry_body["data"]["questions"]:
        assert "phonetic" in q, "retry question must include phonetic"
        assert q["phonetic"]  # non-empty for our test data

    # Submit the retry result as a new practice record (key regression test for RVW-BE-002)
    retry_answers = [
        {
            "questionId": "q2",
            "english": "Thank you",
            "chinese": "谢谢你",
            "phonetic": "/θæŋk juː/",
            "userAnswer": "Thank you",
            "correctAnswer": "Thank you",
            "isCorrect": True,
        },
        {
            "questionId": "q3",
            "english": "Goodbye",
            "chinese": "再见",
            "phonetic": "/ɡʊdˈbaɪ/",
            "userAnswer": "Bye bye",
            "correctAnswer": "Goodbye",
            "isCorrect": False,
        },
    ]
    r = c.post(
        "/api/practice/record",
        json={
            "record_id": retry_sid,
            "course_id": "course1",
            "course_name": "[错题重练] 测试课程",
            "total_sentences": 2,
            "correct_count": 1,
            "max_combo": 1,
            "accuracy": 50.0,
            "duration": 30,
            "practice_time": "2026-07-17T10:05:00Z",
            "answers": retry_answers,
        },
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0, f"retry record save must succeed: {body}"
    assert "already exists" not in body.get("message", ""), (
        "RVW-BE-002 regression: retry record was not pre-created, so submit must not hit "
        "'Record already exists' early return"
    )

    # Verify the saved retry record is linked to original via original_record_id
    conn = main_mod.get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, original_record_id FROM user_practice_records WHERE id = ?",
            (retry_sid,),
        ).fetchone()
        assert row is not None, "retry record must exist in DB"
        assert row["original_record_id"] == rid, (
            "retry record must point back to original session via mapping table"
        )
        ans_rows = conn.execute(
            "SELECT question_id FROM user_practice_answers WHERE record_id = ? ORDER BY id",
            (retry_sid,),
        ).fetchall()
        saved_qids = [r["question_id"] for r in ans_rows]
        assert saved_qids == ["q2", "q3"], (
            "RVW-BE-002 regression: submitted retry answers must be persisted (not blocked by placeholder rows)"
        )
    finally:
        conn.close()

    # Verify retry result endpoint returns the newly saved retry record correctly
    r = c.get(
        f"/api/practice/sessions/{retry_sid}/result",
        headers=_auth_headers(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["totalCount"] == 2
    assert body["data"]["correctCount"] == 1
    assert body["data"]["mistakeCount"] == 1
    assert len(body["data"]["mistakes"]) == 1
    assert body["data"]["mistakes"][0]["questionId"] == "q3"
    assert body["data"]["mistakes"][0]["phonetic"] == "/ɡʊdˈbaɪ/"


def test_unauthenticated_access_blocked(client):
    """Endpoints require auth (errors are wrapped in HTTP 200 envelope per app convention)."""
    c, _ = client
    r = c.get("/api/practice/sessions/anything/result")
    assert r.status_code == 200
    assert r.json()["code"] in (4011, 4031)
    r = c.post("/api/practice/sessions/anything/retry-mistakes")
    assert r.status_code == 200
    assert r.json()["code"] in (4011, 4031)
