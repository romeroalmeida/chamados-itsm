import { memo } from 'react'
import type { Chamado } from '@/shared/types'
import { BadgePrazo } from '@/shared/components'
import { ROTULO_STATUS } from '@/shared/utils/status'
import s from './LinhaChamado.module.css'

interface Props { chamado: Chamado; agora: number; nomeCliente: string; ativo: boolean; temNovidade: boolean; onAbrir: (id: string) => void }

export const LinhaChamado = memo(function LinhaChamado({ chamado, agora, nomeCliente, ativo, temNovidade, onAbrir }: Props) {
  return (
    <button type="button" className={`${s.linha} ${ativo ? s.ativa : ''}`} onClick={() => onAbrir(chamado.id)} aria-current={ativo || undefined}>
      <span className={s.topo}>
        {temNovidade && <span className={s.novidade} aria-label="mensagem nova" />}
        <span className={s.numero}>{chamado.numero}</span>
        <span className={s.titulo}>{chamado.titulo}</span>
      </span>
      <BadgePrazo chamado={chamado} agora={agora} />
      <span className={s.cliente}>{nomeCliente} <span className={s.status}>· {ROTULO_STATUS[chamado.status].toLowerCase()}</span></span>
    </button>
  )
})
