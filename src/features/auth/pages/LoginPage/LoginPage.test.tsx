import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './LoginPage'
import { useSessao } from '@/state/sessao'
import type { Usuario } from '@/shared/types'
import { HELENA, MARINA, RICARDO } from '@/tests/fixtures/dados'

function montar() {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/entrar']}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/fila" element={<p>tela da fila</p>} />
          <Route path="/equipe" element={<p>tela da equipe</p>} />
          <Route path="/meus-chamados" element={<p>tela do cliente</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status })
/** /auth/codigo sempre ok; /auth/entrar devolve `quem` ou 401. */
function servidor(quem: Usuario | null) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/auth/codigo')) return json({ ok: true })
    if (String(url).endsWith('/auth/entrar')) return quem ? json(quem) : json({ codigo: 'nao_autenticado', mensagem: 'x' }, 401)
    return json([])
  })
}

async function pedirCodigo(email: string) {
  await userEvent.type(screen.getByLabelText('Seu e-mail'), email)
  await userEvent.click(screen.getByRole('button', { name: /receber o código/i }))
  await screen.findByRole('heading', { name: 'Confira o seu e-mail' })
}

describe('LoginPage', () => {
  beforeEach(() => useSessao.setState({ usuario: null }))
  afterEach(() => vi.restoreAllMocks())

  it('e-mail leva ao passo do código, que mostra o e-mail', async () => {
    servidor(MARINA)
    montar()
    await pedirCodigo(MARINA.email)
    expect(screen.getByRole('status')).toHaveTextContent(MARINA.email)
    expect(screen.getByLabelText('Código de acesso')).toHaveFocus()
  })

  it.each([
    ['consultora', MARINA, 'tela da fila'],
    ['gestor', RICARDO, 'tela da equipe'],
    ['cliente', HELENA, 'tela do cliente'],
  ] as const)('%s digita os 6 números e entra sozinha na rota inicial', async (_, quem, tela) => {
    const f = servidor(quem)
    montar()
    await pedirCodigo(quem.email)
    await userEvent.type(screen.getByLabelText('Código de acesso'), '123456')
    await waitFor(() => expect(screen.getByText(tela)).toBeInTheDocument())
    expect(useSessao.getState().usuario?.id).toBe(quem.id)
    const corpo = JSON.parse(String(f.mock.calls.find(([u]) => String(u).endsWith('/auth/entrar'))![1]!.body))
    expect(corpo).toEqual({ email: quem.email, codigo: '123456' })
  })

  it('código errado mostra o erro, e editar limpa', async () => {
    servidor(null)
    montar()
    await pedirCodigo(MARINA.email)
    const campo = screen.getByLabelText('Código de acesso')
    await userEvent.type(campo, '000000')
    expect(await screen.findByRole('alert')).toHaveTextContent('Código incorreto. Confira e tente de novo.')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAttribute('aria-describedby', 'codigo-erro')
    expect(useSessao.getState().usuario).toBeNull()
    await userEvent.type(campo, '{Backspace}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('"Usar outro e-mail" volta ao primeiro passo, vazio', async () => {
    servidor(MARINA)
    montar()
    await pedirCodigo(MARINA.email)
    await userEvent.click(screen.getByRole('button', { name: 'Usar outro e-mail' }))
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Seu e-mail')).toHaveValue('')
  })

  it('reenviar só libera depois da contagem', async () => {
    servidor(MARINA)
    montar()
    await pedirCodigo(MARINA.email)
    expect(screen.getByRole('button', { name: /reenviar código \(em 60 s\)/i })).toBeDisabled()
  })

  it('"Quem posso ser?" pula para o código com o e-mail da persona', async () => {
    servidor(HELENA)
    montar()
    await userEvent.click(screen.getByRole('button', { name: /quem posso ser/i }))
    await userEvent.click(screen.getByRole('button', { name: /Helena Fernandes/ }))
    expect(await screen.findByRole('heading', { name: 'Confira o seu e-mail' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('helena.fernandes@lusitania.example')
  })
})
