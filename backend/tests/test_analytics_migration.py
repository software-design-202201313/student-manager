"""SMS-49: analytics 스키마/테이블 존재 검증.

Postgres 연결이 가능한 경우(`POSTGRES_TEST_URL` 또는 기본 docker-compose URL)에만
실제로 alembic-적용 결과를 검사한다. CI에서 Postgres가 없으면 skip.
"""
from __future__ import annotations

import os

import pytest

try:
    import psycopg2
except ImportError:  # pragma: no cover
    psycopg2 = None


POSTGRES_URL = os.environ.get(
    "POSTGRES_TEST_URL",
    "postgresql://sm:smpass@localhost:5432/student_manager",
)

EXPECTED_TABLES = {
    "fact_grade_event",
    "fact_attendance_event",
    "dim_student",
    "agg_student_subject",
    "agg_student_overall",
}


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


def test_analytics_schema_exists(pg_conn):
    with pg_conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'analytics'"
        )
        assert cur.fetchone() is not None, "analytics schema missing — run alembic upgrade head"


def test_analytics_tables_exist(pg_conn):
    with pg_conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'analytics'"
        )
        actual = {row[0] for row in cur.fetchall()}
    missing = EXPECTED_TABLES - actual
    assert not missing, f"analytics tables missing: {missing}"


@pytest.mark.parametrize(
    "table,expected_pk",
    [
        ("agg_student_subject", {"student_id", "subject_id", "semester_id"}),
        ("agg_student_overall", {"student_id", "semester_id"}),
        ("fact_grade_event", {"event_id"}),
    ],
)
def test_primary_keys(pg_conn, table: str, expected_pk: set[str]):
    with pg_conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = 'analytics.{table}'::regclass AND i.indisprimary
            """.format(table=table)
        )
        actual = {row[0] for row in cur.fetchall()}
    assert actual == expected_pk, f"{table} PK mismatch: {actual} vs {expected_pk}"
