import { useState } from 'react'
import type { Chamado, Status, Usuario, UsuarioConsultor } from '@/shared/types'
import { Button, Campo, Dialog, Select, useToast } from '@/shared/components'
import { useAtribuir, useEnviarMensagem, useMudarStatus } from '@/api/queries'
import { ehReabertura, motivoAutomatico, motivosSugeridos, ROTULO_ACAO, transicoesPermitidas } from '@/shared/utils/status'
import s from './detalhe.module.css'

interface Props {
  chamado: Chamado
  usuario: Usuario
  consultoresDoGrupo: UsuarioConsultor[]
  /** Fluxo "Reabrir esse" da Helena (spec §5.3): abre o diálogo já com o texto; ao confirmar, reabre e manda o texto como mensagem. */
  reabrirInicial?: string
  /** Chamado quando o segundo POST (mensagem) falha: o texto volta para a caixa de resposta. */
  onMensagemFalhou?: (texto: string) => void
}

/** Menu de ações filtrado por §6.1 e §7. Toda transição manual abre diálogo com motivo obrigatório. */
export function AcoesStatus({ chamado, usuario, consultoresDoGrupo, reabrirInicial, onMensagemFalhou }: Props) {
  const { notificar } = useToast()
  const mudar = useMudarStatus(chamado.id)
  const enviarMensagem = useEnviarMensagem(chamado.id)
  const atribuir = useAtribuir()
  const [alvo, setAlvo] = useState<Status | null>(reabrirInicial !== undefined ? 'em_atendimento' : null)
  const [motivo, setMotivo] = useState(reabrirInicial ?? '')
  /** Rádio escolhido no diálogo da equipe: uma das sugestões, ou 'outro' para o texto livre. */
  const [opcaoMotivo, setOpcaoMotivo] = useState<string | null>(null)
  const [destino, setDestino] = useState<string | undefined>()
  const [atribuindo, setAtribuindo] = useState(false)

  const erro = (e: Error) => notificar({ titulo: 'Não deu certo', descricao: e.message, tipo: 'erro' })
  const transicoes = transicoesPermitidas(chamado.status, usuario.perfil)
  const semDono = chamado.responsavel_id === null
  const podePegar = usuario.perfil === 'consultor' && semDono && chamado.grupo_id === usuario.grupo_id
  const podeAtribuir = usuario.perfil === 'gestor' && chamado.status !== 'resolvido' && chamado.status !== 'fechado'

  const executar = (para: Status) => {
    const automatico = motivoAutomatico(chamado.status, para, usuario.perfil)
    if (automatico) { mudar.mutate({ para }, { onError: erro }); return }
    setAlvo(para)
    const sugestoes = usuario.perfil !== 'cliente' ? motivosSugeridos(chamado.status, para) : []
    const unica = sugestoes.length === 1 ? sugestoes[0] : undefined
    if (unica) { setOpcaoMotivo(unica); setMotivo(unica) }
    else if (usuario.perfil !== 'cliente' && sugestoes.length === 0) { setOpcaoMotivo('outro'); setMotivo('') }
    else { setOpcaoMotivo(null); setMotivo('') }
  }
  const confirmar = () => {
    if (!alvo || !motivo.trim()) return
    const texto = motivo.trim()
    mudar.mutate({ para: alvo, motivo: texto }, {
      onSuccess() {
        setAlvo(null)
        // ordem obrigatória (spec §5.3): primeiro /status, depois /mensagens
        if (reabrirInicial !== undefined) {
          enviarMensagem.mutate({ texto, interna: false }, {
            onError() { notificar({ titulo: 'Reaberto, mas a mensagem não foi enviada', descricao: 'O texto ficou na caixa de resposta.', tipo: 'alerta' }); onMensagemFalhou?.(texto) },
          })
        }
      },
      onError: erro,
    })
  }
  const rotulo = (para: Status) => {
    const base = ROTULO_ACAO[`${chamado.status}>${para}`] ?? para
    if (usuario.perfil === 'cliente' && chamado.status === 'resolvido' && para === 'em_atendimento') return 'Ainda não resolveu'
    if (usuario.perfil === 'cliente' && chamado.status === 'resolvido' && para === 'fechado') return 'Resolvido? Confirmar'
    return base
  }

  return (
    <div className={s.acoes}>
      {podePegar && <Button variante="primaria" onClick={() => atribuir.mutate({ chamadoId: chamado.id, consultorId: usuario.id }, { onError: erro })} disabled={atribuir.isPending}>Pegar para atender</Button>}
      {podeAtribuir && <Button onClick={() => setAtribuindo(true)}>{semDono ? 'Atribuir a…' : 'Reatribuir a…'}</Button>}
      {transicoes.map((para) => <Button key={para} variante={para === 'resolvido' ? 'primaria' : 'padrao'} onClick={() => executar(para)} disabled={mudar.isPending}>{rotulo(para)}</Button>)}

      <Dialog aberto={alvo !== null} onFechar={() => setAlvo(null)} titulo={alvo && ehReabertura(chamado.status, alvo) ? 'Reabrir chamado' : 'Mudar status'}
        acoes={<><Button onClick={() => setAlvo(null)}>Cancelar</Button><Button variante="primaria" onClick={confirmar} disabled={!motivo.trim() || mudar.isPending}>Confirmar</Button></>}>
        {usuario.perfil === 'cliente' ? (
          <Campo multilinha rotulo="Conte o que aconteceu" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus required />
        ) : (
          <fieldset className={s.motivo}>
            <legend className={s.rotulo} id="lb-motivo">Motivo</legend>
            <div className={s.chips} role="radiogroup" aria-labelledby="lb-motivo">
              {alvo && motivosSugeridos(chamado.status, alvo).map((sugestao) => (
                <label key={sugestao} className={s.chip}>
                  <input type="radio" name="motivo" value={sugestao} checked={opcaoMotivo === sugestao}
                    onChange={() => { setOpcaoMotivo(sugestao); setMotivo(sugestao) }} />
                  <span>{sugestao}</span>
                </label>
              ))}
              <label className={s.chip}>
                <input type="radio" name="motivo" value="outro" checked={opcaoMotivo === 'outro'}
                  onChange={() => { setOpcaoMotivo('outro'); setMotivo('') }} />
                <span>Outro motivo</span>
              </label>
            </div>
            {opcaoMotivo === 'outro' && (
              <Campo multilinha rotulo="Descreva o motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus required />
            )}
          </fieldset>
        )}
      </Dialog>

      <Dialog aberto={atribuindo} onFechar={() => setAtribuindo(false)} titulo="Atribuir chamado"
        acoes={<><Button onClick={() => setAtribuindo(false)}>Cancelar</Button>
          <Button variante="primaria" disabled={!destino || atribuir.isPending} onClick={() => destino && atribuir.mutate({ chamadoId: chamado.id, consultorId: destino }, { onSuccess: () => setAtribuindo(false), onError: erro })}>Atribuir</Button></>}>
        <Select ariaLabel="Consultor" valor={destino} onChange={setDestino} opcoes={consultoresDoGrupo.map((c) => ({ valor: c.id, rotulo: c.nome }))} placeholder="Escolha o consultor" />
      </Dialog>
    </div>
  )
}
