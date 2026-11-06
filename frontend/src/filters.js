export const NO_FILTERS = { tag: 'all', priority: 'all', status: 'all' }

// Tag filter values are 'all', 'none', or 'tag:' plus the tag's name. The prefix
// keeps a tag that a user happens to name "all" from clashing with those options.
export function tagFilterValue(tag) {
  return `tag:${tag}`
}

export function isFiltering(filters) {
  return Object.values(filters).some((value) => value !== 'all')
}

function matchesTag(task, tagFilter) {
  if (tagFilter === 'all') return true
  if (tagFilter === 'none') return task.tag === null
  return tagFilterValue(task.tag) === tagFilter
}

export function matchesFilters(task, filters) {
  return (
    matchesTag(task, filters.tag) &&
    (filters.priority === 'all' || task.priority === filters.priority) &&
    (filters.status === 'all' || task.status === filters.status)
  )
}

// If the tag being filtered on is no longer used, ignore that filter so the list
// doesn't stay empty for no visible reason.
export function withoutUnusedTag(filters, tags) {
  const tagInUse =
    ['all', 'none'].includes(filters.tag) || tags.some((tag) => tagFilterValue(tag) === filters.tag)
  return tagInUse ? filters : { ...filters, tag: 'all' }
}
