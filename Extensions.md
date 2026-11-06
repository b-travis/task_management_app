# Extensions: Making the App More Interesting

This is the plan for five new features. The README's final answers are parked until these are done.

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

## Out of scope for now

- Filtering or searching by tag or priority.
- Sub-tasks within sub-tasks.
- Dragging a task onto another to nest it.
- Multiple tags per task, or tag renaming and colors.
- Undo for completing or deleting.
- Saving tasks across backend restarts.
