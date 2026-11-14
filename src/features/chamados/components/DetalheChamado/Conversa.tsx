import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Mensagem, Usuario } from '@/shared/types'
import { formatarDataHora } from '@/shared/utils/datas'
import s from './detalhe.module.css'

const DIA: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const HORA: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

interface Props { mensagens: Mensagem[]; usuarios: Record<string, Usuario>; usuario: Usuario; digitando: boolean }

/** Virtualizada (há um chamado com 1.500 mensagens). Mensagem nova com texto na caixa vira aviso, não rolagem (spec §5.1). */
export function Conversa({ mensagens, usuarios, usuario, digitando }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [novas, setNovas] = useState(0)
  const totalAnterior = useRef(mensagens.length)
  const noFim = useRef(true)

  const virtual = useVirtualizer({ count: mensagens.length, getScrollElement: () => ref.current, estimateSize: () => 72, overscan: 8, measureElement: (el) => el.getBoundingClientRect().height })

  const rolarParaFim = () => { if (mensagens.length) virtual.scrollToIndex(mensagens.length - 1, { align: 'end' }); setNovas(0) }

  useEffect(() => {
    const chegou = mensagens.length - totalAnterior.current
    totalAnterior.current = mensagens.length
    if (chegou <= 0) return
    const ultima = mensagens.at(-1)
    if (ultima?.autor_id === usuario.id) { rolarParaFim(); return }
    if (digitando || !noFim.current) setNovas((n) => n + chegou)
    else rolarParaFim()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagens.length])

  useEffect(() => { rolarParaFim() /* primeira carga */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aoRolar = () => {
    const el = ref.current; if (!el) return
    noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (noFim.current) setNovas(0)
  }

  return (
    <div className={s.conversa} ref={ref} onScroll={aoRolar} aria-label="Conversa">
      <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
        {virtual.getVirtualItems().map((item) => {
          const m = mensagens[item.index]!
          const autor = usuarios[m.autor_id]
          const minha = m.autor_id === usuario.id
          const dia = formatarDataHora(m.criada_em, usuario, DIA)
          const novoDia = item.index === 0 || formatarDataHora(mensagens[item.index - 1]!.criada_em, usuario, DIA) !== dia
          return (
            <div key={m.id} data-index={item.index} ref={virtual.measureElement} className={s.item} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}>
              {novoDia && <div className={s.dia}>{dia}</div>}
              <div className={`${s.mensagem} ${minha ? s.minha : ''} ${m.interna ? s.interna : ''}`}>
                <div className={s.autor}>
                  <strong>{autor?.nome ?? 'Alguém'}</strong>
                  <span>{formatarDataHora(m.criada_em, usuario, HORA)}</span>
                  {m.interna && <span className={s.rotuloInterna}>Nota interna · só a equipe vê</span>}
                </div>
                <div className={s.texto}>{m.texto}</div>
              </div>
            </div>
          )
        })}
      </div>
      {novas > 0 && (
        <div className={s.avisoNova} role="status">
          <button type="button" className={s.nova} onClick={rolarParaFim}><i aria-hidden />{novas === 1 ? '1 mensagem nova' : `${novas} mensagens novas`} · ver</button>
        </div>
      )}
    </div>
  )
}
