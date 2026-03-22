import pytest


@pytest.mark.asyncio
async def test_create_and_list_classes(auth_client_teacher):
    res = await auth_client_teacher.post(
        "/api/v1/classes", json={"name": "1-1", "grade": 1, "year": 2026}
    )
    assert res.status_code == 201
    cls = res.json()
    assert cls["name"] == "1-1"

    res2 = await auth_client_teacher.get("/api/v1/classes")
    assert res2.status_code == 200
    items = res2.json()
    assert any(c["name"] == "1-1" for c in items)


@pytest.mark.asyncio
async def test_subject_create_list_delete(auth_client_teacher):
    # create a class
    cls = (
        await auth_client_teacher.post(
            "/api/v1/classes", json={"name": "1-2", "grade": 1, "year": 2026}
        )
    ).json()

    # create subject
    sub_res = await auth_client_teacher.post(
        f"/api/v1/classes/{cls['id']}/subjects", json={"name": "Math"}
    )
    assert sub_res.status_code == 201
    subj = sub_res.json()
    assert subj["name"] == "Math"

    # list subjects
    list_res = await auth_client_teacher.get(f"/api/v1/classes/{cls['id']}/subjects")
    assert list_res.status_code == 200
    assert any(s["name"] == "Math" for s in list_res.json())

    # delete subject
    del_res = await auth_client_teacher.delete(
        f"/api/v1/classes/{cls['id']}/subjects/{subj['id']}"
    )
    assert del_res.status_code == 204

