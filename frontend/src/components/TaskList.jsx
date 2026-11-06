import { useState } from 'react'
import EditPanel from './EditPanel'
import TaskForm from './TaskForm'

function TaskItem({ task, subTasks = [], mainTasks, busy, actions }) {
  const [editing, setEditing] = useState(false)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const isMainTask = task.parent_id === null

  function handleDelete() {
    const count = subTasks.length
    const message = `Delete "${task.title}" and its ${count} sub-task${count === 1 ? '' : 's'}?`
    if (count === 0 || window.confirm(message)) {
      actions.remove(task.id)
    }
  }

  return (
    <li className={task.completed ? 'task completed' : 'task'}>
      <div className="task-row">
        <div className="task-text">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            <span className="task-status">{task.completed ? 'Completed' : 'Pending'}</span>
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
            onAdd={(subTask) => actions.add({ ...subTask, parent_id: task.id })}
          />
        </div>
      )}

      {subTasks.length > 0 && (
        <ul className="sub-task-list">
          {subTasks.map((subTask) => (
            <TaskItem
              key={subTask.id}
              task={subTask}
              mainTasks={mainTasks}
              busy={busy}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function TaskList({ tasks, busy, actions }) {
  if (tasks.length === 0) {
    return <p className="message">No tasks yet. Add one above to get started.</p>
  }

  // The API returns a flat list, so nest sub-tasks under their main task here.
  const mainTasks = tasks.filter((task) => task.parent_id === null)

  return (
    <ul className="task-list">
      {mainTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subTasks={tasks.filter((other) => other.parent_id === task.id)}
          mainTasks={mainTasks}
          busy={busy}
          actions={actions}
        />
      ))}
    </ul>
  )
}

export default TaskList
