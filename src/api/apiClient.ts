import { usuarioAtual } from '@/state/sessao'

export const BASE_API = '/api'

export class ApiError extends Error {
  status: number
  codigo: string
  // sem parameter properties (erasableSyntaxOnly)
  constructor(status: number, codigo: string, mensagem: string) { super(mensagem); this.name = 'ApiError'; this.status = status; this.codigo = codigo }
}

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const u = usuarioAtual()
  if (u) headers.set('X-Usuario-Id', u.id)
  const r = await fetch(`${BASE_API}${caminho}`, { ...init, headers })
  if (!r.ok) {
    let corpo: { codigo?: string; mensagem?: string } = {}
    try { corpo = await r.json() } catch { /* sem corpo */ }
    throw new ApiError(r.status, corpo.codigo ?? 'erro', corpo.mensagem ?? `Erro ${r.status}`)
  }
  return (await r.json()) as T
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>(caminho),
  post: <T>(caminho: string, corpo: unknown) => requisitar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
}
