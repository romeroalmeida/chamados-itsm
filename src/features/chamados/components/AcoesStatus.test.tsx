import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components'
import { AcoesStatus } from './AcoesStatus'
import { useSessao } from '@/state/sessao'
import { DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'

it('reabrir pela sugestão: POST /status e depois POST /mensagens; falha do segundo devolve o texto', async () => {
  useSessao.getState().entrar(HELENA)
  const chamadas: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = String(url); chamadas.push(u)
    if (u.endsWith('/mensagens')) return new Response(JSON.stringify({ codigo: 'x', mensagem: 'falhou' }), { status: 500 })
    return new Response('{"ok":true}', { status: 200 })
  })
  const falhou = vi.fn()
  const fechado = chamadoPorNumero(10612)
  render(<QueryClientProvider client={new QueryClient()}><ToastProvider>
    <AcoesStatus chamado={fechado} usuario={HELENA} consultoresDoGrupo={[]} reabrirInicial="Voltou a acontecer" onMensagemFalhou={falhou} />
  </ToastProvider></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }))
  await waitFor(() => expect(chamadas.filter((c) => c.includes('/chamados/')).map((c) => c.split('/').at(-1))).toEqual(['status', 'mensagens']))
  await waitFor(() => expect(falhou).toHaveBeenCalledWith('Voltou a acontecer'))
  expect(DADOS.chamados.length).toBe(620)
  vi.restoreAllMocks()
})
