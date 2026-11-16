import { memo } from 'react'
import type { Chamado } from '@/shared/types'
import { formatarDuracao } from '@/shared/utils/datas'
import { faixaSla, prazoRelevante, restanteMs } from '@/shared/utils/sla'
import { ROTULO_STATUS } from '@/shared/utils/status'
import s from './LinhaChamado.module.css'

const TIPO_CURTO = { primeira_resposta: '1ª resposta', resolucao: 'resolução' } as const

interface Props { chamado: Chamado; agora: number; nomeCliente: string; ativo: boolean; temNovidade: boolean; respondeu: boolean; onAbrir: (id: string) => void }

/** Linha da fila: tempo restante é o elemento principal da direita, com barra do prazo consumido e o tipo de prazo. */
export const LinhaChamado = memo(function LinhaChamado({ chamado, agora, nomeCliente, ativo, temNovidade, respondeu, onAbrir }: Props) {
  const faixa = faixaSla(chamado, agora)
  return (
    <button type="button" className={`${s.linha} ${s[faixa]} ${ativo ? s.ativa : ''}`} onClick={() => onAbrir(chamado.id)} aria-current={ativo || undefined}>
      <span className={s.topo}>
        {temNovidade && <span className={s.novidade} role="img" aria-label="mensagem nova" />}
        <span className={s.numero}>#{chamado.numero}</span>
        <span className={s.titulo} title={chamado.titulo}>{chamado.titulo}</span>
      </span>
      <span className={s.sub}>
        {respondeu && (
          <span className={s.respondeu}>
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            respondeu
          </span>
        )}
        {chamado.prioridade === 'critica' && <span className={s.critica}>crítica ·</span>}
        <span className={s.cliente}>{nomeCliente}</span>
      </span>
      <Prazo chamado={chamado} agora={agora} faixa={faixa} />
    </button>
  )
})

function Prazo({ chamado, agora, faixa }: { chamado: Chamado; agora: number; faixa: ReturnType<typeof faixaSla> }) {
  if (faixa === 'encerrado') return <span className={s.prazo}><span className={s.tempo}>{ROTULO_STATUS[chamado.status]}</span></span>
  if (faixa === 'pausado') return <span className={s.prazo}><span className={s.tempo}>pausado</span><span className={s.tipo}>aguardando cliente</span></span>
  const { tipo, prazo } = prazoRelevante(chamado)
  const restante = restanteMs(chamado, agora)
  const inicio = Date.parse(chamado.aberto_em)
  const consumido = Math.min(100, Math.max(4, ((agora - inicio) / (Date.parse(prazo) - inicio)) * 100))
  return (
    <span className={s.prazo}>
      <span className={s.tempo}>{restante < 0 ? 'há' : 'em'} {formatarDuracao(Math.abs(restante))}</span>
      <span className={s.barra} aria-hidden><i style={{ width: `${consumido.toFixed(0)}%` }} /></span>
      <span className={s.tipo}>{restante < 0 ? 'venceu · ' : ''}{TIPO_CURTO[tipo]}</span>
    </span>
  )
}
