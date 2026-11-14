export const CHAVE_RELOGIO = 'itsm:relogio'
/** Evento disparado nesta aba ao reancorar o relógio (o evento `storage` só chega às outras abas). */
export const EVENTO_RELOGIO = 'itsm:relogio'

interface RelogioGravado { inicioVirtual: number; inicioReal: number; velocidade: number }

export interface Relogio {
  /** Grava o relógio se ainda não existe. Idempotente. */
  iniciar(agoraVirtualIso: string): void
  /** ms do "agora" virtual; tempo real se não há relógio gravado. */
  agora(): number
  agoraIso(): string
  velocidade(): number
  /** Reancora para não dar salto e grava a nova velocidade. */
  definirVelocidade(v: number): void
  resetar(): void
}

function ler(storage: Storage): RelogioGravado | null {
  try {
    const bruto = storage.getItem(CHAVE_RELOGIO)
    if (!bruto) return null
    const r = JSON.parse(bruto) as Partial<RelogioGravado>
    if (typeof r.inicioVirtual !== 'number' || typeof r.inicioReal !== 'number' || typeof r.velocidade !== 'number') return null
    return r as RelogioGravado
  } catch {
    return null
  }
}

export function criarRelogio(storage: Storage): Relogio {
  const gravar = (r: RelogioGravado) => storage.setItem(CHAVE_RELOGIO, JSON.stringify(r))
  const agora = () => {
    const r = ler(storage)
    if (!r) return Date.now()
    return Math.round(r.inicioVirtual + (Date.now() - r.inicioReal) * r.velocidade)
  }
  return {
    iniciar(iso) {
      if (ler(storage)) return
      gravar({ inicioVirtual: Date.parse(iso), inicioReal: Date.now(), velocidade: 1 })
    },
    agora,
    agoraIso: () => new Date(agora()).toISOString(),
    velocidade: () => ler(storage)?.velocidade ?? 1,
    definirVelocidade(v) {
      gravar({ inicioVirtual: agora(), inicioReal: Date.now(), velocidade: v })
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO_RELOGIO))
    },
    resetar: () => storage.removeItem(CHAVE_RELOGIO),
  }
}

/** Instância padrão para o app (localStorage do navegador). */
export const relogio: Relogio = criarRelogio(
  typeof localStorage !== 'undefined' ? localStorage : ({ getItem: () => null, setItem() {}, removeItem() {} } as unknown as Storage),
)
