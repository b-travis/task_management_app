import { useState } from 'react'

const MAX_TITLE_LENGTH = 200 // matches the limit in the backend

function TaskForm({ busy, onAdd }) {
  const [title, setTitle] = useState('')
  const canSubmit = title.trim() !== '' && !busy

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    const added = await onAdd(title)
    if (added) {
      setTitle('') // keep the text after a failure so it can be resubmitted
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label="New task title"
        placeholder="What needs doing?"
        maxLength={MAX_TITLE_LENGTH}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" className="primary" disabled={!canSubmit}>
        Add task
      </button>
    </form>
  )
}

export default TaskForm
