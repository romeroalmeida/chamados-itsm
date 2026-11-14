import { useEffect, useState } from 'react'
import { relogio, CHAVE_RELOGIO } from '@/shared/utils/relogio'

/** Único "agora" da UI (spec §4.5). Reavalia por intervalo e quando outra aba reancora o relógio. */
export function useNow(intervaloMs?: number): number {
  const [agora, setAgora] = useState(() => relogio.agora())
  const [velocidade, setVelocidade] = useState(() => relogio.velocidade())
  useEffect(() => {
    const tick = () => { setAgora(relogio.agora()); setVelocidade(relogio.velocidade()) }
    const periodo = intervaloMs ?? (velocidade >= 20 ? 5_000 : 30_000)
    const t = setInterval(tick, periodo)
    // outra aba (ou o painel desta) reancorou o relógio: reavalia e, se a velocidade mudou, o effect reinicia com novo período
    const onStorage = (e: StorageEvent) => { if (e.key === CHAVE_RELOGIO) tick() }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [intervaloMs, velocidade])
  return agora
}
