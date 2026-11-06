# Extensions: Making the App More Interesting

This is the record of the app's new features. Round 1 (features 1 to 5) is built and on GitHub. Round 2 (features 6 and 7) is also built and on GitHub. The README's final answers are parked until these are done.

**The goal:** add these within about an hour without breaking anything the prompt requires.

**The ground rule:** the five original endpoints keep working as `Prompt.md` describes. Tasks gain new fields, but none of the original fields change. `POST /tasks` with only a title still works.

---

## Decisions needed

Each feature raises a few product questions. These are the agreed answers, and the rest of this doc assumes them. These were reviewed and agreed on 2026-11-06.

| # | Question | Recommendation | Why |
|---|---|---|---|
| 1 | How deep can sub-tasks go? | **One level only.** A sub-task can't have its own sub-tasks. | Much simpler to build and display, and it covers the feature you described. |
| 2 | What happens when a main task with sub-tasks is moved under another task? | **Block it** and show an error. Its sub-tasks must be moved first. | Follows from #1, and avoids silently rearranging someone's work. |
| 3 | What happens to sub-tasks when their main task is completed? | **They complete too.** | A finished task with open work under it would be confusing. |
| 4 | What happens to sub-tasks when their main task is deleted? | **They're deleted too**, after a confirmation message. | The app has no undo, so the confirmation matters. |
| 5 | Do sub-tasks count in the stats? | **Yes**, every task counts, and completed tasks are also shown **separately for main tasks and sub-tasks**. | Each sub-task is a real task, and the split shows how much top-level work is finished. |
| 6 | What's the default priority? | **P2.** | Every task needs a priority, and the lowest is the safest default. P0 is the most urgent. |
| 7 | Does priority change the list order? | **No.** It shows as a colored label, and your manual order decides the position. | Automatic sorting would conflict with drag and drop. |
| 8 | Does drag and drop also create sub-tasks? | **No.** Dragging only reorders tasks at the same level. A dropdown handles sub-task changes. | Telling "drop between" from "drop onto" is the hardest part of this work, and it could use up the hour. Dragging to nest is a stretch goal. |

---

## 1. Sub-tasks

**What you'll be able to do**
- Add a sub-task directly under a main task.
- Turn an existing task into a sub-task of another task.
- Turn a sub-task back into a main task.
- See sub-tasks indented under their main task.

**How it works**
- Each task gets a new `parent_id` field. It holds the main task's ID, or `null` for a main task. This is the same idea as a foreign key column in a table.
- `GET /tasks` stays a flat list, as the prompt expects, and the frontend uses `parent_id` to arrange it into a nested view.

**Stats**
- `/tasks/stats` keeps `total`, `completed`, and `pending`, which count every task, as the prompt requires.
- It gains `main_completed` and `sub_completed`, so completed main tasks and completed sub-tasks are counted separately.
- The page keeps one overall **Completed** number, with the main and sub-task split shown under it.

**Moves that must be rejected with a 400**
- Making a task its own sub-task.
- Choosing a parent that doesn't exist.
- Choosing a parent that is already a sub-task (decision 1).
- Moving a task that has its own sub-tasks (decision 2).

## 2. Priority

**What you'll be able to do**
- Choose P0, P1, or P2 when creating a task, and change it later.
- See the priority as a colored label on each task.

**How it works**
- Each task gets a `priority` field. Anything other than `P0`, `P1`, or `P2` returns a 400.

## 3. Tags

**What you'll be able to do**
- Type any tag you like on a task, or pick one you've used before.
- Clear a tag, so the task has none.

**How it works**
- Each task gets a `tag` field holding text or `null`, so one tag per task is built in.
- A new `GET /tags` endpoint lists the tags currently in use, which fills the suggestions as you type.
- Tags have surrounding spaces removed and can be up to 30 characters. A blank tag means no tag.
- Typing `work` when `Work` already exists reuses `Work`, so near-duplicates don't build up.

**The simplification:** a tag exists as long as some task uses it, so there's no separate screen for managing tags. Renaming a tag everywhere or giving tags their own colors would be future work.

## 4. Aesthetics

Carbon Arc's website stylesheet is public, so we can borrow from its real design values rather than inventing a white and navy brand. These come from the stylesheet and home page at carbonarc.co, checked on 2026-11-06.

**Colors**

| Role | Value | Where it comes from |
|---|---|---|
| Page background | `#ffffff` | Site background |
| Main text | `#0c0a09` (near black) | Site foreground color |
| Secondary text | `#78716c` | Site muted text |
| Panels | `#f5f5f4` | Site muted background |
| Borders | `#e7e5e4` | Site border color |
| Header panel | `#000d30` to `#001a60` (navy) | `--ca-cobalt-900` and `--ca-cobalt-800`, like the site's dark hero |
| Main buttons | `#ff7125` (orange) with black text | `--ca-orange-500`, like the site's Sign Up button |
| Focus outlines | `#0040ef` (cobalt) | `--ca-cobalt-500` |

**Fonts**
- Carbon Arc's headline fonts are custom (26A1 Marund and MD Thermochrome), and custom fonts are usually licensed. We **shouldn't copy those font files** into your project.
- Headings use **Space Grotesk**, the free, open-source font listed next in their heading font list. It's installed with the project, so it works on any computer.
- Body text uses their **Avenir** font list. Macs have Avenir built in, and other computers fall back to a similar font.
- Main buttons and numbers use a monospace font, as their buttons do.

**Other details**
- Main buttons are rounded pills with uppercase text, and other corners use their 8px radius (`--radius: .5rem`).
- Priority labels use tinted backgrounds: orange for P0, amber for P1, and gray for P2.
- We won't use Carbon Arc's logo or name in the app. It stays "Task Manager," inspired by their style rather than posing as their product.

The prompt asks for minimal styling, so this should stay clean and restrained.

## 5. Reordering

**What you'll be able to do**
- Drag a task by its handle (⠿) to a new position.
- Reorder main tasks among main tasks, and sub-tasks within their main task.
- Move a main task, and its sub-tasks move with it.

**How it works**
- The backend stores the order, so it survives a page refresh.
- `GET /tasks` returns tasks in that saved order.
- The page shows a drop immediately, then saves it. If saving fails, the page reloads the true order and shows the usual error message.
- New tasks go to the bottom of their level.

**A new tool:** I recommend **dnd-kit**, a React drag-and-drop library. Browsers have basic dragging built in, but it's unreliable for sortable lists and doesn't work from the keyboard. dnd-kit handles both.

---

## API changes

The original endpoints stay. `POST /tasks` also accepts optional `priority`, `tag`, and `parent_id` values.

| Method | Endpoint | Purpose |
|---|---|---|
| PATCH | `/tasks/<id>` | Change a task's priority or tag |
| PUT | `/tasks/<id>/move` | Change a task's parent, position, or both |
| GET | `/tags` | List the tags in use |

One `move` endpoint handles nesting, un-nesting, and reordering, because all three answer the same question: where does this task now sit?

A task will look like this:

```json
{
  "id": 2,
  "title": "Draft the intro",
  "completed": false,
  "priority": "P1",
  "tag": "Work",
  "parent_id": 1
}
```

---

## What the page will look like

```text
Task Manager
┌───────────┐ ┌───────────┐ ┌───────────┐
│ 5  Total  │ │ 2  Done   │ │ 3  Pending│
│           │ │ 1 main    │ │           │
│           │ │ 1 sub     │ │           │
└───────────┘ └───────────┘ └───────────┘

[ What needs doing?        ] [P2 ▾] [Tag     ] [Add task]

⠿ Write report      [P0] [Work]    + Sub-task  Complete  Edit  Delete
    ⠿ Draft intro   [P1] [Work]                Complete  Edit  Delete
    ⠿ Add charts    [P2]                       Complete  Edit  Delete
⠿ Book flights      [P1] [Travel]  + Sub-task  Complete  Edit  Delete
⠿ Renew passport    [P2]           + Sub-task  Complete  Edit  Delete
```

**Edit** opens a small panel under the task with its priority, its tag, and a **Sub-task of** dropdown. Choosing "None" in that dropdown makes it a main task. Keeping these in a panel stops each row from becoming crowded.

---

## Build order

Each step ends with passing tests, a browser check, and a commit, so we can stop after any step and still have something ready to submit.

| Step | Work | Rough time |
|---|---|---|
| 1 | Theme: quick to do and has the biggest visual effect | 10 min |
| 2 | Priority and tags: simple new fields, plus the Edit panel | 15 min |
| 3 | Sub-tasks: new rules in the backend and a nested display | 20 min |
| 4 | Reordering: the riskiest step, so it goes last | 15 min |
| 5 | Final Docker check and README update | 10 min |

That's about 70 minutes, before you write the README answers. If time runs short, **cut step 4 first** and list reordering under "What would you improve with 1 extra hour?"

---

## Testing

- **Backend:** add tests for each new endpoint and each rejected move in decisions 1 and 2, plus the cascade rules in decisions 3 and 4.
- **Existing tests:** `test_create_task` checks the exact fields returned, so it needs updating for the new fields. The rest of the original behavior stays covered.
- **Browser:** check each feature in Chrome through Docker, including that a saved order survives a refresh.

## README updates when this is done

- Add an extras section and the new endpoints to the API table.
- Add decisions 1 to 8 to the assumptions, trimmed down to the ones that matter.
- Update the "extra hour" answer so it doesn't list anything you've already built.

## Round 2: Completion status and filters

**The ground rule still applies:** the prompt's `completed` true/false field, `PUT /tasks/<id>/complete`, and the `total`, `completed`, and `pending` stats all keep working as written.

### Decisions needed

These are the agreed answers. One rule was added while building: decision 14 also applies when an open task is added or moved under a completed main task.

| # | Question | Recommendation | Why |
|---|---|---|---|
| 9 | How does the new status fit with the required `completed` field? | **`status` becomes the real value, and `completed` is worked out from it.** `completed` is true only when the status is Completed. | The two can never disagree, and the prompt's API keeps working. |
| 10 | What does "pending" mean now? | **Anything not Completed**: Not Started, In Progress, and Blocked. | Keeps the required stat correct, and the page can show the split under it. |
| 11 | Does the Complete button stay? | **Yes, next to a status dropdown** that replaces the Pending/Completed text. | The prompt requires a complete button, and it's the quickest way to finish a task. |
| 12 | Does setting a main task to Completed through the dropdown complete its sub-tasks? | **Yes**, the same as the Complete button (decision 3). Other statuses don't affect sub-tasks. | One rule, however a task gets completed. |
| 13 | What happens when a completed task is reopened? | **Allowed.** A reopened main task leaves its sub-tasks as they are. | This adds the undo the app didn't have. Restoring earlier sub-task statuses would mean remembering them. |
| 14 | What if a sub-task is reopened under a completed main task? | **The main task moves to In Progress.** | Follows decision 3: a finished task shouldn't have open work under it. |
| 15 | Does each filter allow one value or several? | **One value each, with "All" as the default.** | Three simple dropdowns are quick to build and easy to use. |
| 16 | How do filters combine? | **A task must match all of them**, such as P0 and Blocked. | This is what people usually expect, and it's how you'd narrow a list. |
| 17 | What happens when only a sub-task matches? | **Its main task shows too, dimmed, for context.** Sub-tasks that don't match are hidden. | An indented sub-task with no main task above it would be confusing. |
| 18 | Do the stats follow the filters? | **No**, they always count every task. A "Showing 3 of 9" line covers the filtered view. | The stats stay consistent, and they already come from the API. |
| 19 | Can tasks be dragged while filters are on? | **No.** The drag handles are hidden until filters are cleared. | With tasks hidden, a drop position is ambiguous and could save the wrong order. |
| 20 | Where does filtering happen? | **In the browser**, with no backend change. | The page already has every task, so results are instant and `GET /tasks` stays as the prompt describes. Server-side filtering would matter with a real database and far more tasks. |

### 6. Completion status

**What you'll be able to do**
- Set each task to Not Started, In Progress, Blocked, or Completed from a dropdown on the task.
- Reopen a completed task.
- See how pending tasks split across the three open statuses.

**How it works**
- Each task gets a `status` field holding `not_started`, `in_progress`, `blocked`, or `completed`. New tasks start as `not_started`.
- `POST /tasks` accepts an optional `status`, and `PATCH /tasks/<id>` can change it. Anything else returns a 400.
- `PUT /tasks/<id>/complete` sets the status to `completed`.
- Internally, the backend stores only `status` and adds `completed` when it sends a task back.
- `/tasks/stats` gains `not_started`, `in_progress`, and `blocked`. The **Pending** card shows that split under its number, as **Completed** does for main and sub-tasks.
- Each status gets a color from the Carbon Arc palette. Strikethrough stays for Completed.

A task will look like this:

```json
{
  "id": 2,
  "title": "Draft the intro",
  "completed": false,
  "status": "blocked",
  "priority": "P1",
  "tag": "Work",
  "parent_id": 1
}
```

### 7. Filters

**What you'll be able to do**
- Filter by tag, including a "No tag" option.
- Filter by priority.
- Filter by completion status.
- Use any combination, and reset them with **Clear filters**.

**How it works**
- A filter bar sits between the add-task form and the list.
- Tag choices come from the existing `GET /tags`.
- If nothing matches, the page says "No tasks match these filters" with a **Clear filters** button.
- If the tag being filtered on stops being used, that filter returns to "All", so the list doesn't stay empty for no visible reason.
- A new task that doesn't match the current filters won't appear until they change. The "Showing" count updates, so it's clear the task was added.
- Filters reset when the page is refreshed.

```text
Tag [All ▾]   Priority [All ▾]   Status [All ▾]   Clear filters
Showing 3 of 9 tasks

⠿ Write report   [P0] [Work]   [In Progress ▾]   + Sub-task  Complete  Edit  Delete
```

### Build order

| Step | Work | Rough time |
|---|---|---|
| 1 | Status in the backend, with tests | 15 min |
| 2 | Status dropdown, colors, and the Pending split | 15 min |
| 3 | Filter bar and nested filter rules | 20 min |
| 4 | Docker check and README update | 10 min |

That's about 60 minutes. Status goes first because the status filter depends on it. Each step ends with a commit, and if time runs short, filters can be cut without affecting status.

### Testing

- **Backend:** cover valid and invalid statuses, `completed` always matching `status`, the `/complete` endpoint, decisions 12 to 14, and the new stats. Tests that check exact task fields or stats need the new fields added.
- **Browser:** cover each filter alone and combined, a sub-task match showing its dimmed main task, hidden drag handles, the empty message, and the disappearing-tag case.
- **Isolation:** run browser checks on a separate test backend, so they can't touch a running Docker app.

### README updates

- Add both features, the new `status` field, and the new stats.
- Add the agreed decisions to the assumptions.
- Remove "undo a completion" and "filters" from the "extra hour" answer, because they'd be built. Add "filtering in the API" only if you'd really pick it.

---

## Next steps: Real storage and users

None of this is built yet. It would be done on a separate branch, so the working version on `main` stays untouched. Storage comes first, because users need somewhere permanent to live.

### How to choose storage

Pick the level based on the problem to solve:

| Need | What it takes |
|---|---|
| Tasks survive a restart | Saved storage, such as SQLite |
| More than one server process | A database that handles simultaneous writes well |
| Many users at once, or several servers | A database server such as Postgres |
| Changing the data structure safely over time | Migrations, which are versioned scripts that update the tables |

SQLite is the right next step. It's a real SQL database stored in one file, with no extra service to run. Postgres comes later, once there are real users or several servers.

### Step 1: Move tasks to SQLite

All storage goes through the `TaskStore` class in `backend/app.py`, so the API routes and the React frontend shouldn't need to change.

```sql
CREATE TABLE tasks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    status    TEXT NOT NULL DEFAULT 'not_started',
    priority  TEXT NOT NULL DEFAULT 'P2',
    tag       TEXT,
    parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL
);
```

- **Ordering:** the new `position` column replaces today's reliance on dict order. This is the fiddliest part of the change.
- **Sub-task rules:** `ON DELETE CASCADE` handles deleting sub-tasks. The status and nesting rules stay in Python.
- **Thread lock:** database transactions replace it, and the one-worker limit can go. SQLite still handles only one write at a time, which is fine at this size.
- **Docker:** a named volume keeps the database file when containers are replaced.
- **Tests:** each test uses its own temporary database.

Rough time: about an hour, including re-testing.

**Keeping a demo fresh:** `docker-compose down` keeps tasks, and `docker-compose down -v` wipes them by deleting the volume.

### Step 2: Add simple users

- **Data:** a `users` table with an ID, a unique username, and a hashed password, plus a `user_id` column on `tasks`. Passwords are never stored as plain text.
- **Login:** register, log in, and log out endpoints, using a session cookie. The browser only talks to one address, so cookies work simply here.
- **Pages:** a login and sign-up page in front of the task list.
- **Separation:** each person sees only their own tasks, tags, and stats. Asking for someone else's task returns a 404, so the API doesn't reveal that it exists. A sub-task's parent must belong to the same user.

**A decision to make first:** requiring login would make the brief's sample `curl` commands return a 401 error, because they don't log in. Either keep a guest user for requests with no login, or accept the change and update the README. Keeping a guest user would protect the original API.

### Step 3: Later, if the app grows

- Move from SQLite to Postgres as a new service in Docker Compose.
- Add migrations with Alembic, so table changes are tracked and repeatable.

---

## Out of scope for now

- Text search.
- Selecting several values in one filter.
- Saving filters across page refreshes.
- Sub-tasks within sub-tasks.
- Dragging a task onto another to nest it.
- Multiple tags per task, or tag renaming and colors.
- Undo for deleting.
- Saving tasks across backend restarts, and user accounts. See [Next steps](#next-steps-real-storage-and-users).
