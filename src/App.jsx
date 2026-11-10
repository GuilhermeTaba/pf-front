import { useEffect, useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { listarAvaliacoes, cadastrarAvaliacao, getRoles } from './api'

const vazio = { emailAvaliado: '', comentarios: '', nota: 5 }

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0()
  const [token, setToken] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(false)

  const roles = token ? getRoles(token) : []
  const isAdmin = roles.includes('ADMIN')

  const carregar = useCallback(async (t) => {
    setCarregando(true)
    setErro('')
    try {
      setAvaliacoes(await listarAvaliacoes(t))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    getAccessTokenSilently()
      .then((t) => {
        setToken(t)
        carregar(t)
      })
      .catch((e) => setErro(e.message))
  }, [isAuthenticated, getAccessTokenSilently, carregar])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    try {
      await cadastrarAvaliacao(token, {
        emailAvaliador: user.email,
        emailAvaliado: form.emailAvaliado,
        nota: Number(form.nota),
        comentarios: form.comentarios.split('\n').map((c) => c.trim()).filter(Boolean),
      })
      setForm(vazio)
      setMsg('Avaliação cadastrada!')
      carregar(token)
    } catch (e) {
      setErro(e.message)
    }
  }

  if (isLoading) return <div className="center">Carregando...</div>

  if (!isAuthenticated) {
    return (
      <div className="center">
        <div className="card login">
          <h1>Sistema de Avaliações</h1>
          <p>Faça login para continuar.</p>
          <button onClick={() => loginWithRedirect()}>Entrar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>Avaliações</h1>
        <div className="user">
          <span>
            {user.email} {roles.length > 0 && <em>({roles.join(', ')})</em>}
          </span>
          <button
            className="secondary"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            Sair
          </button>
        </div>
      </header>

      {erro && <div className="alert error">{erro}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {isAdmin && (
        <form className="card" onSubmit={enviar}>
          <h2>Nova avaliação</h2>
          <label>
            Avaliador
            <input value={user.email} disabled />
          </label>
          <label>
            Email do avaliado
            <input
              type="email"
              required
              value={form.emailAvaliado}
              onChange={(e) => setForm({ ...form, emailAvaliado: e.target.value })}
            />
          </label>
          <label>
            Nota: <strong>{form.nota}</strong>
            <input
              type="range"
              min="0"
              max="10"
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
            />
          </label>
          <label>
            Comentários (um por linha)
            <textarea
              rows="3"
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
            />
          </label>
          <button type="submit">Cadastrar</button>
        </form>
      )}

      <div className="card">
        <div className="row">
          <h2>Lista de avaliações</h2>
          <button className="secondary" onClick={() => carregar(token)} disabled={carregando || !token}>
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        {avaliacoes.length === 0 ? (
          <p className="muted">Nenhuma avaliação cadastrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Avaliador</th>
                  <th>Avaliado</th>
                  <th>Nota</th>
                  <th>Comentários</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>{a.emailAvaliador}</td>
                    <td>{a.emailAvaliado}</td>
                    <td><span className="nota">{a.nota}</span></td>
                    <td>
                      {a.comentarios?.length ? (
                        <ul>{a.comentarios.map((c, i) => <li key={i}>{c}</li>)}</ul>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{a.dataAvaliacao ? new Date(a.dataAvaliacao).toLocaleString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
