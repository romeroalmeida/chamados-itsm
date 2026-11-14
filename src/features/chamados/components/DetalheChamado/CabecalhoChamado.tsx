import type { Chamado, Usuario } from '@/shared/types'
import { Badge, BadgePrazo } from '@/shared/components'
import { faixaSla, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { formatarDataHora, formatarDiaHora, formatarRelativo } from '@/shared/utils/datas'
import { rotuloStatus } from '../../utils/rotulos'
import s from './detalhe.module.css'

interface Props { chamado: Chamado; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; reabertoEm?: string; categoria?: string }

export function CabecalhoChamado({ chamado, usuario, usuarios, agora, reabertoEm, categoria }: Props) {
  const responsavel = chamado.responsavel_id ? usuarios[chamado.responsavel_id] : undefined
  const solicitante = usuarios[chamado.solicitante_id]
  const cliente = usuario.perfil === 'cliente'
  const faixa = faixaSla(chamado, agora)
  const { tipo, prazo } = prazoRelevante(chamado)
  const relativo = formatarRelativo(restanteMs(chamado, agora))
  return (
    <header className={s.cabecalho}>
      <div className={s.linhaTitulo}>
        <span className={s.numero}>#{chamado.numero}</span>
        <h1 className={s.titulo}>{chamado.titulo}</h1>
        <Badge faixa="neutro">{rotuloStatus(chamado, usuario.perfil, responsavel?.nome)}</Badge>
        {!cliente && <BadgePrazo chamado={chamado} agora={agora} />}
        {reabertoEm && <Badge faixa="neutro">reaberto em {formatarDiaHora(reabertoEm, usuario)}</Badge>}
      </div>
      <div className={s.meta}>
        {cliente
          ? (faixa !== 'encerrado' && faixa !== 'pausado' && <span>{restanteMs(chamado, agora) >= 0 ? <>Previsão de {TIPO_PRAZO[tipo]} até <b>{formatarDiaHora(prazo, usuario)}</b></> : 'Em atraso. Estamos cuidando.'}</span>)
          : <>
              <span>Cliente <b>{solicitante?.nome}</b>{solicitante?.perfil === 'cliente' && ` · ${solicitante.empresa}`}</span>
              <span>Responsável <b>{responsavel?.nome ?? 'sem dono'}</b></span>
              {categoria && <span>{categoria} · prioridade {chamado.prioridade}</span>}
              <span>Aberto em {formatarDataHora(chamado.aberto_em, usuario)}</span>
            </>}
        {responsavel && cliente && <span>Quem está cuidando: <b>{responsavel.nome}</b></span>}
      </div>
      {!cliente && (faixa === 'ultima_hora' || faixa === 'vencido') && (
        <div className={s.barraPrazo} role="alert">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 2h4" /><path d="m12 14 3-3" /><circle cx="12" cy="14" r="8" /></svg>
          <span>{relativo.charAt(0).toUpperCase() + relativo.slice(1)}</span>
          <small>prazo de {TIPO_PRAZO[tipo]} · {formatarDataHora(prazo, usuario)}</small>
        </div>
      )}
      <p className={s.descricao}>{chamado.descricao}</p>
    </header>
  )
}
