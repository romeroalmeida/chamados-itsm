import { HttpResponse } from 'msw'

export type CodigoErro = 'validacao' | 'nao_autenticado' | 'sem_permissao' | 'nao_encontrado' | 'conflito'
const STATUS: Record<CodigoErro, number> = { validacao: 400, nao_autenticado: 401, sem_permissao: 403, nao_encontrado: 404, conflito: 409 }

export class ErroApi extends Error {
  codigo: CodigoErro
  // sem parameter property: o template liga erasableSyntaxOnly
  constructor(codigo: CodigoErro, mensagem: string) { super(mensagem); this.codigo = codigo }
}

export const erro = (codigo: CodigoErro, mensagem: string) => new ErroApi(codigo, mensagem)

export function respostaErro(e: unknown) {
  if (e instanceof ErroApi) return HttpResponse.json({ codigo: e.codigo, mensagem: e.message }, { status: STATUS[e.codigo] })
  console.error(e)
  return HttpResponse.json({ codigo: 'interno', mensagem: 'Erro inesperado no servidor fake' }, { status: 500 })
}
