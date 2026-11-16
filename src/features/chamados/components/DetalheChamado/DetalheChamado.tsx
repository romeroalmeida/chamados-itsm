import { useEffect, useState } from 'react'
import type { Usuario, UsuarioConsultor } from '@/shared/types'
import { Link } from 'react-router'
import { useChamado, useCategorias, useMapaUsuarios } from '@/api/queries'
import { ApiError } from '@/api/apiClient'
import { relogio } from '@/shared/utils/relogio'
import { Carregando, Erro, Vazio } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { ehReabertura } from '@/shared/utils/status'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { AcoesStatus } from './AcoesStatus'
import { CaixaResposta } from './CaixaResposta'
import { Conversa } from './Conversa'
import { CabecalhoEquipe } from './CabecalhoEquipe'
import { DetalheCliente } from './DetalheCliente'
import s from './detalhe.module.css'

interface Props { id: string; usuario: Usuario; reabrirInicial?: string }

export function DetalheChamado({ id, usuario, reabrirInicial }: Props) {
  const q = useChamado(id)
  const usuarios = useMapaUsuarios()
  const categorias = useCategorias().data ?? []
  const agora = useNow()
  const [digitando, setDigitando] = useState(false)
  // só recebe texto quando o envio automático da reabertura falha (spec §5.3)
  const [textoCaixa, setTextoCaixa] = useState('')
  const [, marcarVisita] = useUltimaVisita(usuario.id, id)
  // marca "vi este chamado" sempre que a conversa cresce enquanto estou nele; relógio VIRTUAL, o mesmo de atualizado_em
  const totalMensagens = q.data?.mensagens.length
  useEffect(() => { if (totalMensagens !== undefined) marcarVisita(relogio.agora()) }, [totalMensagens, marcarVisita])

  if (q.isPending) return <Carregando />
  if (q.isError) {
    const e = q.error
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
      return (
        <>
          <Vazio texto="Este chamado não existe ou não está no seu alcance." />
          <p className={s.foraDeAlcance}><Link to={ROTA_INICIAL[usuario.perfil]}>Ir para a minha tela</Link></p>
        </>
      )
    }
    return <Erro erro={e} tentar={() => q.refetch()} />
  }
  const { chamado, mensagens, historico } = q.data
  const reabertoEm = [...historico].reverse().find((h) => h.tipo === 'status' && h.de && h.para && ehReabertura(h.de, h.para))?.ocorrido_em
  const consultoresDoGrupo = Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.grupo_id === chamado.grupo_id)
  const cliente = usuario.perfil === 'cliente'

  const acoes = <AcoesStatus chamado={chamado} usuario={usuario} consultoresDoGrupo={consultoresDoGrupo} reabrirInicial={reabrirInicial} onMensagemFalhou={setTextoCaixa} />
  const solicitante = usuarios[chamado.solicitante_id]

  if (cliente) return <DetalheCliente detalhe={q.data} usuario={usuario} usuarios={usuarios} acoes={acoes} textoCaixa={textoCaixa} />

  const ultimaPublica = mensagens.findLast((m) => m.interna !== true)
  return (
    <article className={s.detalhe} aria-label={`Chamado ${chamado.numero}`}>
      <CabecalhoEquipe chamado={chamado} usuario={usuario} usuarios={usuarios} agora={agora} reabertoEm={reabertoEm} acoes={acoes}
        categoria={categorias.find((c) => c.id === chamado.categoria_id)?.nome}
        ultimaDoCliente={ultimaPublica?.autor_id === chamado.solicitante_id ? ultimaPublica : undefined} />
      <Conversa mensagens={mensagens} historico={historico} abertura={{ em: chamado.aberto_em, autorId: chamado.solicitante_id, texto: chamado.descricao }} usuarios={usuarios} usuario={usuario} digitando={digitando} />
      <CaixaResposta key={textoCaixa} chamadoId={chamado.id} usuario={usuario} onDigitando={setDigitando} textoInicial={textoCaixa} destino={solicitante?.nome.split(' ')[0]} />
    </article>
  )
}
