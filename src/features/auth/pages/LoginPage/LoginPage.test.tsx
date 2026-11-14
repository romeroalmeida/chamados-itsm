import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './LoginPage'
import { useSessao } from '@/state/sessao'
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

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('PIN errado mostra erro do servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ codigo: 'nao_autenticado', mensagem: 'E-mail ou PIN incorretos' }), { status: 401 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), MARINA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou PIN incorretos')
    expect(useSessao.getState().usuario).toBeNull()
  })

  it('consultora entra e vai para /fila', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(MARINA), { status: 200 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), MARINA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(screen.getByText('tela da fila')).toBeInTheDocument())
    expect(useSessao.getState().usuario?.id).toBe(MARINA.id)
  })

  it('gestor entra e vai para /equipe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(RICARDO), { status: 200 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), RICARDO.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(screen.getByText('tela da equipe')).toBeInTheDocument())
  })

  it('cliente entra e vai para /meus-chamados', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(HELENA), { status: 200 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), HELENA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(screen.getByText('tela do cliente')).toBeInTheDocument())
  })

  it('"quem posso ser?" preenche o e-mail', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: /quem posso ser/i }))
    await userEvent.click(screen.getByRole('button', { name: /Helena Fernandes/ }))
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue('helena.fernandes@lusitania.example')
  })
})
