import { http, HttpResponse, type HttpHandler } from 'msw'
import type { Chamado, Evento, Mensagem, Prioridade, Status, UltimaMensagem, Usuario } from '@/shared/types'
import { calcularPrazos } from '@/shared/utils/sla'
import { MOTIVO_CLIENTE_RESPONDEU, MOTIVO_PEGOU, motivoAtribuidoPor, motivoAutomatico, transicaoValida } from '@/shared/utils/status'
import { historicoParaPerfil, mensagemVisivel, visivelPara } from '@/shared/utils/visibilidade'
import type { Relogio } from '@/shared/utils/relogio'
import type { Db } from './db'
import { erro, respostaErro } from './erros'

/** Login sem senha: o "e-mail" com o código nunca sai daqui, então o código de todos é este. */
export const CODIGO_DEMO = '123456'
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Curinga de origem: em msw/node não há document.baseURI, e caminho relativo não casaria com http://localhost/api. */
export const BASE = '*/api'

interface Deps { db: Db; relogio: Relogio }

const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

/** Spec §5.3: média por padrão; alta para acesso e rede. */
export function prioridadePara(nomeCategoria: string): Prioridade {
  return nomeCategoria === 'Acesso e senhas' || nomeCategoria === 'Rede e VPN' ? 'alta' : 'media'
}

export function criarHandlers({ db, relogio }: Deps): HttpHandler[] {
  const usuarioDa = (req: Request): Usuario => {
    const id = req.headers.get('X-Usuario-Id')
    const u = id ? db.estado().usuarios[id] : undefined
    if (!u) throw erro('nao_autenticado', 'Entre para continuar')
    return u
  }
  const chamadoVisivel = (u: Usuario, id: string): Chamado => {
    const c = db.estado().chamados[id]
    if (!c) throw erro('nao_encontrado', 'Chamado não encontrado')
    if (!visivelPara(u, c)) throw erro('sem_permissao', 'Você não tem acesso a este chamado')
    return c
  }
  const corpo = async <T>(req: Request): Promise<Partial<T>> => {
    try { return (await req.json()) as Partial<T> } catch { throw erro('validacao', 'Corpo inválido') }
  }
  const evento = <E extends Evento>(tipo: E['tipo'], payload: E['payload']): Evento =>
    ({ id: uuid(), tipo, ocorrido_em: relogio.agoraIso(), payload }) as Evento
  const nomeDe = (id: string | null) => (id && db.estado().usuarios[id]?.nome) || 'alguém'

  type Params = Record<string, string | readonly string[] | undefined> // = PathParams do MSW
  const tentar = (fn: (req: Request, params: Params) => Promise<Response> | Response) =>
    async ({ request, params }: { request: Request; params: Params }) => {
      try { return await fn(request, params) } catch (e) { return respostaErro(e) }
    }
  const idDe = (params: Params) => String(params.id)

  return [
    // Responde igual exista ou não o usuário: não dá para descobrir quem tem conta pedindo código.
    http.post(`${BASE}/auth/codigo`, tentar(async (req) => {
      const { email } = await corpo<{ email: string }>(req)
      if (!EMAIL_VALIDO.test(String(email ?? '').trim())) throw erro('validacao', 'Digite um e-mail válido')
      return HttpResponse.json({ ok: true })
    })),
    http.post(`${BASE}/auth/entrar`, tentar(async (req) => {
      // `pin` continua aceito: é o nome antigo do mesmo campo.
      const { email, codigo, pin } = await corpo<{ email: string; codigo: string; pin: string }>(req)
      const u = Object.values(db.estado().usuarios).find((u) => u.email.toLowerCase() === String(email ?? '').trim().toLowerCase())
      if (!u || (codigo ?? pin) !== CODIGO_DEMO) throw erro('nao_autenticado', 'Código incorreto. Confira e tente de novo.')
      return HttpResponse.json(u)
    })),

    http.get(`${BASE}/usuarios`, tentar((req) => { usuarioDa(req); return HttpResponse.json(Object.values(db.estado().usuarios)) })),
    http.get(`${BASE}/grupos`, tentar((req) => { usuarioDa(req); return HttpResponse.json(db.lookups().grupos) })),
    http.get(`${BASE}/categorias`, tentar((req) => { usuarioDa(req); return HttpResponse.json(db.lookups().categorias) })),
    http.get(`${BASE}/sla`, tentar((req) => { usuarioDa(req); return HttpResponse.json(db.lookups().sla) })),
    http.get(`${BASE}/meta`, tentar(() => HttpResponse.json(db.lookups().meta))),

    http.get(`${BASE}/chamados`, tentar((req) => {
      const u = usuarioDa(req)
      return HttpResponse.json(Object.values(db.estado().chamados).filter((c) => visivelPara(u, c)))
    })),

    http.get(`${BASE}/chamados/:id`, tentar((req, params) => {
      const u = usuarioDa(req)
      const c = chamadoVisivel(u, idDe(params))
      const s = db.estado()
      return HttpResponse.json({
        chamado: c,
        mensagens: (s.mensagens[c.id] ?? []).filter((m) => mensagemVisivel(u, m)),
        historico: historicoParaPerfil(u, s.historico.filter((h) => h.chamado_id === c.id)),
      })
    })),

    http.get(`${BASE}/historico`, tentar((req) => {
      const u = usuarioDa(req)
      if (u.perfil === 'cliente') throw erro('sem_permissao', 'Histórico consolidado é só da equipe')
      const s = db.estado()
      return HttpResponse.json(s.historico.filter((h) => { const c = s.chamados[h.chamado_id]; return c && visivelPara(u, c) }))
    })),

    // A lista de chamados não traz mensagens; a fila precisa saber só quem falou por último com o cliente ("respondeu").
    http.get(`${BASE}/mensagens/ultimas`, tentar((req) => {
      const u = usuarioDa(req)
      const s = db.estado()
      const r: UltimaMensagem[] = []
      for (const c of Object.values(s.chamados)) {
        if (!visivelPara(u, c)) continue
        const ultima = (s.mensagens[c.id] ?? []).findLast((m) => m.interna !== true) // lista em ordem cronológica
        if (ultima) r.push({ chamado_id: c.id, autor_id: ultima.autor_id, criada_em: ultima.criada_em })
      }
      return HttpResponse.json(r)
    })),

    http.post(`${BASE}/chamados`, tentar(async (req) => {
      const u = usuarioDa(req)
      if (u.perfil !== 'cliente') throw erro('sem_permissao', 'Só o cliente abre chamado')
      const b = await corpo<{ titulo: string; descricao: string; categoria_id: string }>(req)
      const titulo = String(b.titulo ?? '').trim(), descricao = String(b.descricao ?? '').trim()
      if (!titulo) throw erro('validacao', 'Informe um título')
      if (!descricao) throw erro('validacao', 'Descreva o problema')
      const cat = db.lookups().categorias.find((c) => c.id === b.categoria_id)
      if (!cat) throw erro('validacao', 'Escolha o que parou')
      const agora = relogio.agoraIso()
      const prioridade = prioridadePara(cat.nome)
      const chamado: Chamado = {
        id: uuid(), numero: db.proximoNumero(), titulo, descricao, categoria_id: cat.id, grupo_id: cat.grupo_id, prioridade,
        status: 'aberto', solicitante_id: u.id, responsavel_id: null, aberto_em: agora, atualizado_em: agora,
        primeira_resposta_em: null, ...calcularPrazos(agora, prioridade, db.lookups().sla),
        sla_pausado: false, resolvido_em: null, fechado_em: null,
      }
      db.emitir([evento('chamado.aberto', chamado)])
      return HttpResponse.json({ id: chamado.id }, { status: 201 })
    })),

    http.post(`${BASE}/chamados/:id/mensagens`, tentar(async (req, params) => {
      const u = usuarioDa(req)
      const c = chamadoVisivel(u, idDe(params))
      const b = await corpo<{ texto: string; interna: boolean }>(req)
      const texto = String(b.texto ?? '').trim()
      if (!texto) throw erro('validacao', 'Escreva a mensagem')
      const interna = b.interna === true
      if (interna && u.perfil === 'cliente') throw erro('validacao', 'Cliente não escreve nota interna')
      const agora = relogio.agoraIso()
      const m: Mensagem = { id: uuid(), chamado_id: c.id, criada_em: agora, autor_id: u.id, texto, interna }
      const eventos: Evento[] = [evento('mensagem.adicionada', m)]
      if (u.perfil === 'cliente' && c.status === 'aguardando_cliente') {
        eventos.push(evento('status.alterado', {
          chamado_id: c.id, de: 'aguardando_cliente', para: 'em_atendimento', motivo: MOTIVO_CLIENTE_RESPONDEU, usuario_id: u.id,
        }))
      }
      db.emitir(eventos)
      return HttpResponse.json({ ok: true }, { status: 201 })
    })),

    http.post(`${BASE}/chamados/:id/atribuir`, tentar(async (req, params) => {
      const u = usuarioDa(req)
      if (u.perfil === 'cliente') throw erro('sem_permissao', 'Cliente não atribui chamado')
      const c = chamadoVisivel(u, idDe(params))
      const { consultor_id } = await corpo<{ consultor_id: string }>(req)
      const consultor = consultor_id ? db.estado().usuarios[consultor_id] : undefined
      if (!consultor || consultor.perfil !== 'consultor') throw erro('validacao', 'Consultor inválido')
      if (consultor.grupo_id !== c.grupo_id) throw erro('sem_permissao', 'Consultor não é do grupo do chamado')
      if (c.status === 'resolvido' || c.status === 'fechado') throw erro('validacao', 'Chamado encerrado não recebe atribuição')
      if (u.perfil === 'consultor') {
        if (consultor.id !== u.id) throw erro('sem_permissao', 'Consultor só pega chamado para si')
        // janela de corrida entre abas (ms): a validação é contra o db local, já atualizado pelo bus; aceita como limite do fake (spec §6.3)
        if (c.responsavel_id) throw erro('conflito', `${nomeDe(c.responsavel_id)} pegou antes de você`)
      }
      const eventos: Evento[] = [evento('chamado.atribuido', { chamado_id: c.id, consultor_id: consultor.id })]
      if (c.status === 'aberto') {
        const motivo = u.perfil === 'gestor' ? motivoAtribuidoPor(u.nome) : MOTIVO_PEGOU
        eventos.push({
          ...evento('status.alterado', { chamado_id: c.id, de: 'aberto', para: 'em_atendimento', motivo, usuario_id: u.id }),
          ocorrido_em: eventos[0]!.ocorrido_em,
        })
      }
      db.emitir(eventos)
      return HttpResponse.json({ ok: true })
    })),

    http.post(`${BASE}/chamados/:id/status`, tentar(async (req, params) => {
      const u = usuarioDa(req)
      const c = chamadoVisivel(u, idDe(params))
      const b = await corpo<{ para: Status; motivo?: string }>(req)
      const para = b.para as Status
      if (!para || !transicaoValida(c.status, para, u.perfil)) throw erro('validacao', `Não é possível ir de ${c.status} para ${String(para)}`)
      const motivo = motivoAutomatico(c.status, para, u.perfil) ?? String(b.motivo ?? '').trim()
      if (!motivo) throw erro('validacao', 'Informe o motivo')
      db.emitir([evento('status.alterado', { chamado_id: c.id, de: c.status, para, motivo, usuario_id: u.id })])
      return HttpResponse.json({ ok: true })
    })),
  ]
}
