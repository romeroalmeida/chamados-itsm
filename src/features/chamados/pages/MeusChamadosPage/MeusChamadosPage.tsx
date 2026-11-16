import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Chamado, Status, UsuarioCliente } from '@/shared/types'
import { useChamados, useDetalhes, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { ehReabertura } from '@/shared/utils/status'
import { useSessao } from '@/state/sessao'
import { Novidades } from '../../components/Novidades/Novidades'
import { proximoPasso, type DetalheCliente, type Tom } from '../../utils/cliente'
import s from './MeusChamadosPage.module.css'

/** Situação curta, na linguagem dela; quem cuida vem ao lado ("com Marina Almeida"). */
const SELO: Record<Status, string> = { aberto: 'Aguardando atendimento', em_atendimento: 'Em atendimento', aguardando_cliente: 'Aguardando a sua resposta', resolvido: 'Resolvido, confirme', fechado: 'Fechado' }
const DIA: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }

export function MeusChamadosPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioCliente
  const nav = useNavigate()
  const q = useChamados()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const lista = useMemo(() => [...(q.data ?? [])].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em)), [q.data])
  const detalhes = useDetalhes(lista.map((c) => c.id))
  const porId = new Map(detalhes.flatMap((d) => (d.data ? [[d.data.chamado.id, d.data] as const] : [])))
  const itens: DetalheCliente[] = [...porId.values()]
  const nomes = useMemo(() => Object.fromEntries(Object.values(usuarios).map((u) => [u.id, u.nome])), [usuarios])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />
  const abertos = lista.filter((c) => c.status !== 'fechado')
  const encerrados = lista.filter((c) => c.status === 'fechado')
  const abrir = (id: string) => nav(`/chamados/${id}`)

  return (
    <div className={s.pagina}>
      {/* "Abrir chamado" mora no cabeçalho */}
      <div className={s.topo}>
        <h1 className={s.titulo}>Meus chamados</h1>
        <span className={s.contagem}>{lista.length}</span>
      </div>
      {lista.length === 0
        ? (
          <div className={s.vazio}>
            <span className={s.vazioIcone} aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg></span>
            <strong>Nenhum chamado por aqui</strong>
            <p>Quando algo parar de funcionar, abra um chamado. Você vê aqui quem pegou e quando deve ter resposta, no seu horário.</p>
            <Link to="/meus-chamados/novo" className={s.botaoAbrir}>Abrir chamado</Link>
          </div>
        )
        : (
          <>
            <Novidades itens={itens} usuario={usuario} nomes={nomes} agora={agora} onAbrir={abrir} />
            <div className={s.lista}>
              {abertos.map((c) => cartao(c, porId.get(c.id)))}
            </div>
            {encerrados.length > 0 && (
              <section className={s.lista} aria-labelledby="t-encerrados">
                <h2 id="t-encerrados" className={s.divisor}>Encerrados</h2>
                {encerrados.map((c) => cartao(c, porId.get(c.id)))}
              </section>
            )}
          </>
        )}
    </div>
  )

  // função, não componente: um componente declarado aqui dentro remontaria a cada render
  function cartao(c: Chamado, detalhe?: DetalheCliente) {
    const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
    const passo = detalhe ? proximoPasso(detalhe, usuario.id, agora, nomes, usuario) : null
    const reaberto = detalhe?.historico.findLast((h) => h.tipo === 'status' && h.de && h.para && ehReabertura(h.de, h.para))
    if (c.status === 'fechado') {
      return (
        <button key={c.id} type="button" className={`${s.cartao} ${s.encerrado}`} onClick={() => abrir(c.id)}>
          <span className={s.l1}><strong>{c.titulo}</strong><span className={s.numero}>#{c.numero}</span></span>
          <span className={s.l2}>Fechado{c.fechado_em && ` em ${formatarDataHora(c.fechado_em, usuario, DIA)}`}{resp && ` · atendido por ${resp}`}</span>
        </button>
      )
    }
    return (
      <button key={c.id} type="button" className={s.cartao} onClick={() => abrir(c.id)}>
        <span className={s.l1}><strong>{c.titulo}</strong><span className={s.numero}>#{c.numero}</span></span>
        <span className={s.l2}>
          <span className={`${s.selo} ${c.status === 'aberto' ? '' : s.seloPri}`}><i aria-hidden />{SELO[c.status]}</span>
          {resp && <span>com <b>{resp}</b></span>}
          <span>{reaberto ? `reaberto em ${formatarDataHora(reaberto.ocorrido_em, usuario, DIA)}` : `aberto em ${formatarDataHora(c.aberto_em, usuario)}`}</span>
        </span>
        {passo && <ProximoPasso tom={passo.tom} texto={passo.texto} />}
      </button>
    )
  }
}

const ROTULO_TOM: Record<Tom, string> = { atrasado: 'Atrasado', voce: 'Aguardando você', equipe: 'Com a equipe' }

function ProximoPasso({ tom, texto }: { tom: Tom; texto: string }) {
  return (
    <span className={`${s.prox} ${s[tom]}`}>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {tom === 'atrasado' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : tom === 'voce' ? <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> : <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>}
      </svg>
      <span><b className={s.tom}>{ROTULO_TOM[tom]}.</b> {texto}</span>
    </span>
  )
}
