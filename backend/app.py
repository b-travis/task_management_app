"""Task management REST API."""

from threading import Lock

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException, NotFound

MAX_TITLE_LENGTH = 200


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

    def add(self, title):
        with self._lock:
            task = {"id": self._next_id, "title": title, "completed": False}
            self._tasks[task["id"]] = task
            # IDs only ever count up, so a deleted task's ID is never reused.
            self._next_id += 1
            return dict(task)

    def complete(self, task_id):
        """Mark a task as completed. Returns None if the task doesn't exist."""
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            task["completed"] = True
            return dict(task)

    def delete(self, task_id):
        """Delete a task. Returns False if the task doesn't exist."""
        with self._lock:
            return self._tasks.pop(task_id, None) is not None

    def stats(self):
        with self._lock:
            total = len(self._tasks)
            completed = sum(task["completed"] for task in self._tasks.values())
            return {
                "total": total,
                "completed": completed,
                "pending": total - completed,
            }


def validate_title(payload):
    """Return (title, None) if the payload is valid, or (None, error message)."""
    if not isinstance(payload, dict):
        return None, "Request body must be a JSON object"
    if "title" not in payload:
        return None, "Title is required"

    title = payload["title"]
    if not isinstance(title, str):
        return None, "Title must be a string"

    title = title.strip()
    if not title:
        return None, "Title cannot be blank"
    if len(title) > MAX_TITLE_LENGTH:
        return None, f"Title cannot be longer than {MAX_TITLE_LENGTH} characters"
    return title, None


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
        # silent=True returns None for bad JSON, so validate_title can reject it
        # with the same error format as every other validation problem.
        title, error = validate_title(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400
        return jsonify(store.add(title)), 201

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
