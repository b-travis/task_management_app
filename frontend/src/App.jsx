import { useCallback, useEffect, useState } from 'react'
import {
  completeTask,
  createTask,
  deleteTask,
  getStats,
  getTags,
  getTasks,
  moveTask,
  updateTask,
} from './api'
import FilterBar from './components/FilterBar'
import Stats from './components/Stats'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import { NO_FILTERS, matchesFilters, withoutUnusedTag } from './filters'

// Puts a task at a new position among the tasks at its level, matching what the
// backend does, so a drop can show on screen before the backend has answered.
function placeAmongSiblings(tasks, moved, index) {
  const others = tasks.filter((task) => task.id !== moved.id)
  const siblings = others.filter((task) => task.parent_id === moved.parent_id)
  const position = index < siblings.length ? others.indexOf(siblings[index]) : others.length
  return [...others.slice(0, position), moved, ...others.slice(position)]
}

function App() {
  const [tasks, setTasks] = useState(null) // null until the first load succeeds
  const [stats, setStats] = useState(null)
  const [tags, setTags] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [chosenFilters, setChosenFilters] = useState(NO_FILTERS)
  const filters = withoutUnusedTag(chosenFilters, tags)

  const refresh = useCallback(() => {
    return Promise.all([getTasks(), getStats(), getTags()])
      .then(([latestTasks, latestStats, latestTags]) => {
        setTasks(latestTasks)
        setStats(latestStats)
        setTags(latestTags)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Runs a change, then reloads from the backend so the page always shows what
  // the backend has. Buttons are disabled meanwhile to prevent double clicks.
  // Returns whether the change itself succeeded.
  async function runAction(action) {
    setBusy(true)
    try {
      await action()
      await refresh()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const actions = {
    add: (task) => runAction(() => createTask(task)),
    complete: (id) => runAction(() => completeTask(id)),
    remove: (id) => runAction(() => deleteTask(id)),
    setStatus: (id, status) => runAction(() => updateTask(id, { status })),
    reorder: (task, index) => {
      setTasks((current) => placeAmongSiblings(current, task, index))
      return runAction(async () => {
        try {
          await moveTask(task.id, { parent_id: task.parent_id, index })
        } catch (err) {
          await refresh() // undo the on-screen move if it couldn't be saved
          throw err
        }
      })
    },
    save: (task, { priority, tag, parentId }) =>
      runAction(async () => {
        await updateTask(task.id, { priority, tag })
        if (parentId !== task.parent_id) {
          await moveTask(task.id, { parent_id: parentId })
        }
      }),
  }

  return (
    <main>
      <header className="hero">
        <h1>Task Manager</h1>
        <Stats stats={stats} />
      </header>

      <TaskForm busy={busy} onAdd={actions.add} />

      {/* Suggestions shared by every tag box on the page. */}
      <datalist id="tag-options">
        {tags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {tasks === null && !error && <p className="message">Loading tasks…</p>}

      {tasks?.length > 0 && (
        <FilterBar
          filters={filters}
          tags={tags}
          shownCount={tasks.filter((task) => matchesFilters(task, filters)).length}
          totalCount={tasks.length}
          onChange={setChosenFilters}
        />
      )}

      {tasks !== null && (
        <TaskList
          tasks={tasks}
          filters={filters}
          busy={busy}
          actions={actions}
          onClearFilters={() => setChosenFilters(NO_FILTERS)}
        />
      )}
    </main>
  )
}

export default App
