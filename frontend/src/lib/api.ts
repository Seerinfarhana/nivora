const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const getToken = () => localStorage.getItem('nivora_token')
export const setToken = (t: string | null) =>
  t ? localStorage.setItem('nivora_token', t) : localStorage.removeItem('nivora_token')

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401 && token && path !== '/api/auth/login') {
    setToken(null)
    window.location.href = '/login'
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Something went wrong')
  }
  return res.json()
}