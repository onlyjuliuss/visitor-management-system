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

