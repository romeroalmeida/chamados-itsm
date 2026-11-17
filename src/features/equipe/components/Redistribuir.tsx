import { useState } from 'react'
import type { Chamado, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { BadgePrazo, Button, Select, useToast } from '@/shared/components'
import s from './equipe.module.css'

interface Props { chamados: Chamado[]; consultores: UsuarioConsultor[]; usuarios: Record<string, Usuario>; agora: number; onFechar: () => void }

/** Spec §5.2: seleção múltipla, um POST /atribuir por chamado. O destino tem de ser do grupo do chamado (regra do /atribuir). */
export function Redistribuir({ chamados, consultores, usuarios, agora, onFechar }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState<string | undefined>()
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  // grupos dos chamados marcados (ou de todos, antes de marcar): o destino só pode vir de um grupo
  const grupos = new Set(chamados.filter((c) => marcados.size === 0 || marcados.has(c.id)).map((c) => c.grupo_id))
  const misturados = marcados.size > 0 && grupos.size > 1
  const opcoes = grupos.size === 1 ? consultores.filter((k) => grupos.has(k.grupo_id)).map((k) => ({ valor: k.id, rotulo: k.nome })) : []
  const destinoValido = opcoes.some((o) => o.valor === destino) ? destino : undefined
  const alternar = (id: string) => setMarcados((m) => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n })
  const executar = async () => {
    if (!destinoValido) return
    const resultados = await Promise.allSettled([...marcados].map((chamadoId) => atribuir.mutateAsync({ chamadoId, consultorId: destinoValido })))
    const falhas = resultados.filter((r) => r.status === 'rejected')
    if (falhas.length) notificar({ titulo: `${falhas.length} não redistribuídos`, descricao: (falhas[0] as PromiseRejectedResult).reason?.message, tipo: 'erro' })
    else { notificar({ titulo: `${marcados.size} chamados redistribuídos` }); onFechar() }
  }
  return (
    <div className={s.painel}>
      <div className={s.rolagem}>
        <table className={s.tabela}>
          <thead><tr><th></th><th>#</th><th>Título</th><th>Cliente</th><th>Prazo</th></tr></thead>
          <tbody>
            {chamados.map((c) => (
              <tr key={c.id}>
                <td><input type="checkbox" aria-label={`Selecionar #${c.numero}`} checked={marcados.has(c.id)} onChange={() => alternar(c.id)} /></td>
                <td className={s.num}>#{c.numero}</td><td>{c.titulo}</td><td>{usuarios[c.solicitante_id]?.nome}</td><td><BadgePrazo chamado={c} agora={agora} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.barra}>
        <Select ariaLabel="Destino" valor={destinoValido} onChange={setDestino} placeholder="Redistribuir para…" opcoes={opcoes} />
        <Button variante="primaria" disabled={!destinoValido || misturados || marcados.size === 0 || atribuir.isPending} onClick={executar} aria-describedby={misturados ? 'redistribuir-dica' : undefined}>Redistribuir {marcados.size || ''}</Button>
        {misturados && <small id="redistribuir-dica" className={s.dica}>Selecione chamados de um mesmo grupo</small>}
        <Button onClick={onFechar}>Fechar</Button>
      </div>
    </div>
  )
}
