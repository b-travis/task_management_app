import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import EditPanel from './EditPanel'
import SortableList from './SortableList'
import { isFiltering, matchesFilters } from '../filters'
import { STATUSES } from '../status'
import TaskForm from './TaskForm'

// subTasks holds every sub-task, so rules such as the delete confirmation count
// the ones filters are hiding. shownSubTasks holds the ones to display.
function TaskItem({
  task,
  subTasks = [],
  shownSubTasks = [],
  mainTasks,
  dimmed = false,
  canDrag,
  busy,
  actions,
}) {
  const [editing, setEditing] = useState(false)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const isMainTask = task.parent_id === null
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: busy || !canDrag })

  async function handleAddSubTask(subTask) {
    const added = await actions.add({ ...subTask, parent_id: task.id })
    if (added) {
      setAddingSubTask(false) // stays open after a failure so the text isn't lost
    }
    return added
  }

  function handleDelete() {
    const count = subTasks.length
    const message = `Delete "${task.title}" and its ${count} sub-task${count === 1 ? '' : 's'}?`
    if (count === 0 || window.confirm(message)) {
      actions.remove(task.id)
    }
  }

  return (
    <li
      ref={setNodeRef}
      className={`task${task.completed ? ' completed' : ''}${isDragging ? ' dragging' : ''}${dimmed ? ' dimmed' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className="task-row">
        {canDrag && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="drag-handle"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${task.title}`}
          >
            ⠿
          </button>
        )}
        <div className="task-text">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            <select
              className={`status-select status-${task.status}`}
              aria-label={`Status of ${task.title}`}
              disabled={busy}
              value={task.status}
              onChange={(event) => actions.setStatus(task.id, event.target.value)}
            >
              {STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className={`badge priority-${task.priority}`}>{task.priority}</span>
            {task.tag && <span className="badge tag">{task.tag}</span>}
          </div>
        </div>
        {isMainTask && !task.completed && (
          <button
            type="button"
            aria-label={`Add sub-task to ${task.title}`}
            aria-expanded={addingSubTask}
            onClick={() => setAddingSubTask(!addingSubTask)}
          >
            + Sub-task
          </button>
        )}
        {!task.completed && (
          <button
            type="button"
            aria-label={`Complete ${task.title}`}
            disabled={busy}
            onClick={() => actions.complete(task.id)}
          >
            Complete
          </button>
        )}
        <button
          type="button"
          aria-label={`Edit ${task.title}`}
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          disabled={busy}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {editing && (
        <EditPanel
          task={task}
          parentOptions={mainTasks.filter((option) => option.id !== task.id)}
          hasSubTasks={subTasks.length > 0}
          busy={busy}
          onSave={(changes) => actions.save(task, changes)}
          onClose={() => setEditing(false)}
        />
      )}

      {addingSubTask && !task.completed && (
        <div className="sub-task-form">
          <TaskForm
            busy={busy}
            label={`Sub-task of ${task.title}`}
            submitLabel="Add sub-task"
            onAdd={handleAddSubTask}
          />
        </div>
      )}

      {shownSubTasks.length > 0 && (
        <SortableList items={shownSubTasks} className="sub-task-list" onReorder={actions.reorder}>
          {shownSubTasks.map((subTask) => (
            <TaskItem
              key={subTask.id}
              task={subTask}
              mainTasks={mainTasks}
              canDrag={canDrag}
              busy={busy}
              actions={actions}
            />
          ))}
        </SortableList>
      )}
    </li>
  )
}

function TaskList({ tasks, filters, busy, actions, onClearFilters }) {
  if (tasks.length === 0) {
    return <p className="message">No tasks yet. Add one above to get started.</p>
  }

  // The API returns a flat list, so nest sub-tasks under their main task here.
  const mainTasks = tasks.filter((task) => task.parent_id === null)
  const subTasksOf = (task) => tasks.filter((other) => other.parent_id === task.id)
  const matches = (task) => matchesFilters(task, filters)

  // A main task shows if it matches, or to give context to a sub-task that does.
  const shownMainTasks = mainTasks.filter(
    (task) => matches(task) || subTasksOf(task).some(matches),
  )

  if (shownMainTasks.length === 0) {
    return (
      <div className="message">
        <p>No tasks match these filters.</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <SortableList items={shownMainTasks} className="task-list" onReorder={actions.reorder}>
      {shownMainTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subTasks={subTasksOf(task)}
          shownSubTasks={subTasksOf(task).filter(matches)}
          mainTasks={mainTasks}
          dimmed={!matches(task)}
          canDrag={!isFiltering(filters)}
          busy={busy}
          actions={actions}
        />
      ))}
    </SortableList>
  )
}

export default TaskList
