import { useEffect, useId, useState } from 'react'
import type { Usuario } from '@/shared/types'
import { Button, useToast } from '@/shared/components'
import { useEnviarMensagem } from '@/api/queries'
import s from './detalhe.module.css'

interface Props {
  chamadoId: string; usuario: Usuario; onDigitando(v: boolean): void; textoInicial?: string
  /** Primeiro nome de quem lê a resposta: o cliente (para a equipe) ou o responsável (para o cliente). */
  destino?: string
}

/** Caixa no padrão do campo do login; na nota interna a caixa inteira fica âmbar e o botão vira "Salvar nota". */
export function CaixaResposta({ chamadoId, usuario, onDigitando, textoInicial = '', destino }: Props) {
  const [texto, setTexto] = useState(textoInicial)
  // texto devolvido após falha do envio automático conta como "digitando" (não rolar a conversa)
  useEffect(() => { if (textoInicial.trim()) onDigitando(true) }, [textoInicial, onDigitando])
  const [interna, setInterna] = useState(false)
  const { notificar } = useToast()
  const enviar = useEnviarMensagem(chamadoId)
  const dicaId = useId()
  const equipe = usuario.perfil !== 'cliente'
  const mandar = () => {
    if (!texto.trim()) return
    enviar.mutate({ texto: texto.trim(), interna: equipe && interna }, {
      onSuccess() { setTexto(''); onDigitando(false) },
      onError(e) { notificar({ titulo: 'Não foi possível enviar', descricao: e.message, tipo: 'erro' }) },
    })
  }
  const quem = destino ?? (equipe ? 'o cliente' : 'a equipe')
  const dica = !equipe ? `${destino ?? 'A equipe'} vê a sua mensagem na hora.` : interna ? `Só a equipe vê. ${destino ?? 'O cliente'} não vê esta nota.` : `${destino ?? 'O cliente'} vê esta resposta no chamado.`
  return (
    <div className={s.caixa}>
      {equipe && (
        <div className={s.caixaLinha}>
          <div className={s.segmentado} role="radiogroup" aria-label="Tipo de mensagem">
            <label className={s.segmento}><input className={s.radio} type="radio" name="tipo" checked={!interna} onChange={() => setInterna(false)} />Resposta ao cliente</label>
            <label className={`${s.segmento} ${s.segmentoInterna}`}><input className={s.radio} type="radio" name="tipo" checked={interna} onChange={() => setInterna(true)} />Nota interna</label>
          </div>
          <small className={s.dica2} id={dicaId}>{dica}</small>
        </div>
      )}
      <div className={`${s.compor} ${interna ? s.comporInterna : ''}`}>
        <textarea className={s.textarea} rows={1} aria-label={interna ? 'Nota interna' : 'Resposta'} aria-describedby={equipe ? dicaId : undefined} value={texto}
          placeholder={interna ? `Anotação para colegas. ${destino ?? 'O cliente'} não vê.` : `Escreva para ${quem}…`}
          onChange={(e) => { setTexto(e.target.value); onDigitando(e.target.value.trim().length > 0) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) mandar() }} />
        <Button variante="primaria" className={s.enviar} onClick={mandar} disabled={enviar.isPending || !texto.trim()}>
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
          {interna ? 'Salvar nota' : 'Enviar'}
        </Button>
      </div>
      <div className={s.rodapeCaixa}><small>Ctrl + Enter envia</small>{!equipe && <small>{dica}</small>}</div>
    </div>
  )
}
