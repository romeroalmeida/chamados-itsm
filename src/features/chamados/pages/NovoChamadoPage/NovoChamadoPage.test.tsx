import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components'
import { NovoChamadoPage } from './NovoChamadoPage'
import { useSessao } from '@/state/sessao'
import { DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'
import { relogio } from '@/shared/utils/relogio'

describe('NovoChamadoPage', () => {
  beforeEach(() => {
    useSessao.getState().entrar(HELENA)
    relogio.iniciar(DADOS.meta.agora)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.endsWith('/api/chamados')) return new Response(JSON.stringify(DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id)), { status: 200 })
      if (u.endsWith('/api/categorias')) return new Response(JSON.stringify(DADOS.categorias), { status: 200 })
      return new Response('[]', { status: 200 })
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('ao digitar o título de #10614 sugere reabrir #10612', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}><ToastProvider>
        <MemoryRouter initialEntries={['/meus-chamados/novo']}>
          <Routes><Route path="/meus-chamados/novo" element={<NovoChamadoPage />} /><Route path="/chamados/:id" element={<p>detalhe</p>} /></Routes>
        </MemoryRouter>
      </ToastProvider></QueryClientProvider>,
    )
    await userEvent.type(await screen.findByLabelText(/em uma frase/i), chamadoPorNumero(10614).titulo)
    // o número fica dentro de <strong>: matcher por texto não cruza elementos
    expect(await screen.findByRole('status')).toHaveTextContent(/parece com o seu chamado #10612/i)
    await userEvent.click(screen.getByRole('button', { name: /reabrir/i }))
    expect(await screen.findByText('detalhe')).toBeInTheDocument()
  })

  it('enviar vazio mostra o erro de cada campo e não chama a API', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}><ToastProvider>
        <MemoryRouter initialEntries={['/meus-chamados/novo']}><Routes><Route path="/meus-chamados/novo" element={<NovoChamadoPage />} /></Routes></MemoryRouter>
      </ToastProvider></QueryClientProvider>,
    )
    await screen.findByRole('radio', { name: 'Internet, rede ou VPN' })
    await userEvent.click(screen.getByRole('button', { name: /abrir chamado/i }))
    expect(screen.getByText('Escolha o que parou, mesmo que seja só aproximado.')).toBeInTheDocument()
    expect(screen.getByLabelText(/em uma frase/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Detalhes')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('radio', { name: 'Não consigo entrar (acesso ou senha)' })).toHaveFocus()
    expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    await userEvent.click(screen.getByRole('radio', { name: 'Internet, rede ou VPN' }))
    expect(screen.queryByText('Escolha o que parou, mesmo que seja só aproximado.')).not.toBeInTheDocument()
  })
})
