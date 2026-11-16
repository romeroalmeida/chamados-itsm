import { render, screen } from '@testing-library/react'
import { Conversa } from './Conversa'
import { DADOS, HELENA, MARINA } from '@/tests/fixtures/dados'
import type { Mensagem } from '@/shared/types'

const usuarios = Object.fromEntries(DADOS.usuarios.map((u) => [u.id, u]))
const msg = (id: string, interna = false): Mensagem => ({ id, chamado_id: 'c', criada_em: '2026-11-03T13:00:00Z', autor_id: HELENA.id, texto: `texto ${id}`, interna })

describe('Conversa', () => {
  beforeAll(() => {
    // jsdom não mede layout; o virtualizador precisa de altura > 0
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 })
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ height: 600, width: 400, top: 0, left: 0, bottom: 600, right: 400, x: 0, y: 0, toJSON() {} }) })
  })

  it('mensagem nova enquanto digita mostra aviso e não rola', () => {
    const { rerender } = render(<Conversa mensagens={[msg('1')]} usuarios={usuarios} usuario={MARINA} digitando />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    rerender(<Conversa mensagens={[msg('1'), msg('2')]} usuarios={usuarios} usuario={MARINA} digitando />)
    expect(screen.getByRole('status')).toHaveTextContent('1 mensagem nova')
  })

  it('sem texto na caixa, não mostra aviso (rola sozinho)', () => {
    const { rerender } = render(<Conversa mensagens={[msg('1')]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    rerender(<Conversa mensagens={[msg('1'), msg('2')]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('nota interna tem rótulo "só a equipe vê" para a equipe', () => {
    render(<Conversa mensagens={[msg('1', true)]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    expect(screen.getByText(/só a equipe vê/i)).toBeInTheDocument()
  })

  it('mudanças de status entram na linha do tempo entre as mensagens', () => {
    const h = { id: 'h1', chamado_id: 'c', tipo: 'status' as const, de: 'em_atendimento' as const, para: 'resolvido' as const, usuario_id: MARINA.id, motivo: 'Correção aplicada', ocorrido_em: '2026-11-03T12:00:00Z' }
    render(<Conversa mensagens={[msg('1')]} historico={[h]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    expect(screen.getByText(/Você mudou para resolvido · “Correção aplicada”/)).toBeInTheDocument()
  })

  it('cliente vê só as últimas mensagens até pedir as anteriores', async () => {
    render(<Conversa mensagens={[msg('1'), msg('2'), msg('3')]} usuarios={usuarios} usuario={HELENA} digitando={false} recolher={1} />)
    expect(screen.queryByText('texto 1')).not.toBeInTheDocument()
    screen.getByRole('button', { name: 'Mostrar as 2 mensagens anteriores' }).click()
    expect(await screen.findByText('texto 1')).toBeInTheDocument()
  })
})
