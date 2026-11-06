function TaskItem({ task, busy, onComplete, onDelete }) {
  return (
    <li className={task.completed ? 'task completed' : 'task'}>
      <div className="task-text">
        <span className="task-title">{task.title}</span>
        <span className="task-status">{task.completed ? 'Completed' : 'Pending'}</span>
      </div>
      {!task.completed && (
        <button
          type="button"
          aria-label={`Complete ${task.title}`}
          disabled={busy}
          onClick={() => onComplete(task.id)}
        >
          Complete
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete ${task.title}`}
        disabled={busy}
        onClick={() => onDelete(task.id)}
      >
        Delete
      </button>
    </li>
  )
}

function TaskList({ tasks, busy, onComplete, onDelete }) {
  if (tasks.length === 0) {
    return <p className="message">No tasks yet. Add one above to get started.</p>
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          busy={busy}
          onComplete={onComplete}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

export default TaskList
