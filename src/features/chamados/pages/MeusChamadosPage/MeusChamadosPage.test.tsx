import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MeusChamadosPage } from './MeusChamadosPage'
import { useSessao } from '@/state/sessao'
import { DADOS, HELENA } from '@/tests/fixtures/dados'
import { relogio } from '@/shared/utils/relogio'

describe('MeusChamadosPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('detalhe que falha vira aviso com "Tentar de novo"; a lista continua', async () => {
    useSessao.getState().entrar(HELENA)
    relogio.iniciar(DADOS.meta.agora)
    const dela = DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.endsWith('/api/chamados')) return new Response(JSON.stringify(dela), { status: 200 })
      if (/\/api\/chamados\/[\w-]+$/.test(u)) return new Response(JSON.stringify({ erro: { codigo: 'interno', mensagem: 'falhou' } }), { status: 500 })
      return new Response('[]', { status: 200 })
    })
    const detalhesPedidos = () => fetchMock.mock.calls.filter(([u]) => /\/api\/chamados\/[\w-]+$/.test(String(u))).length
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><MeusChamadosPage /></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o andamento de alguns chamados.')
    expect(screen.getByText(dela[0]!.titulo)).toBeInTheDocument()
    const antes = detalhesPedidos()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(detalhesPedidos()).toBeGreaterThan(antes)
  })
})
