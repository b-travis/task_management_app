# Task Management App

A task manager with a Flask REST API, a React frontend, and a Docker Compose setup that runs both with one command.

## Features

Beyond the required task list, form, and statistics, the app supports:

- **Sub-tasks:** add a sub-task under a main task, make an existing task a sub-task, or turn a sub-task back into a main task. Sub-tasks appear indented.
- **Priorities:** every task has a priority of P0, P1, or P2, where P0 is the most urgent.
- **Tags:** give a task one tag of your own, or none. Tags you've already used appear as suggestions.
- **Completion status:** every task is Not Started, In Progress, Blocked, or Completed, and completed tasks can be reopened.
- **Filters:** narrow the list by tag, priority, status, or any combination.
- **Reordering:** drag a task by its handle, or use the keyboard. The order is saved in the backend.
- **Separate counts:** the statistics split completed tasks into main tasks and sub-tasks, and pending tasks by status.
- **Styling:** the look is inspired by Carbon Arc's public website.

## Run the app

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running. From the top folder of this repo, run:

```bash
docker-compose up --build
```

| What | Address |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:5000 |

To stop the app, press `Ctrl+C`, then run `docker-compose down`.

On newer Docker installs, the same command may be spelled `docker compose up --build`, with a space.

**Port 5000 on a Mac:** if Docker says the port is already in use, AirPlay Receiver is the likely cause. Turn it off in System Settings → General → AirDrop & Handoff.

## API

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| GET | `/tasks` | List all tasks | 200 |
| POST | `/tasks` | Create a task from `{"title": "..."}`, with optional `status`, `priority`, `tag`, and `parent_id` | 201 |
| PATCH | `/tasks/<id>` | Change a task's `status`, `priority`, or `tag` | 200 |
| PUT | `/tasks/<id>/move` | Set a task's `parent_id` (`null` for a main task) and optional `index` | 200 |
| PUT | `/tasks/<id>/complete` | Mark a task and its sub-tasks as completed | 200 |
| DELETE | `/tasks/<id>` | Delete a task and its sub-tasks | 204, empty response |
| GET | `/tasks/stats` | Return total, completed, and pending counts, plus `main_completed`, `sub_completed`, `not_started`, `in_progress`, and `blocked` | 200 |
| GET | `/tags` | List the tags in use | 200 |
| GET | `/health` | Health check used by Docker | 200 |

A task looks like this:

```json
{"id": 2, "title": "Draft intro", "completed": false, "status": "blocked", "priority": "P1", "tag": "Work", "parent_id": 1}
```

Every error uses the same format:

```json
{"error": "Task 999 not found"}
```

## How it fits together

```text
Browser → nginx (port 3000) → Flask + Gunicorn (port 5000)
```

- **`backend/app.py`** holds the whole API. A `TaskStore` class keeps tasks in memory, and a lock makes changes safe across threads.
- **`frontend/src/`** holds the React app. All backend calls are in `api.js`, and the display pieces are in `components/`.
- **`frontend/nginx.conf`** serves the built React app and forwards `/api/...` requests to the backend. The browser only talks to one address, so the API doesn't need CORS settings.
- **`docker-compose.yml`** starts both services. The frontend waits until the backend passes its health check.

## Tests

The backend tests cover every endpoint and error case. They run outside Docker and need [uv](https://docs.astral.sh/uv/):

```bash
cd backend
uv run pytest
```

## Run without Docker

This is useful during development and needs uv and Node.js. Use two terminals, because each server keeps running until you press `Ctrl+C`.

```bash
# Terminal 1
cd backend
uv run flask --app app run --port 5000
```

```bash
# Terminal 2
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The Vite development server forwards `/api` requests to Flask, just as nginx does in Docker.

## Assumptions and simplifications

- **Tasks live in memory**, as the brief allows, so they're lost when the backend restarts.
- **Gunicorn runs one worker with four threads.** Each worker is a separate process with its own memory, so a second worker would create a second task list. Threads share memory, and the lock keeps them from conflicting.
- **There are no user accounts.** Everyone using the app shares one task list.
- **IDs start at 1 and are never reused**, even after a task is deleted.
- **Completing a task twice succeeds** and changes nothing, so repeating a request is safe.
- **Titles have surrounding spaces removed** and can be up to 200 characters.
- **Any POST body that isn't valid JSON returns a 400**, including a request sent with the wrong content type.
- **`status` is the stored value.** It's `not_started`, `in_progress`, `blocked`, or `completed`, and the required `completed` field is worked out from it. `pending` means any status except Completed.
- **Reopening a task is allowed.** A reopened main task leaves its sub-tasks as they are. A main task can't stay Completed with open work under it, so it moves to In Progress if a sub-task is reopened, added, or moved under it.
- **Sub-tasks go one level deep.** A sub-task can't have its own sub-tasks, and a task with sub-tasks can't become a sub-task until they're moved.
- **Completing or deleting a main task applies to its sub-tasks.** The page asks for confirmation before deleting a task with sub-tasks, because there's no undo.
- **Priority is a label only.** New tasks default to P2, and priority doesn't change the order, because the order is set by hand.
- **Tags exist as long as a task uses them.** There's no separate tag management, and a tag that matches an existing one apart from capitals reuses its spelling.
- **Dragging only reorders within a level.** Making or removing a sub-task uses the Edit panel. Dragging is turned off while filters are on, because a drop position is ambiguous with tasks hidden.
- **Filtering happens in the browser.** The page already has every task, so `GET /tasks` is unchanged. Filters combine, each takes one value, and they reset on refresh. If only a sub-task matches, its main task shows dimmed for context.
- **The stats count every task**, including sub-tasks, and they don't change with filters.
- **The page doesn't update live.** It reloads from the API after each action, so a second open tab needs a refresh to show changes.

## Questions

### How did you handle API errors?

**In the backend:**

- Input is validated before anything changes. Bad input returns a 400 with a specific message, such as `Title cannot be blank`.
- A missing task returns a 404, and an unsupported method returns a 405.
- Every error is returned as `{"error": "message"}`, including Flask's built-in errors, so clients only need to handle one format.
- Unexpected errors are logged on the server and return a generic 500, so internal details don't reach the client.

**In the frontend:**

- `api.js` turns network failures and error responses into readable messages.
- The page shows the message with a Retry button and keeps the task list on screen.
- If adding a task fails, the typed text stays in the box so it can be resubmitted.
- If saving a dragged task fails, the list returns to its saved order.

**In nginx:** testing showed the page hanging for 30 seconds or more when the backend stopped, because nginx kept trying the backend's old network address. nginx now looks the address up again and gives up quickly, so the error appears in about 3 seconds and the app recovers when the backend returns.

### What tests would you write if given more time?

- **Frontend component tests** with Vitest and React Testing Library, covering the loading, empty, and error states.
- **End-to-end browser tests** with Playwright against the running Docker setup. I checked these flows while building the app, but those checks aren't in this repo yet.
- **Stress tests** that send many simultaneous creates, completes, and deletes through Gunicorn. The current concurrency test only covers creating tasks, and it doesn't run through Gunicorn.
- **A Docker smoke test in CI** that starts the stack and calls the API on every push.

### What would you improve with 1 extra hour?

- Save tasks in SQLite with a Docker volume, so they survive restarts. This would also remove the one-worker limit.
- Let users edit titles.
- Run the tests automatically with GitHub Actions.

## AI usage

I used Claude Code to help plan, write, and test this project.

Given the time constraints, I did not review the code directly. Instead, I reviewed the app through its UI and APIs.

I designed most of the add-on features, deciding what to build and how each one should behave, and implemented them with Claude.
