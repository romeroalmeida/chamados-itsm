import { useMemo, useState, type ReactNode } from 'react'
import type { Usuario } from '@/shared/types'
import type { DetalheChamado as Detalhe } from '@/api/queries'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { linhaDoTempoCliente, proximoPasso } from '../../utils/cliente'
import { CaixaResposta } from './CaixaResposta'
import { Conversa } from './Conversa'
import { Passos, PASSOS_CLIENTE } from './Passos'
import s from './cliente.module.css'

interface Props { detalhe: Detalhe; usuario: Usuario; usuarios: Record<string, Usuario>; acoes: ReactNode; textoCaixa: string }

const iniciais = (nome: string) => { const p = nome.split(/\s+/); return `${p[0]![0]}${p.at(-1)![0]}`.toUpperCase() }

/** O chamado pelos olhos da cliente: stepper nas palavras dela, quem cuida e o próximo passo, o que aconteceu em frases; sem SLA interno. */
export function DetalheCliente({ detalhe, usuario, usuarios, acoes, textoCaixa }: Props) {
  const { chamado, mensagens, historico } = detalhe
  const agora = useNow()
  const [digitando, setDigitando] = useState(false)
  const nomes = useMemo(() => Object.fromEntries(Object.values(usuarios).map((u) => [u.id, u.nome])), [usuarios])
  const resp = chamado.responsavel_id ? usuarios[chamado.responsavel_id] : undefined
  const passo = proximoPasso(detalhe, usuario.id, agora, nomes, usuario)
  const acontecimentos = linhaDoTempoCliente(chamado, historico, usuario.id, nomes)
  const primeiro = resp?.nome.split(' ')[0]

  return (
    <article className={s.pagina} aria-label={`Chamado ${chamado.numero}`}>
      <header className={s.cabeca}>
        <div>
          <span className={s.numero}>#{chamado.numero}</span>
          <h1 className={s.titulo}>{chamado.titulo}</h1>
        </div>
        <Passos passos={PASSOS_CLIENTE} status={chamado.status} />
        <div className={s.situacao}>
          <span className={s.avatar} aria-hidden>{resp ? iniciais(resp.nome) : '?'}</span>
          <p>
            {chamado.status === 'fechado'
              ? <>Chamado encerrado{chamado.fechado_em && ` em ${formatarDataHora(chamado.fechado_em, usuario, { day: '2-digit', month: '2-digit' })}`}{resp && <>, atendido por <b>{resp.nome}</b></>}.</>
              : resp ? <><b>{resp.nome}</b> está cuidando do seu chamado.</> : <>Ainda ninguém pegou o seu chamado.</>}
            <small>{passo?.texto ?? 'Se voltou a acontecer, reabra e conte o que houve.'}</small>
          </p>
        </div>
        {acoes}
      </header>

      <section className={s.resumo} aria-labelledby="t-aconteceu">
        <h2 id="t-aconteceu">O que aconteceu até agora</h2>
        <ol className={s.lt}>
          {acontecimentos.map((a, i) => (
            <li key={a.id} className={i === acontecimentos.length - 1 ? s.agora : undefined}>
              <time dateTime={a.em}>{formatarDataHora(a.em, usuario)}</time>
              <span>{a.texto}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.conversa} aria-labelledby="t-conversa">
        <h2 id="t-conversa" className={s.sr}>Conversa</h2>
        <Conversa mensagens={mensagens} usuarios={usuarios} usuario={usuario} digitando={digitando} recolher={2} />
      </section>
      <div className={s.caixa}>
        <CaixaResposta key={textoCaixa} chamadoId={chamado.id} usuario={usuario} onDigitando={setDigitando} textoInicial={textoCaixa} destino={primeiro} />
      </div>
    </article>
  )
}
