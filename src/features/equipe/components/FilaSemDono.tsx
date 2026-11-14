import type { Chamado, Grupo, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { BadgePrazo, Select, useToast } from '@/shared/components'
import s from '../pages/EquipePage/EquipePage.module.css'

interface Props { chamados: Chamado[]; consultores: UsuarioConsultor[]; grupos: Grupo[]; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }

export function FilaSemDono({ chamados, consultores, grupos, usuarios, agora, onAbrir }: Props) {
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  if (chamados.length === 0) return <p style={{ color: 'var(--cor-texto-fraco)' }}>Nenhum chamado esperando dono.</p>
  return (
    <div className={s.rolagem}>
      <table className={s.tabela}>
        <thead><tr><th>#</th><th>Título</th><th>Grupo</th><th>Cliente</th><th>Prazo</th><th>Atribuir a</th></tr></thead>
        <tbody>
          {chamados.map((c) => (
            <tr key={c.id}>
              <td><button className={s.link} onClick={() => onAbrir(c.id)}>{c.numero}</button></td>
              <td>{c.titulo}</td><td>{grupos.find((g) => g.id === c.grupo_id)?.nome}</td><td>{usuarios[c.solicitante_id]?.nome}</td>
              <td><BadgePrazo chamado={c} agora={agora} /></td>
              <td><Select ariaLabel={`Atribuir #${c.numero}`} valor={undefined} placeholder="Escolher" opcoes={consultores.filter((k) => k.grupo_id === c.grupo_id).map((k) => ({ valor: k.id, rotulo: k.nome }))}
                onChange={(consultorId) => atribuir.mutate({ chamadoId: c.id, consultorId }, { onError: (e) => notificar({ titulo: 'Não atribuído', descricao: e.message, tipo: 'erro' }) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
