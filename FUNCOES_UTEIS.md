# Funções úteis — Axios, Forms e Listas

(`axios` já está instalado: `npm install axios`)

---

## 1. Axios — mandar requisição

### `src/api.js` com axios

```js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Helper pra montar o header com o token
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

// GET lista
export const listar = (token) =>
  api.get('/avaliacoes', auth(token)).then((r) => r.data)

// GET por id
export const buscar = (token, id) =>
  api.get(`/avaliacoes/${id}`, auth(token)).then((r) => r.data)

// GET com filtro (?emailAvaliado=x&notaMin=7)
export const listarComFiltro = (token, filtros) =>
  api.get('/avaliacoes', { ...auth(token), params: filtros }).then((r) => r.data)

// POST cadastrar
export const cadastrar = (token, dados) =>
  api.post('/avaliacoes', dados, auth(token)).then((r) => r.data)

// PUT atualizar
export const atualizar = (token, id, dados) =>
  api.put(`/avaliacoes/${id}`, dados, auth(token)).then((r) => r.data)

// DELETE
export const deletar = (token, id) =>
  api.delete(`/avaliacoes/${id}`, auth(token))

// Pegar mensagem de erro do axios
export const msgErro = (e) =>
  e.response
    ? `Erro ${e.response.status}: ${e.response.data?.message || JSON.stringify(e.response.data)}`
    : e.message

// Ler roles do token
export function getRoles(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))['https://social-insper.com/roles'] || []
  } catch {
    return []
  }
}
```

### Usando no componente

```jsx
import { listar, cadastrar, deletar, msgErro } from './api'

try {
  const dados = await listar(token)
  setLista(dados)
} catch (e) {
  setErro(msgErro(e))
}
```

### Axios direto (sem api.js)

```js
const res = await axios.get('/api/avaliacoes', {
  headers: { Authorization: `Bearer ${token}` },
})
console.log(res.data)

await axios.post('/api/avaliacoes', { nota: 8, emailAvaliado: 'a@b.com' }, {
  headers: { Authorization: `Bearer ${token}` },
})
```

---

## 2. Forms

### Form com um objeto de estado (o jeito mais fácil)

```jsx
const vazio = { emailAvaliado: '', nota: 5, comentarios: '' }
const [form, setForm] = useState(vazio)

// um handler pra todos os campos (usa o "name" do input)
const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

async function enviar(e) {
  e.preventDefault()               // não recarregar a página
  try {
    await cadastrar(token, {
      ...form,
      emailAvaliador: user.email,
      nota: Number(form.nota),     // input sempre vem como string!
      comentarios: form.comentarios.split('\n').map((c) => c.trim()).filter(Boolean),
    })
    setForm(vazio)                 // limpa o form
    setMsg('Cadastrado!')
    carregar()                     // recarrega a lista
  } catch (e) {
    setErro(msgErro(e))
  }
}

return (
  <form className="card" onSubmit={enviar}>
    <h2>Nova avaliação</h2>

    {/* texto / email */}
    <label>
      Email do avaliado
      <input name="emailAvaliado" type="email" required value={form.emailAvaliado} onChange={mudar} />
    </label>

    {/* número */}
    <label>
      Nota
      <input name="nota" type="number" min="0" max="10" value={form.nota} onChange={mudar} />
    </label>

    {/* slider */}
    <label>
      Nota: <strong>{form.nota}</strong>
      <input name="nota" type="range" min="0" max="10" value={form.nota} onChange={mudar} />
    </label>

    {/* textarea */}
    <label>
      Comentários (um por linha)
      <textarea name="comentarios" rows="3" value={form.comentarios} onChange={mudar} />
    </label>

    <button type="submit">Cadastrar</button>
  </form>
)
```

### Outros tipos de campo

```jsx
{/* select */}
<label>
  Tipo
  <select name="tipo" value={form.tipo} onChange={mudar}>
    <option value="">Selecione...</option>
    <option value="A">Opção A</option>
    <option value="B">Opção B</option>
  </select>
</label>

{/* select vindo de uma lista */}
<select name="emailAvaliado" value={form.emailAvaliado} onChange={mudar}>
  {usuarios.map((u) => <option key={u.id} value={u.email}>{u.nome}</option>)}
</select>

{/* checkbox (usa checked, não value) */}
<label>
  <input type="checkbox" name="ativo" checked={form.ativo}
         onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
  Ativo
</label>

{/* data */}
<input type="date" name="data" value={form.data} onChange={mudar} />

{/* campo desabilitado (só mostrar) */}
<input value={user.email} disabled />
```

### Editar um item usando o mesmo form

```jsx
const [editandoId, setEditandoId] = useState(null)

function editar(item) {
  setEditandoId(item.id)
  setForm({ ...item, comentarios: (item.comentarios || []).join('\n') })
}

async function enviar(e) {
  e.preventDefault()
  const dados = { ...form, nota: Number(form.nota),
                  comentarios: form.comentarios.split('\n').filter(Boolean) }
  if (editandoId) await atualizar(token, editandoId, dados)
  else await cadastrar(token, dados)
  setEditandoId(null)
  setForm(vazio)
  carregar()
}

// no botão:
<button type="submit">{editandoId ? 'Salvar' : 'Cadastrar'}</button>
{editandoId && <button type="button" className="secondary"
  onClick={() => { setEditandoId(null); setForm(vazio) }}>Cancelar</button>}
```

---

## 3. Listas — expor os dados

### Carregar a lista quando a tela abre

```jsx
const [lista, setLista] = useState([])
const [carregando, setCarregando] = useState(false)

async function carregar() {
  setCarregando(true)
  try {
    setLista(await listar(token))
  } catch (e) {
    setErro(msgErro(e))
  } finally {
    setCarregando(false)
  }
}

useEffect(() => {
  if (token) carregar()
}, [token])
```

### Tabela

```jsx
{carregando && <p>Carregando...</p>}

{lista.length === 0 ? (
  <p className="muted">Nada cadastrado.</p>
) : (
  <div className="table-wrap">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Avaliado</th>
          <th>Nota</th>
          <th>Comentários</th>
          <th>Data</th>
          {isAdmin && <th>Ações</th>}
        </tr>
      </thead>
      <tbody>
        {lista.map((a) => (
          <tr key={a.id}>
            <td>{a.id}</td>
            <td>{a.emailAvaliado}</td>
            <td><span className="nota">{a.nota}</span></td>
            <td>
              {a.comentarios?.length
                ? <ul>{a.comentarios.map((c, i) => <li key={i}>{c}</li>)}</ul>
                : '—'}
            </td>
            <td>{a.dataAvaliacao ? new Date(a.dataAvaliacao).toLocaleString('pt-BR') : '—'}</td>
            {isAdmin && (
              <td>
                <button className="secondary" onClick={() => editar(a)}>Editar</button>
                <button onClick={() => remover(a.id)}>Excluir</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

### Lista simples (`ul`)

```jsx
<ul>
  {lista.map((a) => (
    <li key={a.id}>
      <strong>{a.emailAvaliado}</strong> — nota {a.nota}
    </li>
  ))}
</ul>
```

### Cards

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
  {lista.map((a) => (
    <div key={a.id} className="card">
      <h3>{a.emailAvaliado}</h3>
      <p>Nota: {a.nota}</p>
      <p className="muted">por {a.emailAvaliador}</p>
    </div>
  ))}
</div>
```

### Excluir item da lista

```jsx
async function remover(id) {
  if (!confirm('Excluir?')) return
  try {
    await deletar(token, id)
    setLista(lista.filter((a) => a.id !== id))   // tira da tela sem recarregar
  } catch (e) {
    setErro(msgErro(e))
  }
}
```

### Ver detalhe de um item (clicar na linha)

```jsx
const [selecionado, setSelecionado] = useState(null)

<tr key={a.id} onClick={() => setSelecionado(a)} style={{ cursor: 'pointer' }}>...</tr>

{selecionado && (
  <div className="card">
    <h2>Avaliação #{selecionado.id}</h2>
    <p>Avaliado: {selecionado.emailAvaliado}</p>
    <p>Nota: {selecionado.nota}</p>
    <button className="secondary" onClick={() => setSelecionado(null)}>Fechar</button>
  </div>
)}
```

### Busca, filtro e ordenação (no front)

```jsx
const [busca, setBusca] = useState('')
const [notaMin, setNotaMin] = useState(0)
const [ordem, setOrdem] = useState('id')

const visiveis = lista
  .filter((a) => a.emailAvaliado.toLowerCase().includes(busca.toLowerCase()))
  .filter((a) => a.nota >= notaMin)
  .sort((a, b) => (a[ordem] > b[ordem] ? 1 : -1))

<input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
<input type="number" min="0" max="10" value={notaMin} onChange={(e) => setNotaMin(Number(e.target.value))} />
<select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
  <option value="id">ID</option>
  <option value="nota">Nota</option>
  <option value="emailAvaliado">Avaliado</option>
</select>

{/* e na tabela usar visiveis.map(...) em vez de lista.map(...) */}
```

### Resumo / números em cima da lista

```jsx
const media = lista.length ? (lista.reduce((s, a) => s + a.nota, 0) / lista.length).toFixed(1) : 0

<p>Total: {lista.length} | Média: {media} | Maior: {Math.max(...lista.map((a) => a.nota))}</p>
```
