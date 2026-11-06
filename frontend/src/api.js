// Every call to the backend lives in this file.

const BASE_URL = '/api'

async function request(path, options) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new Error('Could not reach the server. Please try again.')
  }

  if (response.status === 204) {
    return null // success with nothing to read, such as after a delete
  }

  // A proxy error may not be JSON, so a failed parse falls through to the
  // generic message below.
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error ?? 'The server had a problem. Please try again.')
  }
  return data
}

export function getTasks() {
  return request('/tasks')
}

export function getStats() {
  return request('/tasks/stats')
}

export function getTags() {
  return request('/tags')
}

function sendJson(method, path, body) {
  return request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function createTask(task) {
  return sendJson('POST', '/tasks', task)
}

export function updateTask(id, changes) {
  return sendJson('PATCH', `/tasks/${id}`, changes)
}

export function completeTask(id) {
  return request(`/tasks/${id}/complete`, { method: 'PUT' })
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' })
}
