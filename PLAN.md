# Plan: Carbon Arc Take-Home (Task Management App)

**What you're building:** a small to-do app with three parts.

| Part | What it does | Data science analogy |
|---|---|---|
| **Backend** (Python + Flask) | Stores tasks and answers requests such as "add this task" | A function library other programs can call over the network |
| **Frontend** (React) | The web page people click on | A Streamlit page, but written in JavaScript |
| **Docker** | Packages both parts so they run the same way on any computer | A `uv` lockfile that also includes the operating system and Python itself |

**The finish line:** a reviewer clones your GitHub repo, runs `docker-compose up --build`, opens http://localhost:3000, and the app works.

**Rough time:** 2.5 to 3 hours, including 20 to 30 minutes of one-time setup. The prompt says about 2 hours and that polish isn't the point, so stop adding extras when you reach your time limit.

**Using Claude Code:** AI is allowed, so each phase includes a prompt you can paste in. Read what it produces, though. You may be asked to walk through this code in a follow-up interview, so don't move on from a phase until you can explain it. The "Understand it" lines tell you what to focus on.

---

## Progress checklist

- [ ] Phase 0: Set up your Mac
- [ ] Phase 1: Create the folder structure
- [ ] Phase 2: Build the backend
- [ ] Phase 3: Build the frontend
- [ ] Phase 4: Put it in Docker
- [ ] Phase 5: Add a few impressive extras
- [ ] Phase 6: Write the README
- [ ] Phase 7: Do a final test and submit

---

## Phase 0: Set up your Mac (20 to 30 min)

I checked your machine. `uv`, `git`, and `gh` are ready, and your GitHub repo is already connected. Three things need attention.

To run commands, open the terminal inside VS Code: menu bar → **Terminal → New Terminal**.

### 1. Install Docker Desktop (missing)

1. Go to https://www.docker.com/products/docker-desktop/.
2. Download the **Mac, Apple Silicon** version. Your Mac is Apple Silicon.
3. Open the downloaded `.dmg` file and drag Docker into Applications.
4. Open Docker from Applications and accept the prompts. A whale icon appears in the menu bar at the top right of your screen.

Docker must be running whenever you use it. If you see "Cannot connect to the Docker daemon," open the Docker app.

### 2. Install Node.js (missing)

Node.js is to JavaScript what Python is to `.py` files, and `npm` is its version of `uv add`.

```bash
brew install node
```

### 3. Free up port 5000 (in use)

A *port* is a numbered door on your computer that a program listens on. The prompt requires port 5000, but a macOS system process (Control Center) is using it. This is almost certainly **AirPlay Receiver**, a well-known conflict on Macs.

1. Click the Apple menu  → **System Settings**.
2. Go to **General → AirDrop & Handoff**.
3. Turn **AirPlay Receiver** off.

### Check that it worked

Close the terminal, open a new one, and run:

```bash
docker --version
docker-compose --version
node --version
lsof -nP -iTCP:5000 -sTCP:LISTEN
```

The first three should print version numbers. The last should print **nothing**, which means port 5000 is free.

If `docker-compose` (with a hyphen) isn't found, try `docker compose` (with a space). That's the newer spelling of the same tool. The prompt uses the hyphen, so make sure that form works for the final test, or mention both in your README.

---

## Phase 1: Create the folder structure (10 min)

Here's what the project will look like when it's finished:

```text
task_management_app/
├── backend/
│   ├── app.py              # the API
│   ├── tests/              # automated tests
│   ├── pyproject.toml      # dependencies (created by uv)
│   ├── uv.lock
│   └── Dockerfile
├── frontend/
│   ├── src/                # React code
│   ├── nginx.conf          # web server settings
│   ├── package.json        # dependencies (like pyproject.toml)
│   └── Dockerfile
├── docker-compose.yml      # starts both parts together
├── .gitignore
└── README.md
```

Run these from the project folder:

```bash
uv init --no-package backend
cd backend
uv add flask gunicorn
uv add --dev pytest
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install
cd ..
```

- **`--no-package`** keeps the backend as a plain folder of Python files. Without it, uv sets the project up as an installable package, which this app doesn't need.
- **Vite** is the standard tool for starting a React project. If it asks any questions, accept the defaults.
- **Gunicorn** is a production-grade server for Flask. Flask's built-in server is only meant for development.

Next, ask Claude Code to create a top-level `.gitignore`. This file tells git what not to save, and it must include `node_modules/`, `.venv/`, and `__pycache__/`. Those folders are large and can be regenerated, so they don't belong in the repo.

**Save your work.** A *commit* is a named checkpoint. Reviewers read your commit history, so committing at the end of each phase shows how you approached the work.

```bash
git add .
git commit -m "Scaffold backend and frontend projects"
git push
```

Repeat these three commands at the end of every phase with a new message.

---

## Phase 2: Build the backend (30 to 40 min)

**Paste into Claude Code:**

> Build the Flask API in `backend/app.py` following the Backend section of `Prompt.md`. Store tasks in memory behind a thread lock, with integer IDs that start at 1 and are never reused. Return every error as JSON in the form `{"error": "message"}`, including 404s and 405s. Reject bad input on POST with a 400: invalid JSON, a missing title, a non-string title, a blank title, or a title over 200 characters. Return 201 on creation. Add a `GET /health` endpoint. Add pytest tests in `backend/tests/` covering each endpoint and the error cases. Keep the code simple and readable.

**Run the tests:**

```bash
cd backend
uv run pytest
```

**Try it by hand.** Start the server in one terminal:

```bash
uv run flask --app app run --port 5000
```

Click the **+** in the VS Code terminal panel to open a second terminal, then run the examples from `Prompt.md`:

```bash
curl -X POST http://localhost:5000/tasks -H "Content-Type: application/json" -d '{"title": "Write report"}'
curl http://localhost:5000/tasks
curl -X PUT http://localhost:5000/tasks/1/complete
curl http://localhost:5000/tasks/stats
curl -X DELETE http://localhost:5000/tasks/1
```

**Also test the failure cases:**

```bash
curl -X PUT http://localhost:5000/tasks/999/complete
curl -X POST http://localhost:5000/tasks -H "Content-Type: application/json" -d '{"title": ""}'
```

**Done when:** tests pass, the five examples work, the first failure returns a 404, and the second returns a 400. Both failures should show a readable JSON message.

**Understand it:** be able to explain what each route does, why the status codes differ (201 created, 400 your input was bad, 404 not found), and why tasks disappear when the server restarts (they only live in memory).

Press `Ctrl+C` in the first terminal to stop the server, then commit.

---

## Phase 3: Build the frontend (35 to 45 min)

**Paste into Claude Code:**

> Build the React UI in `frontend/src` following the Frontend section of `Prompt.md`. Replace the Vite starter content. Put all backend calls in one file, `src/api.js`, and call relative paths starting with `/api` (for example `/api/tasks`). Configure the Vite dev server to forward `/api` to `http://localhost:5000` and remove the `/api` prefix. After every add, complete, or delete, refresh both the task list and the stats from the backend. Show a loading state, an empty state when there are no tasks, and a visible message when a request fails. Split the UI into a few small components. Keep the styling minimal and clean.

**Try it** with two terminals:

```bash
# Terminal 1
cd backend
uv run flask --app app run --port 5000

# Terminal 2
cd frontend
npm run dev
```

Open the address that `npm run dev` prints, which is usually http://localhost:5173.

**Done when you can:**

- Add a task, and it appears in the list.
- Complete a task, and its status changes.
- Delete a task, and it disappears.
- See the three stats update after each action.
- Stop the backend, try an action, and see an error message instead of a blank or broken page.

**Understand it:** the `/api` prefix is the key idea. The browser talks only to the frontend's address, and the frontend's server forwards `/api` requests to Flask. Because the browser sees a single address, this avoids *CORS*, a browser security rule that blocks pages from calling a different address unless the server allows it.

Stop both servers with `Ctrl+C`, then commit.

---

## Phase 4: Put it in Docker (25 to 35 min)

Two terms to know:

- An **image** is the packaged app, like a saved snapshot.
- A **container** is a running copy of that image.

**Paste into Claude Code:**

> Add Docker support following the Dockerization section of `Prompt.md`.
>
> Backend: a Dockerfile that installs dependencies from `uv.lock` with uv and runs gunicorn on port 5000 with exactly 1 worker and multiple threads, because tasks are stored in memory.
>
> Frontend: a multi-stage Dockerfile that builds the React app with Node, then serves it with nginx on port 3000. Add `nginx.conf` so that `/api/` is forwarded to `http://backend:5000/` with the prefix removed.
>
> Add `.dockerignore` files and a top-level `docker-compose.yml` that exposes ports 5000 and 3000, gives the backend a healthcheck on `/health`, and starts the frontend only once the backend is healthy. The Python slim image has no curl, so use Python for the healthcheck.

**Run it** from the project's top folder, with Docker Desktop open:

```bash
docker-compose up --build
```

The first build takes a few minutes. Leave that terminal running, then:

1. Open http://localhost:3000 and repeat the Phase 3 checks.
2. In a second terminal, run the `curl` examples from Phase 2 to confirm port 5000 works too.

To stop everything, press `Ctrl+C`, then run `docker-compose down`.

**Done when:** the whole app works from that one command, with nothing else running.

**Understand it:**

- **Why exactly one worker?** Each Gunicorn worker is a separate process with its own memory. With two workers, you'd effectively have two different task lists, and tasks would seem to appear and vanish at random. This is a good detail to mention in your README.
- **Why does nginx use the name `backend`?** Docker Compose gives each service a network name, so containers find each other by name rather than by `localhost`.
- **What is nginx?** A small, fast web server. React builds down to plain files, and nginx serves those files and forwards `/api` requests.

Commit.

---

## Phase 5: Add a few impressive extras (20 to 30 min)

The prompt invites you to impress them, but also says to keep styling minimal and not chase polish. Two or three well-finished extras will land better than many half-done ones. Do these in order and stop when time runs out.

| Priority | Extra | Why it's worth it |
|---|---|---|
| 1 | **Completion analytics:** add `created_at` and `completed_at` to tasks, then add completion rate and average time to complete to `/tasks/stats`, with a progress bar in the UI | Plays to your data background and is a memorable way to stand out |
| 2 | **Filter buttons:** All, Pending, Completed | Small effort, and an obvious usability gain |
| 3 | **GitHub Actions:** run the tests automatically on every push | Shows good engineering habits, and takes one short file |
| 4 | **SQLite storage with a Docker volume:** tasks survive restarts | The biggest upgrade, but the most work, so skip it if you're short on time |

Keep the original endpoints and fields working exactly as `Prompt.md` describes. Add new fields without changing or removing existing ones, because a reviewer may run their own checks against them.

Add a test for each backend extra, re-run `uv run pytest`, re-test with Docker, then commit each extra separately.

---

## Phase 6: Write the README (15 min)

Replace or create `README.md` at the top level. Ask Claude Code for a first draft, then **rewrite the three question answers in your own words**, because they're where reviewers hear your thinking.

It must include:

- **How to run it:** `docker-compose up --build`, then open http://localhost:3000, plus how to run the tests.
- **Mac note:** if port 5000 is already in use, turn off AirPlay Receiver. A reviewer on a Mac may hit the same problem you did.
- **Assumptions and simplifications:**
  - Data is in memory and is lost on restart (unless you did SQLite).
  - There's a single Gunicorn worker, and why.
  - There are no user accounts or login.
  - Completing an already-completed task succeeds and changes nothing.
  - IDs are never reused.
- **How did you handle API errors?** Input is checked before anything changes, errors all use one JSON format, status codes are meaningful, and the UI shows failures to the user.
- **What tests would you write with more time?** For example, frontend component tests, end-to-end browser tests, and tests of simultaneous requests.
- **What would you improve with 1 extra hour?** Pick things you actually want, such as editing tasks, a real database, or undoing a completion.
- **Extras:** a short list of what you added beyond the minimum.
- **AI use:** one honest sentence about how you used it. It's allowed, so stating it plainly reads well.

Commit.

---

## Phase 7: Do a final test and submit (15 min)

"Works on my machine" is the most common way these projects fail, so test exactly what the reviewer will do, starting from a fresh copy.

```bash
# In your project folder: stop anything still running
docker-compose down

# Make a fresh copy on your Desktop and run it
cd ~/Desktop
git clone https://github.com/b-travis/task_management_app.git test_copy
cd test_copy
docker-compose up --build
```

Then run through this list:

- [ ] http://localhost:3000 loads
- [ ] Adding, completing, and deleting tasks all work
- [ ] Stats update after each action
- [ ] The `curl` examples from `Prompt.md` work
- [ ] The README instructions match what you just did

To clean up, press `Ctrl+C`, then run:

```bash
docker-compose down
cd ~/Desktop
rm -rf test_copy
```

**Before submitting:**

1. Decide what to do with this file. Keeping `PLAN.md` in the repo is harmless, but you may prefer to delete it.
2. Check whether the repo is public or private:

   ```bash
   gh repo view b-travis/task_management_app --json visibility
   ```

3. If it's private, give the reviewer access: on the repo's GitHub page, go to **Settings → Collaborators → Add people**. You'll need their GitHub username, so ask your Carbon Arc contact.
4. Send them the link: https://github.com/b-travis/task_management_app

---

## If something goes wrong

| Problem | Likely cause and fix |
|---|---|
| "Cannot connect to the Docker daemon" | Docker Desktop isn't open. Open it and wait for the whale icon. |
| "Port is already allocated" or "address already in use" | Something else is on that port. Either AirPlay Receiver turned back on, or an earlier run is still going. Run `docker-compose down`, stop any local servers with `Ctrl+C`, and check `lsof -nP -iTCP:5000 -sTCP:LISTEN`. |
| The page loads but shows an error or no tasks | The frontend can't reach the backend. Run `docker-compose logs backend`, or paste the error into Claude Code. |
| A code change doesn't appear in Docker | You need to rebuild. Stop it and run `docker-compose up --build` again. |
| `npm` or `node` "command not found" | Close the terminal and open a new one. If that fails, re-run `brew install node`. |
| You're stuck for more than 10 minutes | Paste the full error message into Claude Code and ask what it means. |
