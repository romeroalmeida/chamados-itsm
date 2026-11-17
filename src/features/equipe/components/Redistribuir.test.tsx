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

  describe('destino pelo grupo dos chamados marcados', () => {
    const c10608 = DADOS.chamados.find((c) => c.numero === 10608)!
    const grupoMarina = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const doGrupo = DADOS.chamados.find((c) => c.responsavel_id === MARINA.id && c.grupo_id === grupoMarina && c.status === 'em_atendimento')!
    const todos = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.id !== MARINA.id)
    const montar = () => render(<QueryClientProvider client={new QueryClient()}><ToastProvider><Redistribuir chamados={[doGrupo, c10608]} consultores={todos} usuarios={{}} agora={Date.parse(DADOS.meta.agora)} onFechar={() => {}} /></ToastProvider></QueryClientProvider>)

    it('#10608 marcado oferece só consultores de Aplicações', async () => {
      expect(c10608.grupo_id).not.toBe(grupoMarina)
      montar()
      await userEvent.click(screen.getByLabelText('Selecionar #10608'))
      await userEvent.click(screen.getByRole('combobox', { name: /destino/i }))
      const nomes = (await screen.findAllByRole('option')).map((o) => o.textContent)
      expect(nomes).toEqual(todos.filter((u) => u.grupo_id === c10608.grupo_id).map((u) => u.nome))
    })

    it('chamados de grupos diferentes desabilitam Redistribuir e explicam', async () => {
      montar()
      await userEvent.click(screen.getByLabelText('Selecionar #10608'))
      await userEvent.click(screen.getByLabelText(`Selecionar #${doGrupo.numero}`))
      expect(screen.getByRole('button', { name: /redistribuir 2/i })).toBeDisabled()
      expect(screen.getByText('Selecione chamados de um mesmo grupo')).toBeInTheDocument()
    })
  })
})
