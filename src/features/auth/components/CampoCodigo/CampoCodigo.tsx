// Porte do CampoCodigo do escalanova: o código de 6 números em duas metades (3 + 3, como "482 913" no e-mail).
// Um <input> só, invisível, por cima das caixas: assim o colar ("482 913" vira 482913), o preenchimento automático do
// iPhone/Mac (autocomplete="one-time-code") e o leitor de tela continuam funcionando. Seis inputs separados quebram isso.
import { useState } from 'react'
import s from './CampoCodigo.module.css'

type Props = {
  id: string
  valor: string
  aoMudar: (v: string) => void
  /** chamado uma vez, quando o 6º número entra; recebe o código para não depender do estado do pai */
  aoCompletar: (codigo: string) => void
  erro: boolean
  desativado: boolean
  /** id da mensagem de erro, para o aria-describedby */
  idErro?: string
}

export function CampoCodigo({ id, valor, aoMudar, aoCompletar, erro, desativado, idErro }: Props) {
  const [foco, setFoco] = useState(false)

  const caixa = (i: number) => {
    const numero = valor[i] ?? ''
    const ativa = foco && (i === valor.length || (valor.length === 6 && i === 5))
    return (
      <div key={i} className={`${s.caixa} ${ativa ? s.ativa : ''}`}>
        {numero}
        {ativa && !numero && <span className={s.cursor} />}
      </div>
    )
  }
  const metade = (inicio: number) => (
    <div className={`${s.metade} ${erro ? s.metadeErro : ''} ${foco && !erro ? s.metadeFoco : ''}`}>
      {[inicio, inicio + 1, inicio + 2].map(caixa)}
    </div>
  )

  return (
    <div className={s.campo}>
      <input
        id={id}
        name="codigo"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        autoFocus
        required
        readOnly={desativado}
        value={valor}
        onChange={(e) => {
          // Sem maxLength de propósito: "482 913" tem 7 caracteres e o navegador cortaria o último número antes daqui.
          // Colar "482 913" ou "482-913" vira "482913": só os dígitos contam.
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          aoMudar(v)
          if (v.length === 6 && valor.length !== 6) aoCompletar(v)
        }}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        aria-invalid={erro || undefined}
        aria-describedby={erro ? idErro : undefined}
        className={s.entrada}
      />
      <div aria-hidden className={s.caixas}>
        {metade(0)}
        <span className={s.traco} />
        {metade(3)}
      </div>
    </div>
  )
}
