import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { Chamado, UsuarioConsultor } from '@/shared/types'
import { useChamados, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro, FaixaAlerta, Select, Tabs, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarRelativo } from '@/shared/utils/datas'
import { faixaSla, restanteMs, type Faixa } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../../components/DetalheChamado/DetalheChamado'
import { ListaChamados } from '../../components/ListaChamados'
import { Trilha } from '../../components/Trilha/Trilha'
import { useAlertaSla } from '../../hooks/useAlertaSla'
import { filtrarFila, type AbaFila, type FiltroFila, type FiltroStatus, type OrdemFila } from '../../utils/fila'
import s from './FilaConsultorPage.module.css'

const OPCOES_STATUS = [{ valor: 'ativos', rotulo: 'Ativos' }, { valor: 'todos', rotulo: 'Todos' }, { valor: 'aberto', rotulo: 'Aberto' }, { valor: 'em_atendimento', rotulo: 'Em atendimento' }, { valor: 'aguardando_cliente', rotulo: 'Aguardando cliente' }, { valor: 'resolvido', rotulo: 'Resolvido' }, { valor: 'fechado', rotulo: 'Fechado' }]
const OPCOES_ORDEM = [{ valor: 'estoura', rotulo: 'Estoura primeiro' }, { valor: 'recente', rotulo: 'Mais recente' }, { valor: 'cliente', rotulo: 'Cliente' }]

export function FilaConsultorPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioConsultor
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const q = useChamados()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const { notificar } = useToast()
  const [filtro, setFiltro] = useState<FiltroFila>({ aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' })
  const [soAlerta, setSoAlerta] = useState<'vencidos' | 'proximaHora' | null>(null)

  const nomes = useMemo(() => Object.fromEntries(Object.values(usuarios).map((u) => [u.id, u.nome])), [usuarios])
  const todos = q.data ?? []
  const meus = useMemo(() => todos.filter((c) => c.responsavel_id === usuario.id && c.status !== 'resolvido' && c.status !== 'fechado'), [todos, usuario.id])
  const semDono = useMemo(() => todos.filter((c) => c.status === 'aberto' && c.responsavel_id === null), [todos])

  const alertar = useCallback((c: Chamado, faixa: Faixa) => {
    notificar({ id: `sla:${c.id}:${faixa}`, tipo: 'alerta', titulo: `#${c.numero} ${faixa === 'vencido' ? 'venceu' : 'vence em breve'}`, descricao: `${c.titulo} · ${formatarRelativo(restanteMs(c, agora))}`, acao: { rotulo: 'Abrir', onClick: () => nav(`/fila/${c.id}`) }, duracaoMs: 15_000 })
  }, [notificar, nav, agora])
  const resumo = useAlertaSla(meus, agora, alertar)

  useEffect(() => { document.title = resumo.vencidos ? `(${resumo.vencidos}) Chamados` : 'Chamados'; return () => { document.title = 'Chamados' } }, [resumo.vencidos])

  const lista = useMemo(() => {
    let r = filtrarFila(todos, usuario, filtro, agora, nomes)
    if (soAlerta === 'vencidos') r = r.filter((c) => faixaSla(c, agora) === 'vencido')
    if (soAlerta === 'proximaHora') r = r.filter((c) => faixaSla(c, agora) === 'ultima_hora')
    return r
  }, [todos, usuario, filtro, agora, nomes, soAlerta])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />

  return (
    <div className={s.pagina}>
      <section className={`${s.fila} ${id ? s.comDetalhe : ''}`} aria-label="Fila">
        <FaixaAlerta resumo={resumo} onFiltrar={(qual) => { setFiltro((f) => ({ ...f, aba: 'meus', status: 'ativos' })); setSoAlerta((a) => (a === qual ? null : qual)) }} />
        <Tabs ariaLabel="Filas" abas={[{ valor: 'meus', rotulo: 'Meus', contador: meus.length }, { valor: 'sem_dono', rotulo: 'Do grupo, sem dono', contador: semDono.length }]} valor={filtro.aba} onChange={(v) => { setFiltro((f) => ({ ...f, aba: v as AbaFila })); setSoAlerta(null) }}>
          <div className={s.filtros}>
            <input className={s.busca} type="search" placeholder="Número, título ou cliente" aria-label="Buscar chamado" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} />
            <Select ariaLabel="Status" valor={filtro.status} onChange={(v) => setFiltro((f) => ({ ...f, status: v as FiltroStatus }))} opcoes={OPCOES_STATUS} />
            <Select ariaLabel="Ordenar" valor={filtro.ordem} onChange={(v) => setFiltro((f) => ({ ...f, ordem: v as OrdemFila }))} opcoes={OPCOES_ORDEM} />
            {soAlerta && <button onClick={() => setSoAlerta(null)} style={{ background: 'none', border: 0, color: 'var(--cor-primaria)', textDecoration: 'underline' }}>limpar filtro de alerta</button>}
          </div>
        </Tabs>
        <ListaChamados chamados={lista} agora={agora} usuario={usuario} usuarios={usuarios} ativoId={id} onAbrir={(cid) => nav(`/fila/${cid}`)} vazio={filtro.aba === 'meus' ? 'Nenhum chamado seu com esse filtro.' : 'Fila do grupo vazia. Bom sinal.'} />
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
          : <div className={s.vazioDetalhe}>Escolha um chamado na fila. O primeiro é o que estoura antes.</div>}
      </section>
    </div>
  )
}
