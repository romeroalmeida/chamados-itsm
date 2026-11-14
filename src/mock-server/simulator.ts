import type { Usuario } from '@/shared/types'
import type { Estado } from '@/shared/utils/reducer'
import type { Lookups } from './db'
import type { Db } from './db'

export const CHAVE_SIMULADOR = 'itsm:simulador'
export const MOTIVO_SIMULADOR = 'Simulador: atualização de rotina'

export interface Acao { url: string; corpo: unknown; ator: Usuario; descricao: string }

const FRASES_CLIENTE = ['Continua acontecendo.', 'Segue o print em anexo.', 'Testei de novo e funcionou parcialmente.', 'Alguma novidade?', 'Já reiniciei e nada.']
const TITULOS = ['Erro ao acessar o sistema', 'Impressora não responde', 'VPN desconecta sozinha', 'Relatório não abre', 'Senha expirada']

function sorteio<T>(lista: T[], rnd: () => number): T | undefined { return lista[Math.floor(rnd() * lista.length)] }

/** Escolhe uma ação plausível (spec §4.4). `rnd` injetável para teste. */
export function escolherAcao(estado: Estado, lookups: Lookups, rnd: () => number = Math.random): Acao | null {
  const chamados = Object.values(estado.chamados)
  const usuarios = Object.values(estado.usuarios)
  const r = rnd()
  if (r < 0.4) {
    const c = sorteio(chamados.filter((c) => c.status === 'aguardando_cliente' || c.status === 'em_atendimento'), rnd)
    const cliente = c && estado.usuarios[c.solicitante_id]
    if (c && cliente) return { url: `/api/chamados/${c.id}/mensagens`, corpo: { texto: sorteio(FRASES_CLIENTE, rnd), interna: false }, ator: cliente, descricao: `${cliente.nome} respondeu #${c.numero}` }
  }
  if (r < 0.65) {
    const c = sorteio(chamados.filter((c) => c.status === 'aberto'), rnd)
    const consultor = c && sorteio(usuarios.filter((u) => u.perfil === 'consultor' && u.grupo_id === c.grupo_id), rnd)
    if (c && consultor) return { url: `/api/chamados/${c.id}/atribuir`, corpo: { consultor_id: consultor.id }, ator: consultor, descricao: `${consultor.nome} pegou #${c.numero}` }
  }
  if (r < 0.9) {
    const c = sorteio(chamados.filter((c) => c.status === 'em_atendimento' && c.responsavel_id), rnd)
    const consultor = c && estado.usuarios[c.responsavel_id!]
    if (c && consultor) {
      const para = rnd() < 0.5 ? 'aguardando_cliente' : 'resolvido'
      return { url: `/api/chamados/${c.id}/status`, corpo: { para, motivo: MOTIVO_SIMULADOR }, ator: consultor, descricao: `${consultor.nome} mudou #${c.numero} para ${para}` }
    }
  }
  const cliente = sorteio(usuarios.filter((u) => u.perfil === 'cliente'), rnd)
  const cat = sorteio(lookups.categorias, rnd)
  if (cliente && cat) return { url: '/api/chamados', corpo: { titulo: sorteio(TITULOS, rnd), descricao: 'Aberto pelo simulador.', categoria_id: cat.id }, ator: cliente, descricao: `${cliente.nome} abriu um chamado` }
  return null
}

export interface Simulador {
  ligar(): void
  desligar(): void
  ligado(): boolean
  dispararAgora(): Promise<Acao | null>
  /** true quando esta aba detém o lock e gera eventos. */
  ativoNestaAba(): boolean
  onAcao(cb: (a: Acao) => void): () => void
}

interface Opcoes {
  db: Db
  fetchFn?: typeof fetch
  intervaloBaseMs?: number
  velocidade: () => number
  /** Executa `fn` enquanto detiver o lock; resolve quando liberar. Default: navigator.locks. */
  obterLock?: (fn: () => Promise<void>) => Promise<void>
  storage?: Storage
}

export function criarSimulador(opts: Opcoes): Simulador {
  const { db, velocidade } = opts
  const fetchFn = opts.fetchFn ?? fetch
  const base = opts.intervaloBaseMs ?? 8000
  const storage = opts.storage
  const ouvintes = new Set<(a: Acao) => void>()
  let ligado = storage?.getItem(CHAVE_SIMULADOR) !== 'off'
  let detemLock = false
  let pedindoLock = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const executar = async (): Promise<Acao | null> => {
    const acao = escolherAcao(db.estado(), db.lookups())
    if (!acao) return null
    await fetchFn(acao.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Usuario-Id': acao.ator.id }, body: JSON.stringify(acao.corpo) })
    for (const cb of ouvintes) cb(acao)
    return acao
  }
  const agendar = () => {
    if (!ligado || !detemLock) return
    timer = setTimeout(async () => { try { await executar() } finally { agendar() } }, base / Math.max(1, velocidade()))
  }
  const obterLock = opts.obterLock ?? (async (fn) => {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) return navigator.locks.request('itsm:simulador', fn)
    return fn() // sem Web Locks: roda em toda aba (documentado)
  })
  const comecar = () => {
    if (pedindoLock) return
    pedindoLock = true
    // a promessa fica pendente de propósito: o lock só é liberado quando a aba fecha (spec §4.4).
    // desligar() não libera o lock: "ligado" é global (localStorage), então outra aba não deve assumir.
    void obterLock(() => new Promise<void>(() => { detemLock = true; agendar() }))
  }

  return {
    ligar() { ligado = true; storage?.setItem(CHAVE_SIMULADOR, 'on'); if (!detemLock) comecar(); else agendar() },
    desligar() { ligado = false; storage?.setItem(CHAVE_SIMULADOR, 'off'); if (timer) clearTimeout(timer); timer = null },
    ligado: () => ligado,
    dispararAgora: executar,
    ativoNestaAba: () => detemLock && ligado,
    onAcao(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb) } },
  }
}
