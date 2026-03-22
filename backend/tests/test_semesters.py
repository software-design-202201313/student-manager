import pytest


@pytest.mark.asyncio
async def test_create_semester(auth_client_teacher):
    response = await auth_client_teacher.post("/api/v1/semesters", json={"year": 2026, "term": 1})
    assert response.status_code == 201
    assert response.json()["year"] == 2026


@pytest.mark.asyncio
async def test_create_duplicate_semester(auth_client_teacher):
    await auth_client_teacher.post("/api/v1/semesters", json={"year": 2026, "term": 1})
    response = await auth_client_teacher.post("/api/v1/semesters", json={"year": 2026, "term": 1})
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_semesters(auth_client_teacher):
    await auth_client_teacher.post("/api/v1/semesters", json={"year": 2026, "term": 1})
    response = await auth_client_teacher.get("/api/v1/semesters")
    assert response.status_code == 200
    assert len(response.json()) >= 1

