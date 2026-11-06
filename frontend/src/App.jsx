import { useCallback, useEffect, useState } from 'react'
import { completeTask, createTask, deleteTask, getStats, getTasks } from './api'
import Stats from './components/Stats'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'

function App() {
  const [tasks, setTasks] = useState(null) // null until the first load succeeds
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    return Promise.all([getTasks(), getStats()])
      .then(([latestTasks, latestStats]) => {
        setTasks(latestTasks)
        setStats(latestStats)
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

  return (
    <main>
      <h1>Task Manager</h1>

      <Stats stats={stats} />

      <TaskForm busy={busy} onAdd={(title) => runAction(() => createTask(title))} />

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {tasks === null && !error && <p className="message">Loading tasks…</p>}

      {tasks !== null && (
        <TaskList
          tasks={tasks}
          busy={busy}
          onComplete={(id) => runAction(() => completeTask(id))}
          onDelete={(id) => runAction(() => deleteTask(id))}
        />
      )}
    </main>
  )
}

export default App
