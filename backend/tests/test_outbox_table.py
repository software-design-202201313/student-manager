"""SMS-50: public.outbox 테이블 INSERT / UPDATE 단순 시나리오 + 부분 인덱스 검증."""
from __future__ import annotations

import os
import uuid

import pytest

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:  # pragma: no cover
    psycopg2 = None
    Json = None


POSTGRES_URL = os.environ.get(
    "POSTGRES_TEST_URL",
    "postgresql://sm:smpass@localhost:5432/student_manager",
)


@pytest.fixture(scope="module")
def pg_conn():
    if psycopg2 is None:
        pytest.skip("psycopg2 not installed")
    try:
        conn = psycopg2.connect(POSTGRES_URL, connect_timeout=2)
    except psycopg2.OperationalError as exc:
        pytest.skip(f"postgres unavailable: {exc}")
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def isolated_outbox(pg_conn):
    """Each test runs inside a savepoint that's rolled back, so the table stays clean."""
    pg_conn.autocommit = False
    with pg_conn.cursor() as cur:
        cur.execute("SAVEPOINT t")
    yield pg_conn
    with pg_conn.cursor() as cur:
        cur.execute("ROLLBACK TO SAVEPOINT t")
    pg_conn.rollback()


def test_insert_grade_event_row(isolated_outbox):
    aggregate_id = uuid.uuid4()
    payload = {
        "grade_id": str(uuid.uuid4()),
        "student_id": str(uuid.uuid4()),
        "op": "UPSERT",
    }
    with isolated_outbox.cursor() as cur:
        cur.execute(
            """
            INSERT INTO public.outbox (aggregate_type, aggregate_id, topic, payload)
            VALUES (%s, %s, %s, %s)
            RETURNING event_id, created_at, sent_at
            """,
            ("grade", str(aggregate_id), "grade_events", Json(payload)),
        )
        event_id, created_at, sent_at = cur.fetchone()

    assert isinstance(event_id, int)
    assert event_id > 0  # BIGSERIAL/Identity assigned
    assert created_at is not None  # server_default now() applied
    assert sent_at is None  # newly inserted row is unsent

    with isolated_outbox.cursor() as cur:
        cur.execute("SELECT payload FROM public.outbox WHERE event_id = %s", (event_id,))
        stored = cur.fetchone()[0]
    assert stored == payload  # JSONB round-trip


def test_publisher_marks_row_sent(isolated_outbox):
    """publisher가 sent_at = now()로 update하면 부분 인덱스 대상에서 제외됨."""
    with isolated_outbox.cursor() as cur:
        cur.execute(
            "INSERT INTO public.outbox (aggregate_type, aggregate_id, topic, payload) "
            "VALUES (%s, %s, %s, %s) RETURNING event_id",
            ("grade", str(uuid.uuid4()), "grade_events", Json({"k": "v"})),
        )
        event_id = cur.fetchone()[0]

        cur.execute("UPDATE public.outbox SET sent_at = now() WHERE event_id = %s", (event_id,))
        assert cur.rowcount == 1

        cur.execute("SELECT sent_at FROM public.outbox WHERE event_id = %s", (event_id,))
        assert cur.fetchone()[0] is not None


def test_partial_index_only_covers_unsent(isolated_outbox):
    """outbox_unsent_idx는 sent_at IS NULL row만 포함 — 정의로 검증."""
    with isolated_outbox.cursor() as cur:
        cur.execute(
            "SELECT indexdef FROM pg_indexes "
            "WHERE tablename = 'outbox' AND indexname = 'outbox_unsent_idx'"
        )
        row = cur.fetchone()
    assert row is not None, "outbox_unsent_idx missing"
    assert "WHERE (sent_at IS NULL)" in row[0]


def test_required_columns_not_null(isolated_outbox):
    """aggregate_type / aggregate_id / topic / payload 누락 시 에러."""
    with isolated_outbox.cursor() as cur:
        with pytest.raises(psycopg2.errors.NotNullViolation):
            cur.execute(
                "INSERT INTO public.outbox (aggregate_type) VALUES (%s)",
                ("grade",),
            )


def test_payload_round_trip_preserves_unicode(isolated_outbox):
    payload = {"name": "김철수", "subject": "수학", "score": 92.5}
    with isolated_outbox.cursor() as cur:
        cur.execute(
            "INSERT INTO public.outbox (aggregate_type, aggregate_id, topic, payload) "
            "VALUES (%s, %s, %s, %s) RETURNING event_id",
            ("grade", str(uuid.uuid4()), "grade_events", Json(payload)),
        )
        event_id = cur.fetchone()[0]
        cur.execute("SELECT payload FROM public.outbox WHERE event_id = %s", (event_id,))
        assert cur.fetchone()[0] == payload
