import { useEffect, useState } from 'react'
import type { Usuario } from '@/shared/types'
import { Button, useToast } from '@/shared/components'
import { useEnviarMensagem } from '@/api/queries'
import s from './detalhe.module.css'

interface Props { chamadoId: string; usuario: Usuario; onDigitando(v: boolean): void; textoInicial?: string }

export function CaixaResposta({ chamadoId, usuario, onDigitando, textoInicial = '' }: Props) {
  const [texto, setTexto] = useState(textoInicial)
  // texto devolvido após falha do envio automático conta como "digitando" (não rolar a conversa)
  useEffect(() => { if (textoInicial.trim()) onDigitando(true) }, [textoInicial, onDigitando])
  const [interna, setInterna] = useState(false)
  const { notificar } = useToast()
  const enviar = useEnviarMensagem(chamadoId)
  const equipe = usuario.perfil !== 'cliente'
  const mandar = () => {
    if (!texto.trim()) return
    enviar.mutate({ texto: texto.trim(), interna: equipe && interna }, {
      onSuccess() { setTexto(''); onDigitando(false) },
      onError(e) { notificar({ titulo: 'Não foi possível enviar', descricao: e.message, tipo: 'erro' }) },
    })
  }
  return (
    <div className={s.caixa}>
      {equipe && (
        <div className={s.caixaLinha}>
          <div className={s.segmentado} role="radiogroup" aria-label="Tipo de mensagem">
            <label className={s.segmento}><input className={s.radio} type="radio" name="tipo" checked={!interna} onChange={() => setInterna(false)} />Resposta ao cliente</label>
            <label className={s.segmento}><input className={s.radio} type="radio" name="tipo" checked={interna} onChange={() => setInterna(true)} />Nota interna</label>
          </div>
          <small className={s.dica}>só a equipe vê a nota interna</small>
        </div>
      )}
      <textarea className={`${s.textarea} ${interna ? s.interna : ''}`} aria-label={interna ? 'Nota interna' : 'Resposta'} value={texto}
        placeholder={interna ? 'Anotação para colegas…' : 'Escreva sua resposta…'}
        onChange={(e) => { setTexto(e.target.value); onDigitando(e.target.value.trim().length > 0) }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) mandar() }} />
      <div className={`${s.caixaLinha} ${s.envio}`}>
        <small className={s.dica}>Ctrl + Enter envia</small>
        <Button variante="primaria" onClick={mandar} disabled={enviar.isPending || !texto.trim()}>{interna ? 'Salvar nota' : 'Enviar'}</Button>
      </div>
    </div>
  )
}
