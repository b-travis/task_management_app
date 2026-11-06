function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">{value ?? '–'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function Stats({ stats }) {
  return (
    <section className="stats" aria-label="Task statistics">
      <Stat label="Total" value={stats?.total} />
      <Stat label="Completed" value={stats?.completed} />
      <Stat label="Pending" value={stats?.pending} />
    </section>
  )
}

export default Stats
