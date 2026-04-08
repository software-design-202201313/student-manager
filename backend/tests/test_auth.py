import pytest
from httpx import AsyncClient

from app.utils.security import hash_password
from tests.conftest import async_session_test
from app.models import School, User


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_school: School):
    async with async_session_test() as session:
        user = User(
            school_id=seed_school.id,
            email="t@test.com",
            hashed_password=hash_password("pw"),
            role="teacher",
            name="T",
        )
        session.add(user)
        await session.commit()

    res = await client.post("/api/v1/auth/login", json={"email": "t@test.com", "password": "pw"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["role"] == "teacher"
    assert "user_id" in body
    assert body["name"] == "T"
    assert "refresh_token=" in res.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_login_invalid(client: AsyncClient, seed_school: School):
    res = await client.post("/api/v1/auth/login", json={"email": "no@test.com", "password": "pw"})
    assert res.status_code == 401
    assert res.json()["code"] == "AUTH_INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, seed_school: School):
    async with async_session_test() as session:
        user = User(
            school_id=seed_school.id,
            email="wp@test.com",
            hashed_password=hash_password("correct"),
            role="teacher",
            name="WP",
        )
        session.add(user)
        await session.commit()

    res = await client.post("/api/v1/auth/login", json={"email": "wp@test.com", "password": "wrong"})
    assert res.status_code == 401
    assert res.json()["code"] == "AUTH_INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_me_requires_auth(auth_client_teacher: AsyncClient):
    res = await auth_client_teacher.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["role"] == "teacher"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json()["code"] == "AUTH_MISSING_TOKEN"


@pytest.mark.asyncio
async def test_me_returns_correct_user_info(auth_client_teacher: AsyncClient, seed_teacher):
    res = await auth_client_teacher.get("/api/v1/auth/me")
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == seed_teacher.email
    assert body["name"] == seed_teacher.name
    assert body["role"] == "teacher"
    assert body["school_id"] == str(seed_teacher.school_id)


@pytest.mark.asyncio
async def test_login_inactive_account(client: AsyncClient, seed_school: School):
    async with async_session_test() as session:
        user = User(
            school_id=seed_school.id,
            email="inactive@test.com",
            hashed_password=hash_password("pw"),
            role="teacher",
            name="Inactive",
            is_active=False,
        )
        session.add(user)
        await session.commit()

    res = await client.post("/api/v1/auth/login", json={"email": "inactive@test.com", "password": "pw"})
    assert res.status_code == 401
    assert res.json()["code"] == "AUTH_ACCOUNT_INACTIVE"


@pytest.mark.asyncio
async def test_logout(auth_client_teacher: AsyncClient):
    res = await auth_client_teacher.post("/api/v1/auth/logout")
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_logout_without_auth_is_allowed(client: AsyncClient):
    res = await client.post("/api/v1/auth/logout")
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_refresh_without_cookie(client: AsyncClient):
    res = await client.post("/api/v1/auth/refresh")
    assert res.status_code == 401
    assert res.json()["code"] == "AUTH_TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_password_recovery_returns_preview_link(client: AsyncClient, seed_school: School):
    async with async_session_test() as session:
        user = User(
            school_id=seed_school.id,
            email="recover@test.com",
            hashed_password=hash_password("pw"),
            role="teacher",
            name="Recover",
        )
        session.add(user)
        await session.commit()

    res = await client.post("/api/v1/auth/password-recovery", json={"email": "recover@test.com"})
    assert res.status_code == 200
    body = res.json()
    assert body["accepted"] is True
    assert body["delivery"] == "stub"
    assert "/forgot-password?token=" in body["preview_url"]


@pytest.mark.asyncio
async def test_password_reset_flow(client: AsyncClient, seed_school: School):
    async with async_session_test() as session:
        user = User(
            school_id=seed_school.id,
            email="reset@test.com",
            hashed_password=hash_password("old-password"),
            role="teacher",
            name="Reset",
        )
        session.add(user)
        await session.commit()

    recovery = await client.post("/api/v1/auth/password-recovery", json={"email": "reset@test.com"})
    token = recovery.json()["preview_url"].split("token=")[1]

    reset_res = await client.post(
        "/api/v1/auth/password-reset",
        json={"token": token, "password": "new-password-123"},
    )
    assert reset_res.status_code == 204

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset@test.com", "password": "new-password-123"},
    )
    assert login_res.status_code == 200
