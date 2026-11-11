import { useEffect, useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { listarAvaliacoes, cadastrarAvaliacao, getRoles,request } from './api'

const vazio = { emailAvaliado: '', comentarios: '', nota: 5 }

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0()
  const [token, setToken] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [form, setForm] = useState(vazio)

  const [idDel, setIdDel] = useState(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(false)

  const roles = token ? getRoles(token) : []
  const isAdmin = true
  async function deletarId(e){
    e.preventDefault()
    try{
      console.log(idDel)
      request(`/tarefas/${idDel}`)
    }catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
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
        título: form.título,
        email : form.email,
        descrição: form.descrição,
        prioridade : form.prioridade,
        
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
          <h1>Sistema de Tarefas</h1>
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
          <h2>Nova tarefa</h2>
 
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Prioridade: <strong>{form.prioridade}</strong>
            <input
              type="text"
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
            />
          </label>
                    <label>
            Titulo: <strong>{form.título}</strong>
            <input
              type="text"
              value={form.título}
              onChange={(e) => setForm({ ...form, título: e.target.value })}
            />
          </label>
                    <label>
            Descricao: <strong>{form.descrição}</strong>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descrição: e.target.value })}
            />
          </label>

          <button type="submit">Cadastrar</button>
        </form>
      )}

      <div className="card">
        <div className="row">
          <h2>Lista de Tarefas</h2>
          <button className="secondary" onClick={() => carregar(token)} disabled={carregando || !token}>
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        {avaliacoes.length === 0 ? (
          <p className="muted">Nenhuma tarefa cadastrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titulo</th>
                  <th>Descricao</th>
                  <th>Prioridade</th>
                  <th>Email</th>
             
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>{a.título}</td>
                    <td>{a.descrição}</td>
                    <td>{a.prioridade}</td>
                    <td>{a.email}</td>


                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

   


        </div>
          <form className="card" onSubmit={deletarId}>
          <h2>Deletar tarefa</h2>
 
          <label>
            Id
            <input
              type="text"
              required
              value={idDel}
              onChange={(e) => setIdDel(e.target.value)}
            />
          </label>
          
          <button type="submit">Deletar</button>
          </form>

      </div>

  )
}
