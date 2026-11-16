import type { Usuario } from '@/shared/types'
import { Button } from '@/shared/components'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { formatarDataHora } from '@/shared/utils/datas'
import { novidadesDesde, type DetalheCliente } from '../../utils/cliente'
import s from './Novidades.module.css'

interface Props { itens: DetalheCliente[]; usuario: Usuario; nomes: Record<string, string>; agora: number; onAbrir: (id: string) => void }

/** Spec §5.3, em frases e no fuso da cliente. A LoginPage grava a primeira visita (spec §5.0); sem registro, nada. */
export function Novidades({ itens, usuario, nomes, agora, onAbrir }: Props) {
  const [ultima, marcar] = useUltimaVisita(usuario.id)
  if (ultima === null) return null
  const novidades = novidadesDesde(itens, ultima, usuario.id, agora, nomes)
  if (novidades.length === 0) return null
  return (
    <section aria-labelledby="t-novidades" className={s.painel}>
      <div className={s.topo}>
        <h2 id="t-novidades" className={s.titulo}>Desde a sua última visita</h2>
        <span className={s.visita}>visita em {formatarDataHora(new Date(ultima).toISOString(), usuario)}</span>
        <Button pequeno className={s.entendi} onClick={() => marcar(agora)}>Entendi</Button>
      </div>
      <ul className={s.lista}>
        {novidades.map((n) => (
          <li key={n.id}>
            <span className={`${s.icone} ${n.alerta ? s.alerta : ''}`} aria-hidden>
              {n.alerta
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
            </span>
            <span className={s.frase}>{n.texto}</span>
            <button type="button" className={s.link} onClick={() => onAbrir(n.chamado.id)}>
              <span className={s.mono}>#{n.chamado.numero}</span> {n.chamado.titulo} · <span className={s.mono}>{formatarDataHora(n.em, usuario)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
