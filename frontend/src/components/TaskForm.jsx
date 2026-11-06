import { useState } from 'react'
import PrioritySelect from './PrioritySelect'

const MAX_TITLE_LENGTH = 200 // matches the limit in the backend
const MAX_TAG_LENGTH = 30
const DEFAULT_PRIORITY = 'P2'

function TaskForm({ busy, onAdd, label = 'New task', submitLabel = 'Add task' }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(DEFAULT_PRIORITY)
  const [tag, setTag] = useState('')
  const canSubmit = title.trim() !== '' && !busy

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    const added = await onAdd({ title, priority, tag })
    if (added) {
      // Keep the text after a failure so it can be resubmitted.
      setTitle('')
      setPriority(DEFAULT_PRIORITY)
      setTag('')
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        className="title-input"
        type="text"
        aria-label={`${label} title`}
        placeholder="What needs doing?"
        maxLength={MAX_TITLE_LENGTH}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <PrioritySelect label={`${label} priority`} value={priority} onChange={setPriority} />
      <input
        className="tag-input"
        type="text"
        aria-label={`${label} tag`}
        placeholder="Tag"
        list="tag-options"
        maxLength={MAX_TAG_LENGTH}
        value={tag}
        onChange={(event) => setTag(event.target.value)}
      />
      <button type="submit" className="primary" disabled={!canSubmit}>
        {submitLabel}
      </button>
    </form>
  )
}

export default TaskForm
