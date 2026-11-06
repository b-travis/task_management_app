from concurrent.futures import ThreadPoolExecutor

import pytest

from app import MAX_TAG_LENGTH, MAX_TITLE_LENGTH, create_app


@pytest.fixture
def client():
    """A test client with a fresh, empty task list."""
    return create_app().test_client()


def add_task(client, title="Write report"):
    return client.post("/tasks", json={"title": title}).get_json()


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_list_tasks_starts_empty(client):
    response = client.get("/tasks")

    assert response.status_code == 200
    assert response.get_json() == []


def test_create_task(client):
    response = client.post("/tasks", json={"title": "Write report"})

    assert response.status_code == 201
    assert response.get_json() == {
        "id": 1,
        "title": "Write report",
        "completed": False,
        "priority": "P2",
        "tag": None,
    }


def test_created_tasks_are_listed_in_order(client):
    add_task(client, "First")
    add_task(client, "Second")

    titles = [task["title"] for task in client.get("/tasks").get_json()]

    assert titles == ["First", "Second"]


def test_title_whitespace_is_trimmed(client):
    assert add_task(client, "  Write report  ")["title"] == "Write report"


def test_title_at_max_length_is_accepted(client):
    response = client.post("/tasks", json={"title": "x" * MAX_TITLE_LENGTH})

    assert response.status_code == 201


@pytest.mark.parametrize(
    "payload, message",
    [
        ({}, "Title is required"),
        ({"title": 123}, "Title must be a string"),
        ({"title": None}, "Title must be a string"),
        ({"title": ""}, "Title cannot be blank"),
        ({"title": "   "}, "Title cannot be blank"),
        (
            {"title": "x" * (MAX_TITLE_LENGTH + 1)},
            f"Title cannot be longer than {MAX_TITLE_LENGTH} characters",
        ),
        (["not", "an", "object"], "Request body must be a JSON object"),
    ],
)
def test_create_task_rejects_invalid_input(client, payload, message):
    response = client.post("/tasks", json=payload)

    assert response.status_code == 400
    assert response.get_json() == {"error": message}
    assert client.get("/tasks").get_json() == []


def test_create_task_rejects_malformed_json(client):
    response = client.post(
        "/tasks", data="{not valid json", content_type="application/json"
    )

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_create_task_rejects_non_json_body(client):
    response = client.post("/tasks", data="title=Write report")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_complete_task(client):
    task = add_task(client)

    response = client.put(f"/tasks/{task['id']}/complete")

    assert response.status_code == 200
    assert response.get_json() == {**task, "completed": True}
    assert client.get("/tasks").get_json()[0]["completed"] is True


def test_completing_a_task_twice_succeeds(client):
    task = add_task(client)
    client.put(f"/tasks/{task['id']}/complete")

    response = client.put(f"/tasks/{task['id']}/complete")

    assert response.status_code == 200
    assert response.get_json()["completed"] is True


def test_complete_missing_task_returns_404(client):
    response = client.put("/tasks/999/complete")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Task 999 not found"}


def test_delete_task(client):
    task = add_task(client)

    response = client.delete(f"/tasks/{task['id']}")

    assert response.status_code == 204
    assert response.data == b""
    assert client.get("/tasks").get_json() == []


def test_delete_missing_task_returns_404(client):
    response = client.delete("/tasks/999")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Task 999 not found"}


def test_ids_are_not_reused_after_delete(client):
    task = add_task(client)
    client.delete(f"/tasks/{task['id']}")

    assert add_task(client)["id"] == task["id"] + 1


def test_stats_when_empty(client):
    response = client.get("/tasks/stats")

    assert response.status_code == 200
    assert response.get_json() == {"total": 0, "completed": 0, "pending": 0}


def test_stats_track_changes(client):
    first = add_task(client, "First")
    second = add_task(client, "Second")
    add_task(client, "Third")
    client.put(f"/tasks/{first['id']}/complete")
    client.delete(f"/tasks/{second['id']}")

    response = client.get("/tasks/stats")

    assert response.get_json() == {"total": 2, "completed": 1, "pending": 1}


def test_create_task_with_priority_and_tag(client):
    response = client.post(
        "/tasks", json={"title": "Ship it", "priority": "P0", "tag": "  Work  "}
    )

    assert response.status_code == 201
    assert response.get_json()["priority"] == "P0"
    assert response.get_json()["tag"] == "Work"


@pytest.mark.parametrize("priority", ["P3", "p0", "", None, 1])
def test_invalid_priority_is_rejected(client, priority):
    response = client.post("/tasks", json={"title": "Task", "priority": priority})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Priority must be one of: P0, P1, P2"}


def test_non_string_tag_is_rejected(client):
    response = client.post("/tasks", json={"title": "Task", "tag": 5})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Tag must be a string"}


def test_tag_over_max_length_is_rejected(client):
    response = client.post(
        "/tasks", json={"title": "Task", "tag": "x" * (MAX_TAG_LENGTH + 1)}
    )

    assert response.status_code == 400


def test_blank_tag_means_no_tag(client):
    response = client.post("/tasks", json={"title": "Task", "tag": "   "})

    assert response.get_json()["tag"] is None


def test_matching_tag_reuses_existing_spelling(client):
    client.post("/tasks", json={"title": "First", "tag": "Work"})

    response = client.post("/tasks", json={"title": "Second", "tag": "work"})

    assert response.get_json()["tag"] == "Work"


def test_update_priority_and_tag(client):
    task = add_task(client)

    response = client.patch(
        f"/tasks/{task['id']}", json={"priority": "P1", "tag": "Home"}
    )

    assert response.status_code == 200
    assert response.get_json() == {**task, "priority": "P1", "tag": "Home"}


def test_update_can_clear_a_tag(client):
    task = client.post("/tasks", json={"title": "Task", "tag": "Home"}).get_json()

    response = client.patch(f"/tasks/{task['id']}", json={"tag": None})

    assert response.get_json()["tag"] is None


def test_update_only_changes_the_fields_sent(client):
    task = client.post(
        "/tasks", json={"title": "Task", "priority": "P0", "tag": "Home"}
    ).get_json()

    response = client.patch(f"/tasks/{task['id']}", json={"priority": "P1"})

    assert response.get_json()["tag"] == "Home"


def test_update_with_nothing_to_change_is_rejected(client):
    task = add_task(client)

    response = client.patch(f"/tasks/{task['id']}", json={"title": "New"})

    assert response.status_code == 400


def test_update_missing_task_returns_404(client):
    response = client.patch("/tasks/999", json={"priority": "P1"})

    assert response.status_code == 404
    assert response.get_json() == {"error": "Task 999 not found"}


def test_tags_lists_tags_in_use(client):
    client.post("/tasks", json={"title": "A", "tag": "work"})
    client.post("/tasks", json={"title": "B", "tag": "Home"})
    third = client.post("/tasks", json={"title": "C", "tag": "Old"}).get_json()
    client.post("/tasks", json={"title": "D"})
    client.delete(f"/tasks/{third['id']}")

    response = client.get("/tags")

    assert response.status_code == 200
    assert response.get_json() == ["Home", "work"]


def test_unknown_route_returns_json_404(client):
    response = client.get("/nope")

    assert response.status_code == 404
    assert "error" in response.get_json()


def test_non_integer_id_returns_json_404(client):
    response = client.delete("/tasks/abc")

    assert response.status_code == 404
    assert "error" in response.get_json()


def test_wrong_method_returns_json_405(client):
    response = client.patch("/tasks")

    assert response.status_code == 405
    assert "error" in response.get_json()


def test_unexpected_error_returns_json_500_without_details():
    app = create_app()

    @app.get("/boom")
    def boom():
        raise RuntimeError("secret details")

    response = app.test_client().get("/boom")

    assert response.status_code == 500
    assert response.get_json() == {"error": "Internal server error"}


def test_concurrent_creates_get_unique_ids():
    app = create_app()

    def create(number):
        return add_task(app.test_client(), f"Task {number}")["id"]

    with ThreadPoolExecutor(max_workers=10) as pool:
        ids = list(pool.map(create, range(100)))

    assert sorted(ids) == list(range(1, 101))
