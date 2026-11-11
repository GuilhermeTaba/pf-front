const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function request(path, token, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Erro ${res.status}${text ? `: ${text}` : ''}`)
  }
  return res.json()
}
export const deletar = (token, id) =>
  request(`/tarefas/${id}`, auth(token),{ method: 'POST'})
export const listarAvaliacoes = (token) => request('/tarefas', token)

export const cadastrarAvaliacao = (token, avaliacao) =>
  request('/tarefas', token, { method: 'POST', body: JSON.stringify(avaliacao) })

// Le os roles do access token (mesmo claim usado no WebSecurityConfig do backend)
export function getRoles(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload['https://social-insper.com/roles'] || []
  } catch {
    return []
  }
}
