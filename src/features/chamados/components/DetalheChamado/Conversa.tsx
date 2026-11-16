import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Historico, Mensagem, Usuario } from '@/shared/types'
import { formatarDataHora } from '@/shared/utils/datas'
import { ehReabertura, ROTULO_STATUS } from '@/shared/utils/status'
import s from './detalhe.module.css'

const DIA: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
const HORA: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

type Item =
  | { tipo: 'mensagem'; id: string; em: string; m: Mensagem }
  | { tipo: 'evento'; id: string; em: string; h: Historico }
  | { tipo: 'abertura'; id: string; em: string; autorId: string; texto: string }

interface Props {
  mensagens: Mensagem[]; usuarios: Record<string, Usuario>; usuario: Usuario; digitando: boolean
  /** Equipe: mudanças de status e atribuições entram na mesma linha do tempo, na ordem em que aconteceram. */
  historico?: Historico[]
  /** Descrição de abertura, mostrada como a primeira fala do cliente. */
  abertura?: { em: string; autorId: string; texto: string }
  /** Cliente: mostra só as últimas N mensagens até ela pedir as anteriores. */
  recolher?: number
}

/** Virtualizada (há um chamado com 1.500 mensagens). Mensagem nova com texto na caixa vira aviso, não rolagem (spec §5.1). */
export function Conversa({ mensagens, usuarios, usuario, digitando, historico, abertura, recolher }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [novas, setNovas] = useState(0)
  const [expandido, setExpandido] = useState(false)
  const totalAnterior = useRef(mensagens.length)
  const noFim = useRef(true)

  const ocultas = recolher !== undefined && !expandido ? Math.max(0, mensagens.length - recolher) : 0
  const itens = useMemo<Item[]>(() => {
    const r: Item[] = mensagens.slice(ocultas).map((m) => ({ tipo: 'mensagem', id: m.id, em: m.criada_em, m }))
    if (ocultas === 0 && abertura) r.push({ tipo: 'abertura', id: 'abertura', ...abertura })
    for (const h of historico ?? []) r.push({ tipo: 'evento', id: h.id, em: h.ocorrido_em, h })
    // sort estável: no mesmo instante, a ordem de chegada (abertura, mensagem, evento) se mantém
    return r.sort((a, b) => a.em.localeCompare(b.em))
  }, [mensagens, historico, abertura, ocultas])

  const virtual = useVirtualizer({ count: itens.length, getScrollElement: () => ref.current, estimateSize: () => 72, overscan: 8, measureElement: (el) => el.getBoundingClientRect().height })

  const rolarParaFim = () => { if (itens.length) virtual.scrollToIndex(itens.length - 1, { align: 'end' }); setNovas(0) }

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

  const nome = (id: string) => (id === usuario.id ? 'Você' : usuarios[id]?.nome ?? 'Alguém')

  return (
    <div className={s.conversa} ref={ref} onScroll={aoRolar} aria-label="Conversa">
      {ocultas > 0 && (
        <button type="button" className={s.maisAntigas} onClick={() => setExpandido(true)}>
          {ocultas === 1 ? 'Mostrar a mensagem anterior' : `Mostrar as ${ocultas} mensagens anteriores`}
        </button>
      )}
      <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
        {virtual.getVirtualItems().map((v) => {
          const it = itens[v.index]!
          const dia = formatarDataHora(it.em, usuario, DIA)
          const novoDia = v.index === 0 || formatarDataHora(itens[v.index - 1]!.em, usuario, DIA) !== dia
          return (
            <div key={it.id} data-index={v.index} ref={virtual.measureElement} className={s.item} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}>
              {novoDia && <div className={s.dia}><span>{dia}</span></div>}
              {it.tipo === 'evento'
                ? <Evento h={it.h} quem={nome(it.h.usuario_id)} hora={formatarDataHora(it.em, usuario, HORA)} />
                : (() => {
                  const autorId = it.tipo === 'mensagem' ? it.m.autor_id : it.autorId
                  const interna = it.tipo === 'mensagem' && it.m.interna === true
                  return (
                    <div className={`${s.mensagem} ${autorId === usuario.id ? s.minha : ''} ${interna ? s.interna : ''}`}>
                      <div className={s.autor}>
                        <strong>{nome(autorId)}</strong>
                        <span className={s.mono}>{formatarDataHora(it.em, usuario, HORA)}</span>
                        {it.tipo === 'abertura' && <span>abriu o chamado</span>}
                        {interna && <span className={s.rotuloInterna}>Nota interna · só a equipe vê</span>}
                      </div>
                      <div className={s.texto}>{it.tipo === 'mensagem' ? it.m.texto : it.texto}</div>
                    </div>
                  )
                })()}
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

/** Texto em minúsculas de propósito: o rótulo exato do status fica para o stepper. */
function Evento({ h, quem, hora }: { h: Historico; quem: string; hora: string }) {
  const reabriu = h.tipo === 'status' && h.de && h.para && ehReabertura(h.de, h.para)
  const texto = h.tipo === 'atribuicao' ? `${quem} ficou responsável`
    : reabriu ? `${quem} reabriu o chamado`
      : `${quem} mudou para ${h.para ? ROTULO_STATUS[h.para].toLowerCase() : '—'}`
  return (
    <div className={s.evento}>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {h.tipo === 'atribuicao' ? <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> : reabriu ? <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></> : <path d="M20 6 9 17l-5-5" />}
      </svg>
      <span>{texto}{h.motivo && <> · “{h.motivo}”</>} · <span className={s.mono}>{hora}</span></span>
    </div>
  )
}
