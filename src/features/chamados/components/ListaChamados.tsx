import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Chamado, Usuario } from '@/shared/types'
import { Vazio } from '@/shared/components'
import { lerUltimaVisita, useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { LinhaChamado } from './LinhaChamado'

interface Props { chamados: Chamado[]; agora: number; usuario: Usuario; usuarios: Record<string, Usuario>; ativoId?: string; onAbrir: (id: string) => void; vazio: string }

export function ListaChamados({ chamados, agora, usuario, usuarios, ativoId, onAbrir, vazio }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useUltimaVisita(usuario.id) // assina o store de visitas: o ponto azul some assim que o chamado é aberto
  const v = useVirtualizer({ count: chamados.length, getScrollElement: () => ref.current, estimateSize: () => 64, overscan: 10 })
  if (chamados.length === 0) return <Vazio texto={vazio} />
  return (
    <div ref={ref} style={{ overflow: 'auto', height: '100%' }} role="list" aria-label="Chamados">
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((item) => {
          const c = chamados[item.index]!
          const visita = lerUltimaVisita(usuario.id, c.id)
          const temNovidade = visita !== null && Date.parse(c.atualizado_em) > visita && c.id !== ativoId
          return (
            <div key={c.id} role="listitem" ref={v.measureElement} data-index={item.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}>
              <LinhaChamado chamado={c} agora={agora} nomeCliente={usuarios[c.solicitante_id]?.nome ?? ''} ativo={c.id === ativoId} temNovidade={temNovidade} onAbrir={onAbrir} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
