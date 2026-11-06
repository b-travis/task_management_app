const PRIORITIES = ['P0', 'P1', 'P2']

function PrioritySelect({ label, value, onChange }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {priority}
        </option>
      ))}
    </select>
  )
}

export default PrioritySelect
