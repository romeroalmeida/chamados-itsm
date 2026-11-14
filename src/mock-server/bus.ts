import { ehEvento, type Evento } from '@/shared/types'
import { PREFIXO_EVENTO } from './eventLog'

export interface Bus {
  /** Assinantes locais primeiro (síncrono), depois as outras abas. */
  publicar(e: Evento): void
  assinar(cb: (e: Evento) => void): () => void
  conectado(): boolean
}

interface Opcoes {
  nome?: string
  Canal?: typeof BroadcastChannel | undefined
  /** Fallback quando não há BroadcastChannel: escuta `storage` deste Storage. */
  storage?: Storage
  /** Reenvia o evento uma segunda vez para provar o dedupe (spec §4.4). */
  deveDuplicar?: (e: Evento) => boolean
}

export function criarBus(opts: Opcoes = {}): Bus {
  const nome = opts.nome ?? 'itsm:bus'
  const Canal = 'Canal' in opts ? opts.Canal : (typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : undefined)
  const assinantes = new Set<(e: Evento) => void>()
  const entregarLocal = (e: Evento) => { for (const cb of [...assinantes]) cb(e) }

  let canal: BroadcastChannel | null = null
  if (Canal) {
    canal = new Canal(nome)
    canal.onmessage = (ev) => { if (ehEvento(ev.data)) entregarLocal(ev.data) }
  } else if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (!ev.key?.startsWith(PREFIXO_EVENTO) || !ev.newValue) return
      if (opts.storage && ev.storageArea && ev.storageArea !== opts.storage) return
      try {
        const e = JSON.parse(ev.newValue)
        if (ehEvento(e)) entregarLocal(e)
      } catch { /* chave corrompida: o eventLog remove no próximo replay */ }
    })
  }

  return {
    publicar(e) {
      const vezes = opts.deveDuplicar?.(e) ? 2 : 1
      for (let i = 0; i < vezes; i++) {
        entregarLocal(e)
        canal?.postMessage(e)
      }
    },
    assinar(cb) {
      assinantes.add(cb)
      return () => { assinantes.delete(cb) }
    },
    conectado: () => canal !== null || typeof window !== 'undefined',
  }
}
