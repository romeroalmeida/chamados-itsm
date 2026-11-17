import type { Categoria, Chamado, Dados, Evento, Grupo, Meta, Sla } from '@/shared/types'
import { chamadoIdDe } from '@/shared/types'
import { aplicar, aplicarTodos, criarEstado, type Estado } from '@/shared/utils/reducer'
import type { Bus } from './bus'
import type { EventLog } from './eventLog'

export interface Lookups { meta: Meta; grupos: Grupo[]; categorias: Categoria[]; sla: Sla[] }

export interface Db {
  estado(): Estado
  /** O chamado como estava antes do último evento aplicado a ele (o socket decide a entrega pelos dois lados). */
  anterior(chamadoId: string): Chamado | undefined
  lookups(): Lookups
  /** Grava no log e publica. Quem aplica no estado é a assinatura do bus. */
  emitir(eventos: Evento[]): void
  proximoNumero(): number
  ignoradosNoReplay(): number
}

interface Opcoes { bus: Bus; log: EventLog; carregar: () => Promise<Dados> }

export async function criarDb({ bus, log, carregar }: Opcoes): Promise<Db> {
  let estado: Estado | null = null
  const pendentes: Evento[] = []
  // Assina ANTES de carregar: nada que chegue durante o import se perde (spec §4.3).
  const anteriores = new Map<string, Chamado>()
  bus.assinar((e) => {
    if (!estado) { pendentes.push(e); return }
    const id = chamadoIdDe(e)
    const antes = estado.chamados[id]
    if (antes) anteriores.set(id, antes); else anteriores.delete(id)
    estado = aplicar(estado, e)
  })

  const dados = await carregar()
  const { eventos, ignorados } = log.ler()
  estado = aplicarTodos(criarEstado(dados), [...eventos, ...pendentes])
  pendentes.length = 0

  const lookups: Lookups = { meta: dados.meta, grupos: dados.grupos, categorias: dados.categorias, sla: dados.sla }
  return {
    estado: () => estado!,
    anterior: (id) => anteriores.get(id),
    lookups: () => lookups,
    emitir(evs) {
      for (const e of evs) { log.gravar(e); bus.publicar(e) }
    },
    proximoNumero: () => Math.max(0, ...Object.values(estado!.chamados).map((c) => c.numero)) + 1,
    ignoradosNoReplay: () => ignorados,
  }
}
