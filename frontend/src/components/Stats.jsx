function Stat({ label, value, detail }) {
  return (
    <div className="stat">
      <span className="stat-value">{value ?? '–'}</span>
      <span className="stat-label">{label}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  )
}

function Stats({ stats }) {
  return (
    <section className="stats" aria-label="Task statistics">
      <Stat label="Total" value={stats?.total} />
      <Stat
        label="Completed"
        value={stats?.completed}
        detail={stats && `${stats.main_completed} main · ${stats.sub_completed} sub`}
      />
      <Stat
        label="Pending"
        value={stats?.pending}
        detail={
          stats &&
          `${stats.not_started} not started · ${stats.in_progress} in progress · ${stats.blocked} blocked`
        }
      />
    </section>
  )
}

export default Stats
