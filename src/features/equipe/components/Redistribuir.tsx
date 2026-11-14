import { useState } from 'react'
import type { Chamado, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { BadgePrazo, Button, Select, useToast } from '@/shared/components'
import s from '../pages/EquipePage/EquipePage.module.css'

interface Props { chamados: Chamado[]; consultores: UsuarioConsultor[]; usuarios: Record<string, Usuario>; agora: number; onFechar: () => void }

/** Spec §5.2: seleção múltipla, um POST /atribuir por chamado. */
export function Redistribuir({ chamados, consultores, usuarios, agora, onFechar }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState<string | undefined>()
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  const alternar = (id: string) => setMarcados((m) => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n })
  const executar = async () => {
    if (!destino) return
    const resultados = await Promise.allSettled([...marcados].map((chamadoId) => atribuir.mutateAsync({ chamadoId, consultorId: destino })))
    const falhas = resultados.filter((r) => r.status === 'rejected')
    if (falhas.length) notificar({ titulo: `${falhas.length} não redistribuídos`, descricao: (falhas[0] as PromiseRejectedResult).reason?.message, tipo: 'erro' })
    else { notificar({ titulo: `${marcados.size} chamados redistribuídos` }); onFechar() }
  }
  return (
    <div className={s.secao}>
      <div className={s.rolagem}>
        <table className={s.tabela}>
          <thead><tr><th></th><th>#</th><th>Título</th><th>Cliente</th><th>Prazo</th></tr></thead>
          <tbody>
            {chamados.map((c) => (
              <tr key={c.id}>
                <td><input type="checkbox" aria-label={`Selecionar #${c.numero}`} checked={marcados.has(c.id)} onChange={() => alternar(c.id)} /></td>
                <td>{c.numero}</td><td>{c.titulo}</td><td>{usuarios[c.solicitante_id]?.nome}</td><td><BadgePrazo chamado={c} agora={agora} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select ariaLabel="Destino" valor={destino} onChange={setDestino} placeholder="Redistribuir para…" opcoes={consultores.map((c) => ({ valor: c.id, rotulo: c.nome }))} />
        <Button variante="primaria" disabled={!destino || marcados.size === 0 || atribuir.isPending} onClick={executar}>Redistribuir {marcados.size || ''}</Button>
        <Button onClick={onFechar}>Fechar</Button>
      </div>
    </div>
  )
}
