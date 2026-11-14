import { useEffect, useState } from 'react'
import type { Usuario, UsuarioConsultor } from '@/shared/types'
import { Link } from 'react-router'
import { useChamado, useCategorias, useMapaUsuarios } from '@/api/queries'
import { ApiError } from '@/api/apiClient'
import { relogio } from '@/shared/utils/relogio'
import { Carregando, Erro, Tabs, Vazio } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { ehReabertura } from '@/shared/utils/status'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { AcoesStatus } from './AcoesStatus'
import { CabecalhoChamado } from './CabecalhoChamado'
import { CaixaResposta } from './CaixaResposta'
import { Conversa } from './Conversa'
import { HistoricoLista, PassosCliente } from './HistoricoLista'
import s from './detalhe.module.css'

interface Props { id: string; usuario: Usuario; reabrirInicial?: string }

export function DetalheChamado({ id, usuario, reabrirInicial }: Props) {
  const q = useChamado(id)
  const usuarios = useMapaUsuarios()
  const categorias = useCategorias().data ?? []
  const agora = useNow()
  const [digitando, setDigitando] = useState(false)
  const [aba, setAba] = useState('conversa')
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
          <p style={{ textAlign: 'center' }}><Link to={ROTA_INICIAL[usuario.perfil]}>Ir para a minha tela</Link></p>
        </>
      )
    }
    return <Erro erro={e} tentar={() => q.refetch()} />
  }
  const { chamado, mensagens, historico } = q.data
  const reabertoEm = [...historico].reverse().find((h) => h.tipo === 'status' && h.de && h.para && ehReabertura(h.de, h.para))?.ocorrido_em
  const consultoresDoGrupo = Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.grupo_id === chamado.grupo_id)
  const cliente = usuario.perfil === 'cliente'

  return (
    <article className={s.detalhe} aria-label={`Chamado ${chamado.numero}`}>
      <div>
        <CabecalhoChamado chamado={chamado} usuario={usuario} usuarios={usuarios} agora={agora} reabertoEm={reabertoEm} categoria={cliente ? undefined : categorias.find((c) => c.id === chamado.categoria_id)?.nome} />
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--cor-borda)' }}>
          <AcoesStatus chamado={chamado} usuario={usuario} consultoresDoGrupo={consultoresDoGrupo} reabrirInicial={reabrirInicial} onMensagemFalhou={setTextoCaixa} />
        </div>
        {cliente && <PassosCliente historico={historico} usuario={usuario} />}
      </div>
      {cliente
        ? <Conversa mensagens={mensagens} usuarios={usuarios} usuario={usuario} digitando={digitando} />
        : (
          <Tabs ariaLabel="Conversa e histórico" abas={[{ valor: 'conversa', rotulo: 'Conversa', contador: mensagens.length }, { valor: 'historico', rotulo: 'Histórico', contador: historico.length }]} valor={aba} onChange={setAba}>
            {aba === 'conversa'
              ? <Conversa mensagens={mensagens} usuarios={usuarios} usuario={usuario} digitando={digitando} />
              : <HistoricoLista historico={historico} usuarios={usuarios} usuario={usuario} />}
          </Tabs>
        )}
      <CaixaResposta key={textoCaixa} chamadoId={chamado.id} usuario={usuario} onDigitando={setDigitando} textoInicial={textoCaixa} />
    </article>
  )
}
