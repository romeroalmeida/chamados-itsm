// @vitest-environment node
import { setupServer } from 'msw/node'
import { criarHandlers, CODIGO_DEMO } from './handlers'
import { criarDb, type Db } from './db'
import { criarBus } from './bus'
import { criarEventLog } from './eventLog'
import { criarRelogio } from '@/shared/utils/relogio'
import { DADOS, HELENA, MARINA, RICARDO } from '@/tests/fixtures/dados'
import type { Evento, Usuario } from '@/shared/types'

function storageMemoria(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size }, key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k), clear: () => m.clear(),
  }
}

let db: Db
let emitidos: Evento[]
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

beforeEach(async () => {
  const storage = storageMemoria()
  const bus = criarBus({ Canal: undefined })
  emitidos = []
  bus.assinar((e) => emitidos.push(e))
  const relogio = criarRelogio(storage)
  relogio.iniciar(DADOS.meta.agora)
  db = await criarDb({ bus, log: criarEventLog(storage), carregar: async () => DADOS })
  server.resetHandlers(...criarHandlers({ db, relogio }))
})

const como = (u: Usuario) => ({ 'X-Usuario-Id': u.id, 'Content-Type': 'application/json' })
const post = (url: string, corpo: unknown, u: Usuario) => fetch(`http://localhost/api${url}`, { method: 'POST', headers: como(u), body: JSON.stringify(corpo) })
const get = (url: string, u: Usuario) => fetch(`http://localhost/api${url}`, { headers: como(u) })
const grupoMarina = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
const semDono = () => Object.values(db.estado().chamados).find((c) => c.status === 'aberto' && c.grupo_id === grupoMarina)!

describe('auth', () => {
  const semSessao = (url: string, corpo: unknown) => fetch(`http://localhost/api${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  it('pedir código: ok para qualquer e-mail válido, exista ou não', async () => {
    for (const email of [MARINA.email, 'ninguem@nada.example']) {
      const r = await semSessao('/auth/codigo', { email })
      expect(r.status).toBe(200)
      expect(await r.json()).toEqual({ ok: true })
    }
  })
  it('pedir código com e-mail inválido dá 400', async () => {
    expect((await semSessao('/auth/codigo', { email: 'marina' })).status).toBe(400)
  })
  it('entra com e-mail e código', async () => {
    const r = await semSessao('/auth/entrar', { email: MARINA.email, codigo: CODIGO_DEMO })
    expect(r.status).toBe(200)
    expect((await r.json()).id).toBe(MARINA.id)
  })
  it('ainda aceita o campo antigo pin', async () => {
    expect((await semSessao('/auth/entrar', { email: MARINA.email, pin: CODIGO_DEMO })).status).toBe(200)
  })
  it('código errado ou e-mail desconhecido dá 401', async () => {
    expect((await semSessao('/auth/entrar', { email: MARINA.email, codigo: '000000' })).status).toBe(401)
    expect((await semSessao('/auth/entrar', { email: 'ninguem@nada.example', codigo: CODIGO_DEMO })).status).toBe(401)
  })
  it('sem X-Usuario-Id dá 401', async () => {
    const r = await fetch('http://localhost/api/chamados')
    expect(r.status).toBe(401)
  })
})

describe('GET /chamados e /chamados/:id', () => {
  it('cliente só vê os próprios, sem mensagem interna, histórico sem motivo', async () => {
    const lista = await (await get('/chamados', HELENA)).json()
    expect(lista.every((c: { solicitante_id: string }) => c.solicitante_id === HELENA.id)).toBe(true)
    const comInterna = DADOS.mensagens.find((m) => m.interna && DADOS.chamados.find((c) => c.id === m.chamado_id)!.solicitante_id === HELENA.id)
    if (comInterna) {
      const det = await (await get(`/chamados/${comInterna.chamado_id}`, HELENA)).json()
      expect(det.mensagens.some((m: { interna: boolean | null }) => m.interna)).toBe(false)
      expect(det.historico.every((h: { tipo: string; motivo: null }) => h.tipo === 'status' && h.motivo === null)).toBe(true)
    }
  })
  it('consultor vê o grupo e os chamados de que é responsável; outro grupo é 403', async () => {
    const lista = await (await get('/chamados', MARINA)).json()
    expect(lista.every((c: { grupo_id: string; responsavel_id: string | null }) => c.grupo_id === grupoMarina || c.responsavel_id === MARINA.id)).toBe(true)
    expect(lista.some((c: { numero: number }) => c.numero === 10608)).toBe(true) // dela, mas do grupo Aplicações
    const outro = DADOS.chamados.find((c) => c.grupo_id !== grupoMarina && c.responsavel_id !== MARINA.id)!
    expect((await get(`/chamados/${outro.id}`, MARINA)).status).toBe(403)
  })
  it('gestor vê tudo e GET /historico; cliente em /historico é 403', async () => {
    expect((await (await get('/chamados', RICARDO)).json()).length).toBe(620)
    expect((await get('/historico', RICARDO)).status).toBe(200)
    expect((await get('/historico', HELENA)).status).toBe(403)
  })
  it('id inexistente é 404', async () => {
    expect((await get('/chamados/nao-existe', RICARDO)).status).toBe(404)
  })
})

describe('GET /mensagens/ultimas', () => {
  type Ultima = { chamado_id: string; autor_id: string; criada_em: string }
  it('uma entrada por chamado visível, com a última mensagem não interna', async () => {
    const r: Ultima[] = await (await get('/mensagens/ultimas', MARINA)).json()
    const doGrupo = new Set(DADOS.chamados.filter((c) => c.grupo_id === grupoMarina || c.responsavel_id === MARINA.id).map((c) => c.id))
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((u) => doGrupo.has(u.chamado_id))).toBe(true)
    const c10611 = DADOS.chamados.find((c) => c.numero === 10611)!
    const esperada = DADOS.mensagens.filter((m) => m.chamado_id === c10611.id && m.interna !== true).sort((a, b) => a.criada_em.localeCompare(b.criada_em)).at(-1)!
    expect(r.find((u) => u.chamado_id === c10611.id)).toEqual({ chamado_id: c10611.id, autor_id: esperada.autor_id, criada_em: esperada.criada_em })
  })
  it('nota interna nova não muda a última; resposta ao cliente muda', async () => {
    const c = Object.values(db.estado().chamados).find((x) => x.responsavel_id === MARINA.id && x.status === 'em_atendimento')!
    const antes = ((await (await get('/mensagens/ultimas', MARINA)).json()) as Ultima[]).find((u) => u.chamado_id === c.id)
    await post(`/chamados/${c.id}/mensagens`, { texto: 'só para a equipe', interna: true }, MARINA)
    expect(((await (await get('/mensagens/ultimas', MARINA)).json()) as Ultima[]).find((u) => u.chamado_id === c.id)).toEqual(antes)
    await post(`/chamados/${c.id}/mensagens`, { texto: 'olá', interna: false }, MARINA)
    expect(((await (await get('/mensagens/ultimas', MARINA)).json()) as Ultima[]).find((u) => u.chamado_id === c.id)!.autor_id).toBe(MARINA.id)
  })
  it('cliente só recebe os próprios chamados', async () => {
    const r: Ultima[] = await (await get('/mensagens/ultimas', HELENA)).json()
    const dela = new Set(DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id).map((c) => c.id))
    expect(r.every((u) => dela.has(u.chamado_id))).toBe(true)
  })
})

describe('POST /chamados', () => {
  it('cliente abre; servidor preenche número, grupo, prazos; emite chamado.aberto', async () => {
    const cat = DADOS.categorias.find((c) => c.nome === 'Rede e VPN')!
    const r = await post('/chamados', { titulo: 'VPN caiu', descricao: 'desde cedo', categoria_id: cat.id }, HELENA)
    expect(r.status).toBe(201)
    const { id } = await r.json()
    const c = db.estado().chamados[id]!
    expect(c).toMatchObject({ numero: 10620 + 1, grupo_id: cat.grupo_id, prioridade: 'alta', status: 'aberto', solicitante_id: HELENA.id, responsavel_id: null, sla_pausado: false })
    // relógio virtual anda em tempo real entre iniciar() e o fetch: aceitar até 10 s
    const desvio = Date.parse(c.aberto_em) - Date.parse(DADOS.meta.agora)
    expect(desvio).toBeGreaterThanOrEqual(0); expect(desvio).toBeLessThan(10_000)
    expect(Date.parse(c.prazo_primeira_resposta) - Date.parse(c.aberto_em)).toBe(2 * 3_600_000)
    expect(emitidos.map((e) => e.tipo)).toEqual(['chamado.aberto'])
  })
  it('consultor e gestor não abrem (403); título vazio é 400', async () => {
    const cat = DADOS.categorias[0]!
    expect((await post('/chamados', { titulo: 'x', descricao: 'y', categoria_id: cat.id }, MARINA)).status).toBe(403)
    expect((await post('/chamados', { titulo: '', descricao: 'y', categoria_id: cat.id }, HELENA)).status).toBe(400)
  })
})

describe('POST /chamados/:id/atribuir', () => {
  it('consultor pega chamado aberto: dois eventos, status muda, motivo automático', async () => {
    const c = semDono()
    const r = await post(`/chamados/${c.id}/atribuir`, { consultor_id: MARINA.id }, MARINA)
    expect(r.status).toBe(200)
    expect(emitidos.map((e) => e.tipo)).toEqual(['chamado.atribuido', 'status.alterado'])
    const st = emitidos[1]!
    if (st.tipo === 'status.alterado') expect(st.payload).toMatchObject({ de: 'aberto', para: 'em_atendimento', motivo: 'Assumido para atendimento', usuario_id: MARINA.id })
    expect(emitidos[0]!.ocorrido_em).toBe(emitidos[1]!.ocorrido_em)
    expect(db.estado().chamados[c.id]).toMatchObject({ status: 'em_atendimento', responsavel_id: MARINA.id })
  })
  it('já tem dono: 409 com o nome de quem pegou', async () => {
    const c = semDono()
    await post(`/chamados/${c.id}/atribuir`, { consultor_id: MARINA.id }, MARINA)
    const outro = DADOS.usuarios.find((u) => u.perfil === 'consultor' && u.id !== MARINA.id && u.grupo_id === grupoMarina)!
    const r = await post(`/chamados/${c.id}/atribuir`, { consultor_id: outro.id }, outro)
    expect(r.status).toBe(409)
    expect((await r.json()).mensagem).toContain('Marina Almeida')
  })
  it('consultor não atribui a outro (403); gestor redistribui em_atendimento com um evento só', async () => {
    const c = semDono()
    const outro = DADOS.usuarios.find((u) => u.perfil === 'consultor' && u.id !== MARINA.id && u.grupo_id === grupoMarina)!
    expect((await post(`/chamados/${c.id}/atribuir`, { consultor_id: outro.id }, MARINA)).status).toBe(403)
    await post(`/chamados/${c.id}/atribuir`, { consultor_id: MARINA.id }, MARINA)
    emitidos.length = 0
    const r = await post(`/chamados/${c.id}/atribuir`, { consultor_id: outro.id }, RICARDO)
    expect(r.status).toBe(200)
    expect(emitidos.map((e) => e.tipo)).toEqual(['chamado.atribuido'])
    expect(db.estado().chamados[c.id]!.responsavel_id).toBe(outro.id)
  })
  it('gestor atribuindo aberto gera motivo "Atribuído por"', async () => {
    const c = semDono()
    await post(`/chamados/${c.id}/atribuir`, { consultor_id: MARINA.id }, RICARDO)
    const st = emitidos[1]!
    if (st.tipo === 'status.alterado') expect(st.payload.motivo).toBe(`Atribuído por ${RICARDO.nome}`)
  })
  it('consultor de outro grupo ou chamado encerrado: 403 / 400', async () => {
    const c = semDono()
    const deOutroGrupo = DADOS.usuarios.find((u) => u.perfil === 'consultor' && u.grupo_id !== grupoMarina)!
    expect((await post(`/chamados/${c.id}/atribuir`, { consultor_id: deOutroGrupo.id }, deOutroGrupo)).status).toBe(403)
    const fechado = Object.values(db.estado().chamados).find((c) => c.status === 'fechado')!
    expect((await post(`/chamados/${fechado.id}/atribuir`, { consultor_id: MARINA.id }, RICARDO)).status).toBe(400)
  })
})

describe('POST /chamados/:id/mensagens', () => {
  it('consultor responde no chamado dela; nota interna é permitida', async () => {
    const c = Object.values(db.estado().chamados).find((c) => c.responsavel_id === MARINA.id && c.status === 'em_atendimento')!
    const r = await post(`/chamados/${c.id}/mensagens`, { texto: 'Olá', interna: false }, MARINA)
    expect(r.status).toBe(201)
    expect(emitidos.map((e) => e.tipo)).toEqual(['mensagem.adicionada'])
    expect((await post(`/chamados/${c.id}/mensagens`, { texto: 'nota', interna: true }, MARINA)).status).toBe(201)
  })
  it('cliente respondendo em aguardando_cliente gera também status.alterado automático', async () => {
    const c = Object.values(db.estado().chamados).find((c) => c.status === 'aguardando_cliente')!
    const cliente = DADOS.usuarios.find((u) => u.id === c.solicitante_id)!
    const r = await post(`/chamados/${c.id}/mensagens`, { texto: 'Segue o log', interna: false }, cliente)
    expect(r.status).toBe(201)
    expect(emitidos.map((e) => e.tipo)).toEqual(['mensagem.adicionada', 'status.alterado'])
    const st = emitidos[1]!
    if (st.tipo === 'status.alterado') expect(st.payload).toMatchObject({ de: 'aguardando_cliente', para: 'em_atendimento', motivo: 'Cliente respondeu', usuario_id: cliente.id })
    expect(db.estado().chamados[c.id]!.sla_pausado).toBe(false)
  })
  it('cliente não manda nota interna (400); texto vazio (400); chamado de outro (403)', async () => {
    const meu = DADOS.chamados.find((c) => c.solicitante_id === HELENA.id)!
    expect((await post(`/chamados/${meu.id}/mensagens`, { texto: 'x', interna: true }, HELENA)).status).toBe(400)
    expect((await post(`/chamados/${meu.id}/mensagens`, { texto: '  ', interna: false }, HELENA)).status).toBe(400)
    const outro = DADOS.chamados.find((c) => c.solicitante_id !== HELENA.id)!
    expect((await post(`/chamados/${outro.id}/mensagens`, { texto: 'x', interna: false }, HELENA)).status).toBe(403)
  })
})

describe('POST /chamados/:id/status', () => {
  it('transição válida com motivo', async () => {
    const c = Object.values(db.estado().chamados).find((c) => c.responsavel_id === MARINA.id && c.status === 'em_atendimento')!
    const r = await post(`/chamados/${c.id}/status`, { para: 'resolvido', motivo: 'Reinstalado' }, MARINA)
    expect(r.status).toBe(200)
    expect(db.estado().chamados[c.id]!.status).toBe('resolvido')
  })
  it('motivo vazio em transição manual: 400; cliente confirmando resolvido: motivo automático', async () => {
    const c = Object.values(db.estado().chamados).find((c) => c.responsavel_id === MARINA.id && c.status === 'em_atendimento')!
    expect((await post(`/chamados/${c.id}/status`, { para: 'resolvido', motivo: '' }, MARINA)).status).toBe(400)
    const resolvido = Object.values(db.estado().chamados).find((c) => c.status === 'resolvido')!
    const cliente = DADOS.usuarios.find((u) => u.id === resolvido.solicitante_id)!
    const r = await post(`/chamados/${resolvido.id}/status`, { para: 'fechado' }, cliente)
    expect(r.status).toBe(200)
    const st = emitidos.at(-1)!
    if (st.tipo === 'status.alterado') expect(st.payload.motivo).toBe('Confirmado pelo cliente')
  })
  it('transição inválida (400) e reabertura de fechado por cliente (200)', async () => {
    const fechado = Object.values(db.estado().chamados).find((c) => c.status === 'fechado')!
    const cliente = DADOS.usuarios.find((u) => u.id === fechado.solicitante_id)!
    expect((await post(`/chamados/${fechado.id}/status`, { para: 'resolvido', motivo: 'x' }, cliente)).status).toBe(400)
    expect((await post(`/chamados/${fechado.id}/status`, { para: 'em_atendimento', motivo: 'Voltou a acontecer' }, cliente)).status).toBe(200)
    expect(db.estado().chamados[fechado.id]!.status).toBe('em_atendimento')
  })
})
