import type { QueryClient } from '@tanstack/react-query'
import type { Chamado, Evento, Historico, UltimaMensagem, Usuario } from '@/shared/types'
import { chamadoIdDe } from '@/shared/types'
import { aplicar, estadoVazio, type Estado } from '@/shared/utils/reducer'
import type { Socket } from '@/mock-server/socket'
import { chaves } from './queries/chaves'
import type { DetalheChamado } from './queries/chamados'

export interface Hidratar {
  chamados(lista: Chamado[]): void
  detalhe(d: DetalheChamado): void
  historico(h: Historico[]): void
  usuarios(u: Usuario[]): void
}

export interface Realtime {
  hidratar: Hidratar
  /** chamado_ids que receberam evento; a tela usa para o ponto azul e o aviso de "mensagem nova". */
  onEvento(cb: (e: Evento) => void): () => void
  parar(): void
}

let instancia: Realtime | null = null
/** Usado pelas queries. Antes de `criarRealtime` é no-op (testes de query isolados). */
export const hidratar: Hidratar = {
  chamados: (l) => instancia?.hidratar.chamados(l),
  detalhe: (d) => instancia?.hidratar.detalhe(d),
  historico: (h) => instancia?.hidratar.historico(h),
  usuarios: (u) => instancia?.hidratar.usuarios(u),
}

export function criarRealtime(qc: QueryClient, socket: Socket): Realtime {
  let espelho: Estado = estadoVazio()
  const ouvintes = new Set<(e: Evento) => void>()

  const projetar = (chamadoId: string) => {
    if (qc.getQueryData(chaves.chamados) !== undefined) qc.setQueryData<Chamado[]>(chaves.chamados, Object.values(espelho.chamados))
    const chaveDet = chaves.chamado(chamadoId)
    if (qc.getQueryData(chaveDet) !== undefined && espelho.chamados[chamadoId]) {
      qc.setQueryData<DetalheChamado>(chaveDet, {
        chamado: espelho.chamados[chamadoId]!,
        mensagens: espelho.mensagens[chamadoId] ?? [],
        historico: espelho.historico.filter((h) => h.chamado_id === chamadoId),
      })
    }
    if (qc.getQueryData(chaves.historico) !== undefined) qc.setQueryData<Historico[]>(chaves.historico, espelho.historico)
  }

  const projetarUltima = (e: Evento) => {
    if (e.tipo !== 'mensagem.adicionada' || e.payload.interna === true) return
    const { chamado_id, autor_id, criada_em } = e.payload
    qc.setQueryData<UltimaMensagem[]>(chaves.ultimasMensagens, (lista) => {
      if (!lista) return lista // não carregado: o GET traz tudo quando a fila abrir
      const atual = lista.find((u) => u.chamado_id === chamado_id)
      if (atual && atual.criada_em > criada_em) return lista
      return [...lista.filter((u) => u.chamado_id !== chamado_id), { chamado_id, autor_id, criada_em }]
    })
  }

  const sair = socket.assinar((e) => {
    const antes = espelho
    espelho = aplicar(espelho, e)
    if (espelho === antes) return // duplicado
    projetar(chamadoIdDe(e))
    projetarUltima(e)
    for (const cb of ouvintes) cb(e)
  })

  const substituirHistoricoDe = (chamadoId: string, novo: Historico[]) =>
    [...espelho.historico.filter((h) => h.chamado_id !== chamadoId), ...novo].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em) || a.id.localeCompare(b.id))

  const rt: Realtime = {
    hidratar: {
      chamados(lista) {
        const chamados: Record<string, Chamado> = {}
        for (const c of lista) chamados[c.id] = c
        espelho = { ...espelho, chamados }
      },
      detalhe(d) {
        espelho = {
          ...espelho,
          chamados: { ...espelho.chamados, [d.chamado.id]: d.chamado },
          mensagens: { ...espelho.mensagens, [d.chamado.id]: d.mensagens },
          historico: substituirHistoricoDe(d.chamado.id, d.historico),
        }
      },
      historico(h) { espelho = { ...espelho, historico: [...h].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em) || a.id.localeCompare(b.id)) } },
      usuarios(u) { espelho = { ...espelho, usuarios: Object.fromEntries(u.map((x) => [x.id, x])) } },
    },
    onEvento(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb) } },
    parar() { sair(); if (instancia === rt) instancia = null },
  }
  instancia = rt
  return rt
}
