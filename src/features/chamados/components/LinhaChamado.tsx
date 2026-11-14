import { memo } from 'react'
import type { Chamado } from '@/shared/types'
import { Badge, BadgePrazo } from '@/shared/components'
import { ROTULO_STATUS } from '@/shared/utils/status'

interface Props { chamado: Chamado; agora: number; nomeCliente: string; ativo: boolean; temNovidade: boolean; onAbrir: (id: string) => void }

export const LinhaChamado = memo(function LinhaChamado({ chamado, agora, nomeCliente, ativo, temNovidade, onAbrir }: Props) {
  return (
    <button onClick={() => onAbrir(chamado.id)} aria-current={ativo || undefined}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--cor-borda)', background: ativo ? '#eef2ff' : 'var(--cor-superficie)' }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
        {temNovidade && <span aria-label="mensagem nova" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--cor-primaria)', flex: 'none' }} />}
        <span style={{ fontFamily: 'var(--fonte-mono)', color: 'var(--cor-texto-fraco)' }}>#{chamado.numero}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{chamado.titulo}</span>
      </span>
      <BadgePrazo chamado={chamado} agora={agora} />
      <span style={{ color: 'var(--cor-texto-fraco)', fontSize: 13 }}>{nomeCliente}</span>
      <Badge faixa="neutro">{ROTULO_STATUS[chamado.status]}</Badge>
    </button>
  )
})
