"""Task management REST API."""

from threading import Lock

from flask import Flask, jsonify, request
from werkzeug.exceptions import BadRequest, HTTPException, NotFound

MAX_TITLE_LENGTH = 200
MAX_TAG_LENGTH = 30
PRIORITIES = ("P0", "P1", "P2")  # P0 is the most urgent
DEFAULT_PRIORITY = "P2"


class TaskStore:
    """Keeps tasks in memory.

    A lock lets only one thread change the data at a time, because the server
    handles requests on several threads. Methods return copies so that callers
    never touch the stored tasks directly.
    """

    def __init__(self):
        self._tasks = {}
        self._next_id = 1
        self._lock = Lock()

    def list(self):
        with self._lock:
            return [dict(task) for task in self._tasks.values()]

    def add(self, title, priority=DEFAULT_PRIORITY, tag=None, parent_id=None):
        with self._lock:
            self._check_parent(None, parent_id)
            task = {
                "id": self._next_id,
                "title": title,
                "completed": False,
                "priority": priority,
                "tag": self._reuse_tag(tag),
                "parent_id": parent_id,
            }
            self._tasks[task["id"]] = task
            # IDs only ever count up, so a deleted task's ID is never reused.
            self._next_id += 1
            return dict(task)

    def update(self, task_id, changes):
        """Change a task's priority or tag. Returns None if it doesn't exist."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            if "tag" in changes:
                changes = {**changes, "tag": self._reuse_tag(changes["tag"])}
            task.update(changes)
            return dict(task)

    def move(self, task_id, parent_id, index=None):
        """Put a task under a parent (None for main tasks) at a position.

        The index counts from 0 among the tasks at that level. With no index,
        the task goes last. Returns None if the task doesn't exist.
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            self._check_parent(task_id, parent_id)
            task["parent_id"] = parent_id

            # Dicts keep their insertion order, so that order is the task order.
            # Only the order among siblings matters to the nested display.
            order = [other for other in self._tasks if other != task_id]
            siblings = [
                other for other in order if self._tasks[other]["parent_id"] == parent_id
            ]
            if index is None or index >= len(siblings):
                order.append(task_id)
            else:
                order.insert(order.index(siblings[index]), task_id)
            self._tasks = {other: self._tasks[other] for other in order}
            return dict(task)

    def complete(self, task_id):
        """Complete a task and its sub-tasks. Returns None if it doesn't exist."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            task["completed"] = True
            for sub_task in self._sub_tasks(task_id):
                sub_task["completed"] = True
            return dict(task)

    def delete(self, task_id):
        """Delete a task and its sub-tasks. Returns False if it doesn't exist."""
        with self._lock:
            if task_id not in self._tasks:
                return False
            for sub_task in self._sub_tasks(task_id):
                del self._tasks[sub_task["id"]]
            del self._tasks[task_id]
            return True

    def _sub_tasks(self, task_id):
        return [t for t in self._tasks.values() if t["parent_id"] == task_id]

    def _check_parent(self, task_id, parent_id):
        """Reject parents that would break the one-level nesting rule."""
        if parent_id is None:
            return
        if parent_id == task_id:
            raise BadRequest("A task cannot be its own sub-task")

        parent = self._tasks.get(parent_id)
        if parent is None:
            raise BadRequest(f"Parent task {parent_id} not found")
        if parent["parent_id"] is not None:
            raise BadRequest("A sub-task cannot have its own sub-tasks")
        if task_id is not None and self._sub_tasks(task_id):
            raise BadRequest("Move this task's sub-tasks before making it a sub-task")

    def tags(self):
        with self._lock:
            return sorted(self._tags_in_use(), key=str.lower)

    def _tags_in_use(self):
        return {task["tag"] for task in self._tasks.values() if task["tag"]}

    def _reuse_tag(self, tag):
        """Use an existing tag's spelling, so "work" and "Work" stay one tag."""
        if tag is None:
            return None
        for existing in self._tags_in_use():
            if existing.lower() == tag.lower():
                return existing
        return tag

    def stats(self):
        with self._lock:
            done = [task for task in self._tasks.values() if task["completed"]]
            sub_completed = sum(task["parent_id"] is not None for task in done)
            return {
                "total": len(self._tasks),
                "completed": len(done),
                "pending": len(self._tasks) - len(done),
                "main_completed": len(done) - sub_completed,
                "sub_completed": sub_completed,
            }


def read_json_object():
    """Return the request's JSON body, or reject it if it isn't a JSON object."""
    # silent=True returns None for bad JSON, so it gets this same error format.
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise BadRequest("Request body must be a JSON object")
    return payload


def clean_title(payload):
    if "title" not in payload:
        raise BadRequest("Title is required")

    title = payload["title"]
    if not isinstance(title, str):
        raise BadRequest("Title must be a string")

    title = title.strip()
    if not title:
        raise BadRequest("Title cannot be blank")
    if len(title) > MAX_TITLE_LENGTH:
        raise BadRequest(f"Title cannot be longer than {MAX_TITLE_LENGTH} characters")
    return title


def clean_priority(priority):
    if priority not in PRIORITIES:
        raise BadRequest(f"Priority must be one of: {', '.join(PRIORITIES)}")
    return priority


def clean_tag(tag):
    """Return a tidied tag, or None for no tag. A blank tag counts as no tag."""
    if tag is None:
        return None
    if not isinstance(tag, str):
        raise BadRequest("Tag must be a string")

    tag = tag.strip()
    if len(tag) > MAX_TAG_LENGTH:
        raise BadRequest(f"Tag cannot be longer than {MAX_TAG_LENGTH} characters")
    return tag or None


def clean_id(value, name):
    """Return an optional whole number, or None if there isn't one."""
    # bool counts as an int in Python, so it needs ruling out separately.
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise BadRequest(f"{name} must be a non-negative whole number")
    return value


def create_app():
    """Build the app. Each call gets its own empty store, which keeps tests isolated."""
    app = Flask(__name__)
    app.json.sort_keys = False  # keep fields in the order id, title, completed
    store = TaskStore()

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.get("/tasks")
    def list_tasks():
        return jsonify(store.list())

    @app.post("/tasks")
    def create_task():
        payload = read_json_object()
        task = store.add(
            clean_title(payload),
            priority=clean_priority(payload.get("priority", DEFAULT_PRIORITY)),
            tag=clean_tag(payload.get("tag")),
            parent_id=clean_id(payload.get("parent_id"), "parent_id"),
        )
        return jsonify(task), 201

    @app.patch("/tasks/<int:task_id>")
    def update_task(task_id):
        payload = read_json_object()
        changes = {}
        if "priority" in payload:
            changes["priority"] = clean_priority(payload["priority"])
        if "tag" in payload:
            changes["tag"] = clean_tag(payload["tag"])
        if not changes:
            raise BadRequest("Provide a priority or tag to change")

        task = store.update(task_id, changes)
        if task is None:
            raise NotFound(f"Task {task_id} not found")
        return jsonify(task)

    @app.put("/tasks/<int:task_id>/move")
    def move_task(task_id):
        payload = read_json_object()
        if "parent_id" not in payload:
            raise BadRequest("parent_id is required (use null for a main task)")

        task = store.move(
            task_id,
            clean_id(payload["parent_id"], "parent_id"),
            clean_id(payload.get("index"), "index"),
        )
        if task is None:
            raise NotFound(f"Task {task_id} not found")
        return jsonify(task)

    @app.put("/tasks/<int:task_id>/complete")
    def complete_task(task_id):
        task = store.complete(task_id)
        if task is None:
            raise NotFound(f"Task {task_id} not found")
        return jsonify(task)

    @app.delete("/tasks/<int:task_id>")
    def delete_task(task_id):
        if not store.delete(task_id):
            raise NotFound(f"Task {task_id} not found")
        return "", 204

    @app.get("/tasks/stats")
    def task_stats():
        return jsonify(store.stats())

    @app.get("/tags")
    def list_tags():
        return jsonify(store.tags())

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        """Return Flask's built-in errors, such as 404 and 405, as JSON."""
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Log the details, but don't expose them to the client."""
        app.logger.exception("Unhandled error", exc_info=error)
        return jsonify(error="Internal server error"), 500

    return app


app = create_app()
