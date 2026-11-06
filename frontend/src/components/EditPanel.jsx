import { useState } from 'react'
import PrioritySelect from './PrioritySelect'

const MAX_TAG_LENGTH = 30 // matches the limit in the backend

function EditPanel({ task, busy, onSave, onClose }) {
  const [priority, setPriority] = useState(task.priority)
  const [tag, setTag] = useState(task.tag ?? '')

  async function handleSubmit(event) {
    event.preventDefault()
    const saved = await onSave({ priority, tag })
    if (saved) {
      onClose()
    }
  }

  return (
    <form className="edit-panel" onSubmit={handleSubmit}>
      <label>
        Priority
        <PrioritySelect label={`Priority for ${task.title}`} value={priority} onChange={setPriority} />
      </label>
      <label>
        Tag
        <input
          className="tag-input"
          type="text"
          aria-label={`Tag for ${task.title}`}
          list="tag-options"
          maxLength={MAX_TAG_LENGTH}
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        />
      </label>
      <button type="submit" className="primary" disabled={busy}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </form>
  )
}

export default EditPanel
