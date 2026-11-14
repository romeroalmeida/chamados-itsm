import type { Chamado, Usuario } from '@/shared/types'
import { Button } from '@/shared/components'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { rotuloStatus } from '../../utils/rotulos'
import s from './Novidades.module.css'

interface Props { chamados: Chamado[]; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }

/** Spec §5.3: o que mudou desde a última visita. A LoginPage grava a primeira visita (spec §5.0); sem registro, nada. */
export function Novidades({ chamados, usuario, usuarios, agora, onAbrir }: Props) {
  const [ultima, marcar] = useUltimaVisita(usuario.id)
  if (ultima === null) return null
  const mudaram = chamados.filter((c) => Date.parse(c.atualizado_em) > ultima).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  if (mudaram.length === 0) return null
  return (
    <section aria-label="Novidades" className={s.painel}>
      <div className={s.topo}>
        <strong className={s.titulo}>Novidades desde sua última visita</strong>
        <Button pequeno onClick={() => marcar(agora)}>Entendi</Button>
      </div>
      <ul className={s.lista}>
        {mudaram.map((c) => {
          const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
          // spec §5.3: "Rafael respondeu", "Resolvido, confirme". A lista só tem o chamado, não a mensagem; o texto deriva do status.
          const novidade = c.status === 'resolvido' ? 'resolvido, confirme'
            : c.status === 'aguardando_cliente' ? `${resp ?? 'a equipe'} respondeu e aguarda você`
            : c.status === 'em_atendimento' ? `${resp ?? 'a equipe'} atualizou`
            : c.status === 'fechado' ? 'fechado' : rotuloStatus(c, 'cliente', resp)
          return <li key={c.id}><button type="button" className={s.link} onClick={() => onAbrir(c.id)}><span className={s.numero}>#{c.numero}</span> {c.titulo}</button><span className={s.novidade}>{novidade}</span></li>
        })}
      </ul>
    </section>
  )
}
