import { NO_FILTERS, isFiltering, tagFilterValue } from '../filters'
import { STATUSES } from '../status'

function Filter({ label, value, onChange, children }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {children}
      </select>
    </label>
  )
}

function FilterBar({ filters, tags, shownCount, totalCount, onChange }) {
  const setFilter = (name) => (value) => onChange({ ...filters, [name]: value })

  return (
    <section className="filter-section" aria-label="Filters">
      <div className="filter-bar">
        <Filter label="Tag" value={filters.tag} onChange={setFilter('tag')}>
          <option value="none">No tag</option>
          {tags.map((tag) => (
            <option key={tag} value={tagFilterValue(tag)}>
              {tag}
            </option>
          ))}
        </Filter>
        <Filter label="Priority" value={filters.priority} onChange={setFilter('priority')}>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
        </Filter>
        <Filter label="Status" value={filters.status} onChange={setFilter('status')}>
          {STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Filter>
        {isFiltering(filters) && (
          <button type="button" onClick={() => onChange(NO_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
      {isFiltering(filters) && (
        <p className="filter-count">
          Showing {shownCount} of {totalCount} tasks
        </p>
      )}
    </section>
  )
}

export default FilterBar
