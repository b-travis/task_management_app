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
import Stats from './components/Stats'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'

function App() {
  const [tasks, setTasks] = useState(null) // null until the first load succeeds
  const [stats, setStats] = useState(null)
  const [tags, setTags] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

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

      {tasks !== null && <TaskList tasks={tasks} busy={busy} actions={actions} />}
    </main>
  )
}

export default App
