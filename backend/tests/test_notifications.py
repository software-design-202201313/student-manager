import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Notification, User, School


@pytest.mark.asyncio
async def test_notifications_list_and_mark_read(client: AsyncClient, seed_school: School):
    # Create a user and a notification row
    async with async_session_test() as session:
        u = User(school_id=seed_school.id, email="n@test.com", hashed_password="x", role="teacher", name="N")
        session.add(u)
        await session.flush()
        n = Notification(recipient_id=u.id, type="grade_input", message="입력됨")
        session.add(n)
        await session.commit()
        await session.refresh(u)
        await session.refresh(n)

    # auth
    from app.utils.security import create_access_token

    token = create_access_token({"sub": str(u.id), "role": "teacher", "school_id": str(u.school_id)})
    client.headers.update({"Authorization": f"Bearer {token}"})

    # list
    res = await client.get("/api/v1/notifications")
    assert res.status_code == 200
    assert any(i["message"] == "입력됨" for i in res.json())

    # mark read
    nid = res.json()[0]["id"]
    res2 = await client.patch(f"/api/v1/notifications/{nid}/read")
    assert res2.status_code == 200
    assert res2.json()["is_read"] is True

