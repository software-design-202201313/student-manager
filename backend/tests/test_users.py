import datetime as dt

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from tests.conftest import async_session_test
from app.models import Class, School, User, UserInvitation
from app.utils.security import hash_password


async def _create_class(teacher: User, name: str = "1-1") -> Class:
    async with async_session_test() as session:
        cls = Class(school_id=teacher.school_id, name=name, grade=1, year=2026, teacher_id=teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
        return cls


async def _expire_latest_invitation(user_email: str) -> None:
    async with async_session_test() as session:
        invitation = (
            await session.execute(
                select(UserInvitation)
                .join(User, UserInvitation.user_id == User.id)
                .where(User.email == user_email)
                .order_by(UserInvitation.created_at.desc())
            )
        ).scalars().first()
        assert invitation is not None
        invitation.expires_at = dt.datetime.utcnow() - dt.timedelta(hours=1)
        await session.commit()


@pytest.mark.asyncio
async def test_teacher_creates_student(auth_client_teacher: AsyncClient, seed_teacher: User, seed_school: School):
    # create a class for the teacher
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="1-3", grade=1, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "s1@test.com",
            "name": "학생1",
            "class_id": cls.id.hex,
            "student_number": 1,
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "학생1"
    assert body["account_status"] == "pending_invite"
    assert "/signup?token=" in body["invite_url"]


@pytest.mark.asyncio
async def test_duplicate_email_returns_409(auth_client_teacher: AsyncClient, seed_teacher: User, seed_school: School):
    # create an existing user with same email
    async with async_session_test() as session:
        u = User(school_id=seed_school.id, email="dup@test.com", hashed_password=hash_password("pw"), role="student", name="dup")
        session.add(u)
        await session.commit()

    # create a class for the teacher
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="1-4", grade=1, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "dup@test.com",
            "name": "학생X",
            "class_id": cls.id.hex,
            "student_number": 2,
        },
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_teacher_cannot_create_student_in_other_teachers_class(
    auth_client_teacher: AsyncClient, seed_teacher_other: User
):
    # Other teacher owns the class
    async with async_session_test() as session:
        cls = Class(
            school_id=seed_teacher_other.school_id,
            name="2-1",
            grade=2,
            year=2026,
            teacher_id=seed_teacher_other.id,
        )
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "oob@test.com",
            "name": "越권",
            "class_id": cls.id.hex,
            "student_number": 3,
        },
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_teacher_creates_parent_invitation(auth_client_teacher: AsyncClient, seed_teacher: User, seed_school: School):
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="1-5", grade=1, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    student_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "student-parent@test.com",
            "name": "학생부모",
            "class_id": cls.id.hex,
            "student_number": 4,
        },
    )
    student_id = student_res.json()["id"]

    res = await auth_client_teacher.post(
        "/api/v1/users/parents",
        json={"email": "parent@test.com", "name": "학부모1", "student_id": student_id},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "parent"
    assert body["account_status"] == "pending_invite"
    assert "/signup?token=" in body["invite_url"]


@pytest.mark.asyncio
async def test_invited_student_can_accept_signup(client: AsyncClient, auth_client_teacher: AsyncClient, seed_teacher: User):
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="2-2", grade=2, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    create_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "signup-student@test.com",
            "name": "초대학생",
            "class_id": cls.id.hex,
            "student_number": 5,
        },
    )
    invite_token = create_res.json()["invite_url"].split("token=")[1]

    preview_res = await client.get(f"/api/v1/auth/invitations/{invite_token}")
    assert preview_res.status_code == 200
    assert preview_res.json()["role"] == "student"

    accept_res = await client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": invite_token, "password": "student-pass-123"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["role"] == "student"

    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {accept_res.json()['access_token']}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "signup-student@test.com"


@pytest.mark.asyncio
async def test_list_students_includes_invitation_summary(
    client: AsyncClient,
    auth_client_teacher: AsyncClient,
    seed_teacher: User,
):
    cls = await _create_class(seed_teacher, name="3-1")

    pending_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "pending-student@test.com",
            "name": "대기학생",
            "class_id": cls.id.hex,
            "student_number": 1,
        },
    )
    accepted_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "accepted-student@test.com",
            "name": "수락학생",
            "class_id": cls.id.hex,
            "student_number": 2,
        },
    )
    expired_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "expired-student@test.com",
            "name": "만료학생",
            "class_id": cls.id.hex,
            "student_number": 3,
        },
    )

    accepted_token = accepted_res.json()["invite_url"].split("token=")[1]
    accept_res = await client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": accepted_token, "password": "accepted-pass-123"},
    )
    assert accept_res.status_code == 200

    await _expire_latest_invitation("expired-student@test.com")

    res = await auth_client_teacher.get(f"/api/v1/users/students?class_id={cls.id}")
    assert res.status_code == 200
    rows = {row["email"]: row for row in res.json()}

    assert rows["pending-student@test.com"]["invite_status"] == "pending"
    assert rows["accepted-student@test.com"]["invite_status"] == "accepted"
    assert rows["expired-student@test.com"]["invite_status"] == "expired"
    assert rows["pending-student@test.com"]["account_status"] == "pending_invite"
    assert rows["accepted-student@test.com"]["account_status"] == "active"
    assert rows["pending-student@test.com"]["invite_resend_count"] == 0
    assert rows["pending-student@test.com"]["invite_expires_at"] is not None
    assert rows["pending-student@test.com"]["invite_sent_at"] is not None


@pytest.mark.asyncio
async def test_teacher_can_resend_student_invitation(
    client: AsyncClient,
    auth_client_teacher: AsyncClient,
    seed_teacher: User,
):
    cls = await _create_class(seed_teacher, name="3-2")
    create_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "resend-student@test.com",
            "name": "재전송학생",
            "class_id": cls.id.hex,
            "student_number": 1,
        },
    )
    assert create_res.status_code == 201
    student_id = create_res.json()["id"]
    old_token = create_res.json()["invite_url"].split("token=")[1]

    resend_res = await auth_client_teacher.post(f"/api/v1/users/students/{student_id}/invitation/resend")
    assert resend_res.status_code == 200
    body = resend_res.json()
    assert body["invite_resend_count"] == 1
    assert "/signup?token=" in body["invite_url"]
    new_token = body["invite_url"].split("token=")[1]
    assert new_token != old_token

    old_accept = await client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": old_token, "password": "old-pass-123"},
    )
    assert old_accept.status_code == 410
    assert old_accept.json()["code"] == "AUTH_INVITATION_EXPIRED"

    new_accept = await client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": new_token, "password": "new-pass-123"},
    )
    assert new_accept.status_code == 200


@pytest.mark.asyncio
async def test_teacher_can_expire_student_invitation(auth_client_teacher: AsyncClient, seed_teacher: User):
    cls = await _create_class(seed_teacher, name="3-3")
    create_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "expire-student@test.com",
            "name": "만료처리학생",
            "class_id": cls.id.hex,
            "student_number": 1,
        },
    )
    assert create_res.status_code == 201
    student_id = create_res.json()["id"]

    expire_res = await auth_client_teacher.post(f"/api/v1/users/students/{student_id}/invitation/expire")
    assert expire_res.status_code == 200
    body = expire_res.json()
    assert body["invite_status"] == "expired"

    list_res = await auth_client_teacher.get(f"/api/v1/users/students?class_id={cls.id}")
    assert list_res.status_code == 200
    assert list_res.json()[0]["invite_status"] == "expired"


@pytest.mark.asyncio
async def test_teacher_cannot_manage_other_teachers_student_invitation(
    auth_client_teacher_other: AsyncClient,
    auth_client_teacher: AsyncClient,
    seed_teacher: User,
):
    cls = await _create_class(seed_teacher, name="3-4")
    create_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={
            "email": "foreign-student@test.com",
            "name": "타교사학생",
            "class_id": cls.id.hex,
            "student_number": 1,
        },
    )
    assert create_res.status_code == 201
    student_id = create_res.json()["id"]

    resend_res = await auth_client_teacher_other.post(f"/api/v1/users/students/{student_id}/invitation/resend")
    assert resend_res.status_code == 403
    assert resend_res.json()["code"] == "FORBIDDEN"

    expire_res = await auth_client_teacher_other.post(f"/api/v1/users/students/{student_id}/invitation/expire")
    assert expire_res.status_code == 403
    assert expire_res.json()["code"] == "FORBIDDEN"
