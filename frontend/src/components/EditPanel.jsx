import { useState } from 'react'
import PrioritySelect from './PrioritySelect'

const MAX_TAG_LENGTH = 30 // matches the limit in the backend

function EditPanel({ task, parentOptions, hasSubTasks, busy, onSave, onClose }) {
  const [priority, setPriority] = useState(task.priority)
  const [tag, setTag] = useState(task.tag ?? '')
  const [parentId, setParentId] = useState(task.parent_id)

  async function handleSubmit(event) {
    event.preventDefault()
    const saved = await onSave({ priority, tag, parentId })
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
      <label>
        Sub-task of
        <select
          aria-label={`Parent of ${task.title}`}
          disabled={hasSubTasks}
          title={hasSubTasks ? 'Move this task\'s sub-tasks first' : undefined}
          value={parentId ?? ''}
          onChange={(event) => setParentId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">None (main task)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
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
