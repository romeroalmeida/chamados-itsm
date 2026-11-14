import type { Chamado, Usuario } from '@/shared/types'
import { Badge, BadgePrazo } from '@/shared/components'
import { faixaSla, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { formatarDiaHora, formatarRelativo } from '@/shared/utils/datas'
import { rotuloStatus } from '../utils/rotulos'
import s from './detalhe.module.css'

interface Props { chamado: Chamado; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; reabertoEm?: string; categoria?: string }

export function CabecalhoChamado({ chamado, usuario, usuarios, agora, reabertoEm, categoria }: Props) {
  const responsavel = chamado.responsavel_id ? usuarios[chamado.responsavel_id] : undefined
  const solicitante = usuarios[chamado.solicitante_id]
  const cliente = usuario.perfil === 'cliente'
  const faixa = faixaSla(chamado, agora)
  const { tipo, prazo } = prazoRelevante(chamado)
  return (
    <header className={s.cabecalho}>
      <div className={s.linhaTitulo}>
        <span className={s.numero}>#{chamado.numero}</span>
        <h1 className={s.titulo}>{chamado.titulo}</h1>
        <Badge faixa="neutro">{rotuloStatus(chamado, usuario.perfil, responsavel?.nome)}</Badge>
        {!cliente && <BadgePrazo chamado={chamado} agora={agora} />}
        {reabertoEm && <Badge faixa="neutro">reaberto em {formatarDiaHora(reabertoEm, usuario)}</Badge>}
      </div>
      {!cliente && (faixa === 'ultima_hora' || faixa === 'vencido') && (
        <div className={`${s.barraPrazo} ${s[faixa]}`} role="alert">{formatarRelativo(restanteMs(chamado, agora))} · prazo de {TIPO_PRAZO[tipo]}</div>
      )}
      <div className={s.meta}>
        {cliente
          ? (faixa !== 'encerrado' && faixa !== 'pausado' && <span>{restanteMs(chamado, agora) >= 0 ? `Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, usuario)}` : 'Em atraso. Estamos cuidando.'}</span>)
          : <>
              <span>Cliente: {solicitante?.nome}{solicitante?.perfil === 'cliente' && ` · ${solicitante.empresa}`}</span>
              <span>Responsável: {responsavel?.nome ?? 'sem dono'}</span>
              {categoria && <span>{categoria} · prioridade {chamado.prioridade}</span>}
            </>}
        {responsavel && cliente && <span>Quem está cuidando: {responsavel.nome}</span>}
      </div>
      <p style={{ margin: 0, color: 'var(--cor-texto-fraco)' }}>{chamado.descricao}</p>
    </header>
  )
}
