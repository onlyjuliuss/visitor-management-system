const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()

const normalizedBaseUrl = rawBaseUrl.endsWith('/')
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl

export const API_BASE_URL = normalizedBaseUrl

export const apiUrl = (path) => {
  if (!path.startsWith('/')) {
    throw new Error(`apiUrl path must start with '/': ${path}`)
  }
  return `${API_BASE_URL}${path}`
}

export const getAuthHeaders = (headers = {}) => {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    return headers
  }
  return {
    ...headers,
    Authorization: `Bearer ${token}`
  }
}

export const authFetch = (path, options = {}) => {
  const { headers = {}, ...rest } = options
  return fetch(apiUrl(path), {
    ...rest,
    headers: getAuthHeaders(headers)
  })
}

