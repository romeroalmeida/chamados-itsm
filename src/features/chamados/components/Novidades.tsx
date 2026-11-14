import type { Chamado, Usuario } from '@/shared/types'
import { Button } from '@/shared/components'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { rotuloStatus } from '../utils/rotulos'

interface Props { chamados: Chamado[]; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }

/** Spec §5.3: o que mudou desde a última visita. A LoginPage grava a primeira visita (spec §5.0); sem registro, nada. */
export function Novidades({ chamados, usuario, usuarios, agora, onAbrir }: Props) {
  const [ultima, marcar] = useUltimaVisita(usuario.id)
  if (ultima === null) return null
  const mudaram = chamados.filter((c) => Date.parse(c.atualizado_em) > ultima).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  if (mudaram.length === 0) return null
  return (
    <section aria-label="Novidades" style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 'var(--raio)', padding: 12, display: 'grid', gap: 8 }}>
      <strong>Novidades desde sua última visita</strong>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {mudaram.map((c) => {
          const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
          // spec §5.3: "Rafael respondeu", "Resolvido, confirme". A lista só tem o chamado, não a mensagem; o texto deriva do status.
          const novidade = c.status === 'resolvido' ? 'resolvido, confirme'
            : c.status === 'aguardando_cliente' ? `${resp ?? 'a equipe'} respondeu e aguarda você`
            : c.status === 'em_atendimento' ? `${resp ?? 'a equipe'} atualizou`
            : c.status === 'fechado' ? 'fechado' : rotuloStatus(c, 'cliente', resp)
          return <li key={c.id}><button onClick={() => onAbrir(c.id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--cor-primaria)', textDecoration: 'underline' }}>#{c.numero} {c.titulo}</button>: {novidade}</li>
        })}
      </ul>
      <div><Button pequeno onClick={() => marcar(agora)}>Entendi</Button></div>
    </section>
  )
}
