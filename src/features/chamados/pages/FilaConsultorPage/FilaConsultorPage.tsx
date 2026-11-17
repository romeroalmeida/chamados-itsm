import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { Chamado, UsuarioConsultor } from '@/shared/types'
import { useChamados, useMapaUsuarios, useUltimasMensagens } from '@/api/queries'
import { Carregando, Erro, Select, Tabs, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarRelativo } from '@/shared/utils/datas'
import { restanteMs, type Faixa } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../../components/DetalheChamado/DetalheChamado'
import { ListaChamados } from '../../components/ListaChamados/ListaChamados'
import { Trilha } from '../../components/Trilha/Trilha'
import { useAlertaSla } from '../../hooks/useAlertaSla'
import { agruparPorUrgencia, clienteRespondeu, filtrarFila, GRUPOS_URGENCIA, type AbaFila, type FiltroFila, type FiltroStatus, type GrupoUrgencia, type OrdemFila } from '../../utils/fila'
import s from './FilaConsultorPage.module.css'

const OPCOES_STATUS = [{ valor: 'ativos', rotulo: 'Exceto resolvido e fechado' }, { valor: 'todos', rotulo: 'Todos' }, { valor: 'aberto', rotulo: 'Aberto' }, { valor: 'em_atendimento', rotulo: 'Em atendimento' }, { valor: 'aguardando_cliente', rotulo: 'Aguardando cliente' }, { valor: 'resolvido', rotulo: 'Resolvido' }, { valor: 'fechado', rotulo: 'Fechado' }]
const OPCOES_ORDEM = [{ valor: 'estoura', rotulo: 'Estoura primeiro' }, { valor: 'recente', rotulo: 'Atualizado por último' }, { valor: 'cliente', rotulo: 'Cliente' }]
/** Os quatro contadores do topo: os grupos com prazo correndo. */
const SALTOS: GrupoUrgencia[] = ['vencidos', 'proxima_hora', 'hoje', 'depois']

export function FilaConsultorPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioConsultor
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const q = useChamados()
  const ultimas = useUltimasMensagens()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const { notificar } = useToast()
  const [filtro, setFiltro] = useState<FiltroFila>({ aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' })
  const busca = useRef<HTMLInputElement>(null)

  const nomes = useMemo(() => Object.fromEntries(Object.values(usuarios).map((u) => [u.id, u.nome])), [usuarios])
  const todos = q.data ?? []
  const meus = useMemo(() => todos.filter((c) => c.responsavel_id === usuario.id && c.status !== 'resolvido' && c.status !== 'fechado'), [todos, usuario.id])
  const semDono = useMemo(() => todos.filter((c) => c.status === 'aberto' && c.responsavel_id === null), [todos])

  const alertar = useCallback((c: Chamado, faixa: Faixa) => {
    notificar({ id: `sla:${c.id}:${faixa}`, tipo: 'alerta', titulo: `#${c.numero} ${faixa === 'vencido' ? 'estourou o prazo' : 'está prestes a estourar o prazo'}`, descricao: `${c.titulo} · ${formatarRelativo(restanteMs(c, agora))}`, acao: { rotulo: 'Abrir', onClick: () => nav(`/fila/${c.id}`) }, duracaoMs: 15_000 })
  }, [notificar, nav, agora])
  const resumo = useAlertaSla(meus, agora, alertar)

  useEffect(() => { document.title = resumo.vencidos ? `(${resumo.vencidos}) Chamados` : 'Chamados'; return () => { document.title = 'Chamados' } }, [resumo.vencidos])

  // "/" leva para a busca, fora de campos de texto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      e.preventDefault(); busca.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lista = useMemo(() => filtrarFila(todos, usuario, filtro, agora, nomes), [todos, usuario, filtro, agora, nomes])
  const grupos = useMemo(() => {
    const porId = new Map(agruparPorUrgencia(lista, agora, usuario.zoneinfo).map((g) => [g.id, g.chamados]))
    return GRUPOS_URGENCIA.map((g) => ({ ...g, chamados: porId.get(g.id)! }))
  }, [lista, agora, usuario.zoneinfo])
  const respondeu = useMemo(() => {
    const porChamado = new Map((ultimas.data ?? []).map((u) => [u.chamado_id, u]))
    return new Set(lista.filter((c) => clienteRespondeu(c, porChamado.get(c.id))).map((c) => c.id))
  }, [lista, ultimas.data])

  const saltar = (g: GrupoUrgencia) => {
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`grupo-${g}`)?.scrollIntoView({ block: 'start', behavior: reduzir ? 'auto' : 'smooth' })
    document.getElementById(`grupo-${g}-t`)?.focus({ preventScroll: true })
  }
  const limparBusca = () => { setFiltro((f) => ({ ...f, busca: '' })); busca.current?.focus() }

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />

  const termo = filtro.busca.trim()
  const vazio = termo
    ? (
      <div className={s.vazio}>
        <span className={s.vazioIcone}><IconeBusca /></span>
        <strong>Nada com “{termo}” {filtro.aba === 'meus' ? `nos seus ${meus.length}` : 'na fila do grupo'}</strong>
        <p>A busca olha número, título e cliente.{filtro.aba === 'meus' ? ' Pode estar na fila do grupo, que ninguém pegou ainda.' : ''}</p>
        <button type="button" className={s.limpar} onClick={limparBusca}>Limpar busca</button>
      </div>
    )
    : <div className={s.vazio}><p>{filtro.aba === 'meus' ? 'Nenhum chamado seu com esse filtro.' : 'Fila do grupo vazia. Bom sinal.'}</p></div>

  return (
    <div className={`${s.pagina} ${id ? s.comChamado : ''}`}>
      <section className={`${s.fila} ${id ? s.comDetalhe : ''}`} aria-label="Fila">
        <div className={s.cabeca}>
          <Tabs variante="cheio" ariaLabel="Filas" abas={[{ valor: 'meus', rotulo: 'Meus', contador: meus.length }, { valor: 'sem_dono', rotulo: 'Fila do grupo', contador: semDono.length }]} valor={filtro.aba} onChange={(v) => setFiltro((f) => ({ ...f, aba: v as AbaFila }))}>
            <div className={s.saltos} role="group" aria-label="Ir para o prazo">
              {SALTOS.map((g) => {
                const grupo = grupos.find((x) => x.id === g)!
                return (
                  <button key={g} type="button" className={`${s.salto} ${s[g]}`} disabled={grupo.chamados.length === 0} onClick={() => saltar(g)}>
                    <b>{grupo.chamados.length}</b><span>{grupo.rotulo}</span>
                  </button>
                )
              })}
            </div>
            <div className={s.filtros}>
              <label className={s.busca}>
                <IconeBusca />
                <input ref={busca} type="search" placeholder="Número, título ou cliente" aria-label="Buscar chamado" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} />
                <kbd aria-hidden>/</kbd>
              </label>
              <Select className={s.selecao} ariaLabel="Status" valor={filtro.status} onChange={(v) => setFiltro((f) => ({ ...f, status: v as FiltroStatus }))} opcoes={OPCOES_STATUS} />
              <Select className={s.selecao} ariaLabel="Ordenar" valor={filtro.ordem} onChange={(v) => setFiltro((f) => ({ ...f, ordem: v as OrdemFila }))} opcoes={OPCOES_ORDEM} />
            </div>
          </Tabs>
        </div>
        <ListaChamados grupos={grupos} agora={agora} usuario={usuario} usuarios={usuarios} ativoId={id} respondeu={respondeu} onAbrir={(cid) => nav(`/fila/${cid}`)} vazio={vazio} />
      </section>
      <section className={s.detalhe} aria-label="Chamado">
        {id
          ? (
            <>
              {/* só aparece em tela estreita, quando a fila some; volta sempre para /fila (o histórico pode ser outro chamado) */}
              <Trilha perfil="consultor" numero={todos.find((c) => c.id === id)?.numero} className={s.voltar} />
              <DetalheChamado key={id} id={id} usuario={usuario} />
            </>
          )
          : (
            <div className={s.vazioDetalhe}>
              <span className={s.vazioIcone}><svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg></span>
              <p>Escolha um chamado na fila. O primeiro é o que estoura antes.</p>
            </div>
          )}
      </section>
    </div>
  )
}

function IconeBusca() {
  return <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
}
