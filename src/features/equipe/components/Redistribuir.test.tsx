import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components'
import { Redistribuir } from './Redistribuir'
import { DADOS, MARINA, RICARDO } from '@/tests/fixtures/dados'
import { useSessao } from '@/state/sessao'
import type { UsuarioConsultor } from '@/shared/types'

describe('Redistribuir', () => {
  it('um POST /atribuir por chamado marcado', async () => {
    useSessao.getState().entrar(RICARDO)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    const daMarina = DADOS.chamados.filter((c) => c.responsavel_id === MARINA.id && c.status === 'em_atendimento').slice(0, 3)
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const colegas = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.grupo_id === grupo && u.id !== MARINA.id)
    render(<QueryClientProvider client={new QueryClient()}><ToastProvider><Redistribuir chamados={daMarina} consultores={colegas} usuarios={{}} agora={Date.parse(DADOS.meta.agora)} onFechar={() => {}} /></ToastProvider></QueryClientProvider>)
    await userEvent.click(screen.getByLabelText(`Selecionar #${daMarina[0]!.numero}`))
    await userEvent.click(screen.getByLabelText(`Selecionar #${daMarina[1]!.numero}`))
    await userEvent.click(screen.getByRole('combobox', { name: /destino/i }))
    await userEvent.click(await screen.findByRole('option', { name: colegas[0]!.nome }))
    await userEvent.click(screen.getByRole('button', { name: /redistribuir 2/i }))
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/atribuir'))).toHaveLength(2)
    fetchMock.mockRestore()
  })
})
