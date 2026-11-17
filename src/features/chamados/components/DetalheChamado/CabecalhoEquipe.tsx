import type { ReactNode } from 'react'
import type { Chamado, Mensagem, Usuario } from '@/shared/types'
import { formatarDataHora, formatarDuracao } from '@/shared/utils/datas'
import { faixaSla, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { ROTULO_PRIORIDADE } from '@/shared/utils/status'
import { Passos, PASSOS_EQUIPE } from './Passos'
import s from './detalhe.module.css'

interface Props { chamado: Chamado; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; reabertoEm?: string; categoria?: string; ultimaDoCliente?: Mensagem; acoes: ReactNode }

/** Cabeçalho do chamado para a equipe: título e ações, meta, stepper de status, faixa de prazo e dica de contexto. */
export function CabecalhoEquipe({ chamado, usuario, usuarios, agora, reabertoEm, categoria, ultimaDoCliente, acoes }: Props) {
  const responsavel = chamado.responsavel_id ? usuarios[chamado.responsavel_id] : undefined
  const solicitante = usuarios[chamado.solicitante_id]
  return (
    <header className={s.cabecalho}>
      <div className={s.linhaTitulo}>
        <div className={s.tituloBloco}>
          <span className={s.numero}>#{chamado.numero}</span>
          <h1 className={s.titulo}>{chamado.titulo}</h1>
        </div>
        {acoes}
      </div>
      <div className={s.meta}>
        <span>Cliente <b>{solicitante?.nome}</b>{solicitante?.perfil === 'cliente' && ` · ${solicitante.empresa}`}</span>
        {categoria && <span>{categoria} · prioridade <b>{ROTULO_PRIORIDADE[chamado.prioridade]}</b></span>}
        <span>Aberto em <b className={s.mono}>{formatarDataHora(chamado.aberto_em, usuario)}</b></span>
        <span>Responsável <b>{responsavel?.nome ?? 'sem responsável'}</b></span>
      </div>
      <Passos passos={PASSOS_EQUIPE} status={chamado.status} nota={reabertoEm ? `reaberto ${formatarDataHora(reabertoEm, usuario)}` : undefined} />
      <FaixaPrazo chamado={chamado} usuario={usuario} agora={agora} />
      {ultimaDoCliente && faixaSla(chamado, agora) !== 'encerrado' && (
        <div className={s.dica}>
          <IconeConversa />
          <span>Última mensagem do cliente: <q>{ultimaDoCliente.texto.length > 140 ? `${ultimaDoCliente.texto.slice(0, 140)}…` : ultimaDoCliente.texto}</q> <span className={s.mono}>({formatarDataHora(ultimaDoCliente.criada_em, usuario)})</span></span>
        </div>
      )}
    </header>
  )
}

function FaixaPrazo({ chamado, usuario, agora }: { chamado: Chamado; usuario: Usuario; agora: number }) {
  const faixa = faixaSla(chamado, agora)
  if (faixa === 'encerrado') {
    // destaque verde ao finalizar: quando foi resolvido/fechado e se ficou dentro do prazo de resolução
    const quandoFim = chamado.status === 'fechado' ? chamado.fechado_em : chamado.resolvido_em
    const dentro = chamado.resolvido_em !== null && chamado.resolvido_em <= chamado.prazo_resolucao
    return (
      <div className={`${s.faixaPrazo} ${s.resolvido}`} role="status">
        <IconeFeito />
        <strong>{chamado.status === 'fechado' ? 'Fechado' : 'Resolvido'}{quandoFim && <> em <span className={s.mono}>{formatarDataHora(quandoFim, usuario)}</span></>}</strong>
        <span>{dentro ? 'dentro do prazo de resolução' : <>prazo de resolução era <span className={s.mono}>{formatarDataHora(chamado.prazo_resolucao, usuario)}</span></>}</span>
      </div>
    )
  }
  const { tipo, prazo } = prazoRelevante(chamado)
  const quando = formatarDataHora(prazo, usuario)
  if (faixa === 'pausado') {
    return (
      <div className={`${s.faixaPrazo} ${s.pausado}`} role="status">
        <IconePrazo /><strong title={`Prazo de ${TIPO_PRAZO[tipo]}`}>SLA pausado: aguardando cliente</strong>
        <span>prazo de {TIPO_PRAZO[tipo]} <span className={s.mono}>{quando}</span>, sem extensão pela pausa</span>
      </div>
    )
  }
  const restante = restanteMs(chamado, agora)
  // a 1ª resposta já saiu: se saiu depois do prazo dela, vale dizer, porque explica o atraso acumulado
  const primeiraAtrasada = tipo === 'resolucao' && chamado.primeira_resposta_em !== null && chamado.primeira_resposta_em > chamado.prazo_primeira_resposta
  return (
    <div className={`${s.faixaPrazo} ${s[faixa]}`} role="status">
      <IconePrazo />
      <strong title={`Prazo de ${TIPO_PRAZO[tipo]}`}>Prazo de {TIPO_PRAZO[tipo]} {restante < 0 ? `estourou há ${formatarDuracao(-restante)}` : `estoura em ${formatarDuracao(restante)}`}</strong>
      <span>
        {restante < 0 ? 'prazo era ' : 'prazo '}<span className={s.mono}>{quando}</span>
        {primeiraAtrasada && <> · primeira resposta em <span className={s.mono}>{formatarDataHora(chamado.primeira_resposta_em!, usuario)}</span>, depois do prazo</>}
      </span>
    </div>
  )
}

const IconeFeito = () => <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
const IconePrazo = () => <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 2h4" /><path d="m12 14 3-3" /><circle cx="12" cy="14" r="8" /></svg>
export const IconeConversa = () => <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
