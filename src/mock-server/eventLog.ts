import { ehEvento, type Evento } from '@/shared/types'

export const PREFIXO_ITSM = 'itsm:'
export const PREFIXO_EVENTO = 'itsm:evt:'

export interface EventLog {
  gravar(e: Evento): void
  ler(): { eventos: Evento[]; ignorados: number }
  limparTudo(): void
}

export const chaveDe = (e: Evento) => `${PREFIXO_EVENTO}${e.ocorrido_em}:${e.id}`

export function criarEventLog(storage: Storage): EventLog {
  const chaves = (prefixo: string) => {
    const out: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k?.startsWith(prefixo)) out.push(k)
    }
    return out
  }
  return {
    gravar: (e) => storage.setItem(chaveDe(e), JSON.stringify(e)),
    ler() {
      const eventos: Evento[] = []
      let ignorados = 0
      for (const k of chaves(PREFIXO_EVENTO).sort()) {
        try {
          const v = JSON.parse(storage.getItem(k) ?? '')
          if (ehEvento(v)) eventos.push(v)
          else throw new Error('evento inválido')
        } catch {
          ignorados++
          storage.removeItem(k)
        }
      }
      return { eventos, ignorados }
    },
    limparTudo() {
      for (const k of chaves(PREFIXO_ITSM)) storage.removeItem(k)
    },
  }
}
