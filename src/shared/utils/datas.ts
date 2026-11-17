import type { Usuario } from '@/shared/types'

type Fuso = Pick<Usuario, 'locale' | 'zoneinfo'>

export function formatarDataHora(iso: string, fuso: Fuso, opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }): string {
  return new Intl.DateTimeFormat(fuso.locale, { timeZone: fuso.zoneinfo, ...opcoes }).format(new Date(iso))
}

export function formatarDiaHora(iso: string, fuso: Fuso): string {
  return new Intl.DateTimeFormat(fuso.locale, { timeZone: fuso.zoneinfo, weekday: 'long', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(iso))
}

export function formatarDuracao(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000))
  const d = Math.floor(total / 1440), h = Math.floor((total % 1440) / 60), m = total % 60
  if (d > 0) return h > 0 ? `${d} d ${h}h` : `${d} d`
  if (h > 0) return m > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`
  return `${m} min`
}

export function formatarRelativo(restanteMs: number): string {
  return restanteMs >= 0 ? `estoura em ${formatarDuracao(restanteMs)}` : `estourou há ${formatarDuracao(-restanteMs)}`
}
