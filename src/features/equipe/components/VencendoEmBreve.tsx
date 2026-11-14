import type { Chamado, Usuario } from '@/shared/types'
import { BadgePrazo } from '@/shared/components'
import s from '../pages/EquipePage.module.css'

export function VencendoEmBreve({ chamados, usuarios, agora, onAbrir }: { chamados: Chamado[]; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }) {
  if (chamados.length === 0) return <p style={{ color: 'var(--cor-texto-fraco)' }}>Nada vence nas próximas 4 horas.</p>
  return (
    <div className={s.rolagem}>
      <table className={s.tabela}>
        <thead><tr><th>#</th><th>Título</th><th>Responsável</th><th>Cliente</th><th>Prazo</th></tr></thead>
        <tbody>
          {chamados.map((c) => (
            <tr key={c.id}>
              <td><button className={s.link} onClick={() => onAbrir(c.id)}>{c.numero}</button></td>
              <td>{c.titulo}</td><td>{c.responsavel_id ? usuarios[c.responsavel_id]?.nome : <em>sem dono</em>}</td><td>{usuarios[c.solicitante_id]?.nome}</td><td><BadgePrazo chamado={c} agora={agora} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
