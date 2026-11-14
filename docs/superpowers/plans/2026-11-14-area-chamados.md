# Área de chamados (ITSM) — plano de implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Área de chamados de um ITSM em React, vista por consultora, gestor e cliente, com API e WebSocket simulados no navegador e atualização em tempo real entre abas.

**Architecture:** Um `reducer` puro aplica os 4 eventos do enunciado sobre um `Estado`; o mesmo reducer roda no "servidor" fake (`mock-server/`, MSW + `BroadcastChannel` + log em `localStorage`) e no cliente (`api/realtime.ts`, que projeta o estado para os caches do TanStack Query). Handlers HTTP validam e emitem eventos; a tela só muda quando o evento chega. Feature-first (`features/auth`, `features/chamados`, `features/equipe`), com o comum em `shared/` e `api/`.

**Tech Stack:** React 19.3, Vite 8.3, TypeScript 5.9, TanStack Query 5, @tanstack/react-virtual 3, Zustand 5, React Router 7.18 (modo declarativo), MSW 2.15, Radix UI primitives, CSS Modules, Vitest 4.1 + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-13-area-chamados-design.md` (referido como "spec §N").

**Regras do repositório:**
- Commits **só com o nome do Romero**. Nunca `Co-Authored-By`. Mensagens em pt-BR, imperativo, prefixo `feat:`/`test:`/`docs:`/`chore:`.
- Rodar `pnpm test` e `pnpm typecheck` antes de todo commit que toque `src/`.
- Textos de UI em pt-BR, sem travessão.
- `material/` nunca é alterado.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/types/dominio.ts` | tipos do `dados.json`: `Chamado`, `Mensagem`, `Historico`, `Usuario` (união), `Grupo`, `Categoria`, `Sla`, `Dados` |
| `src/shared/types/evento.ts` | os 4 eventos do enunciado |
| `src/shared/utils/relogio.ts` | relógio virtual: `agora()`, velocidade, reset (spec §4.5) |
| `src/shared/utils/sla.ts` | `prazoRelevante`, `faixaSla`, `faixaMudou`, `calcularPrazos`, `ordenarEstouraPrimeiro` (spec §6.2) |
| `src/shared/utils/status.ts` | tabela de transições e motivos automáticos (spec §6.1) |
| `src/shared/utils/visibilidade.ts` | `visivelPara`, `mensagemVisivel`, `historicoParaPerfil` (spec §7) |
| `src/shared/utils/reducer.ts` | `Estado`, `criarEstado`, `aplicar` (spec §4.6) |
| `src/shared/utils/similaridade.ts` | sugestão de chamado parecido (spec §6.4) |
| `src/shared/utils/equipe.ts` | agregados por consultor e tempo ocioso (spec §5.2, §6.5) |
| `src/shared/utils/datas.ts` | formatação com `Intl` no fuso/locale do usuário |
| `src/mock-server/eventLog.ts` | uma chave por evento em `Storage` (spec §4.3) |
| `src/mock-server/bus.ts` | `BroadcastChannel` + assinantes locais + fallback `storage` + duplicação proposital |
| `src/mock-server/db.ts` | `dados.json` + replay do log; assina o bus; `emitir` |
| `src/mock-server/handlers.ts` | rotas MSW (spec §4.1) |
| `src/mock-server/socket.ts` | emissor filtrado por visibilidade (spec §4.3 passo 4) |
| `src/mock-server/simulator.ts` | movimento de fundo em uma aba (spec §4.4) |
| `src/mock-server/index.ts` | `iniciarMockServer()` chamado em `main.tsx` |
| `src/mock-server/dados.json` | cópia de `material/dados.json`, carregada por `import()` |
| `src/state/sessao.ts` | Zustand + `sessionStorage` (spec §4.1) |
| `src/api/apiClient.ts` | `fetch` tipado, `ApiError` |
| `src/api/queries/*.ts` | hooks TanStack Query |
| `src/api/realtime.ts` | espelho, hidratação, projeção (spec §4.6) |
| `src/app/*` | providers, rotas, layout |
| `src/features/auth/*` | login |
| `src/features/chamados/*` | detalhe compartilhado, fila da consultora, telas do cliente |
| `src/features/equipe/*` | painel do gestor |
| `src/shared/components/*` | Button, Badge, Dialog, Select, Toast, Tabs, ListaVirtual |
| `src/shared/hooks/*` | `useNow`, `useUltimaVisita` |

---

## Chunk 1: Núcleo sem tela

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `vitest.config.ts`, `src/tests/setup.ts`, `.nvmrc`, `.gitignore`, árvore de pastas

- [ ] **Step 1: Criar o projeto Vite na pasta do repositório**

Na raiz `~/Romero/projetos/chamados-itsm` (já tem `.git`, `docs/`, `material/`):

```bash
cd ~/Romero/projetos/chamados-itsm
pnpm create vite@latest . --template react-ts
```
Quando perguntar sobre a pasta não vazia, escolher "Ignore files and continue". Se o template vier com `README.md`, `src/App.css`, `src/assets/react.svg`, `public/vite.svg`, apagar: `rm -f README.md src/App.css src/assets/react.svg public/vite.svg src/index.css`.

- [ ] **Step 2: Fixar versões e instalar dependências**

```bash
echo 24 > .nvmrc
pnpm add react@^19.3.0 react-dom@^19.3.0 react-router@^7.18.0 @tanstack/react-query@^5.107.0 @tanstack/react-virtual@^3.14.0 zustand@^5.1.0 @radix-ui/react-dialog@^1.3.0 @radix-ui/react-select@^2.4.0 @radix-ui/react-tooltip@^1.4.0 @radix-ui/react-toast@^1.3.0 @radix-ui/react-tabs@^1.2.0
pnpm add -D vite@^8.3.0 @vitejs/plugin-react@^6.3.0 typescript@~5.9.0 @types/react@^19.3.0 @types/react-dom@^19.3.0 @types/node@^24 msw@^2.15.0 vitest@^4.1.0 jsdom@^31 @testing-library/react@^16.3.0 @testing-library/user-event@^14.6.0 @testing-library/jest-dom@^7.0.0
```

- [ ] **Step 3: Configurar Vite, TypeScript e Vitest**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
```

`src/tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  // handlers.test.ts roda em ambiente node, sem Storage
  globalThis.localStorage?.clear()
  globalThis.sessionStorage?.clear()
})
```

Em `tsconfig.app.json`, dentro de `compilerOptions`, garantir:
```json
"strict": true,
"noUncheckedIndexedAccess": true,
"paths": { "@/*": ["./src/*"] },
"lib": ["ES2023", "DOM", "DOM.Iterable"],
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
"resolveJsonModule": true
```
Em `package.json`, scripts:
```json
"dev": "vite",
"build": "tsc -b && vite build",
"preview": "vite preview",
"typecheck": "tsc -b --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Criar a árvore de pastas com o script da skill**

```bash
bash ~/.claude/skills/front-architecture/scripts/scaffold.sh --api --state --tests auth chamados equipe
mkdir -p src/mock-server src/tests/fixtures
cp material/dados.json src/mock-server/dados.json
```

- [ ] **Step 5: Smoke test para provar que Vitest roda**

`src/tests/smoke.test.ts`:
```ts
describe('ambiente', () => {
  it('tem localStorage no jsdom', () => {
    localStorage.setItem('x', '1')
    expect(localStorage.getItem('x')).toBe('1')
  })
})
```
Run: `pnpm test`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React 19 + Vitest, árvore feature-first"
```

---

### Task 2: Tipos do domínio e dos eventos

**Files:**
- Create: `src/shared/types/dominio.ts`, `src/shared/types/evento.ts`, `src/shared/types/index.ts`

- [ ] **Step 1: Escrever os tipos a partir do `dados.json`**

`src/shared/types/dominio.ts`:
```ts
export type Status = 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'resolvido' | 'fechado'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica'
export type Perfil = 'cliente' | 'consultor' | 'gestor'

export const STATUS: readonly Status[] = ['aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado']
export const PRIORIDADES: readonly Prioridade[] = ['baixa', 'media', 'alta', 'critica']

interface UsuarioBase {
  id: string
  nome: string
  email: string
  locale: string
  zoneinfo: string
}
export type UsuarioCliente = UsuarioBase & { perfil: 'cliente'; empresa: string }
export type UsuarioConsultor = UsuarioBase & { perfil: 'consultor'; grupo_id: string }
export type UsuarioGestor = UsuarioBase & { perfil: 'gestor'; grupos_ids: string[] }
export type Usuario = UsuarioCliente | UsuarioConsultor | UsuarioGestor

export interface Grupo { id: string; nome: string; gestor_id: string }
export interface Categoria { id: string; nome: string; grupo_id: string }
export interface Sla { prioridade: Prioridade; primeira_resposta_horas: number; resolucao_horas: number }

export interface Chamado {
  id: string
  numero: number
  titulo: string
  descricao: string
  categoria_id: string
  grupo_id: string
  prioridade: Prioridade
  status: Status
  solicitante_id: string
  responsavel_id: string | null
  aberto_em: string
  atualizado_em: string
  primeira_resposta_em: string | null
  prazo_primeira_resposta: string
  prazo_resolucao: string
  sla_pausado: boolean
  resolvido_em: string | null
  fechado_em: string | null
}

export interface Mensagem {
  id: string
  chamado_id: string
  criada_em: string
  autor_id: string
  texto: string
  interna: boolean | null
}

export interface Historico {
  id: string
  chamado_id: string
  tipo: 'status' | 'atribuicao'
  de: Status | null
  para: Status | null
  usuario_id: string
  motivo: string | null
  ocorrido_em: string
}

export interface Meta {
  tenant: string
  gerado_em: string
  agora: string
  observacao: string
  status_possiveis: Status[]
  prioridades: Prioridade[]
}

export interface Dados {
  meta: Meta
  grupos: Grupo[]
  categorias: Categoria[]
  sla: Sla[]
  usuarios: Usuario[]
  chamados: Chamado[]
  mensagens: Mensagem[]
  historico: Historico[]
}

/** Grupos que o usuário enxerga: consultor o seu, gestor os que gere, cliente nenhum. */
export function gruposDo(usuario: Usuario): string[] {
  if (usuario.perfil === 'consultor') return [usuario.grupo_id]
  if (usuario.perfil === 'gestor') return usuario.grupos_ids
  return []
}
```

`src/shared/types/evento.ts`:
```ts
import type { Chamado, Mensagem, Status } from './dominio'

interface EventoBase { id: string; ocorrido_em: string }

export type EventoChamadoAberto = EventoBase & { tipo: 'chamado.aberto'; payload: Chamado }
export type EventoChamadoAtribuido = EventoBase & {
  tipo: 'chamado.atribuido'
  payload: { chamado_id: string; consultor_id: string }
}
export type EventoMensagemAdicionada = EventoBase & { tipo: 'mensagem.adicionada'; payload: Mensagem }
export type EventoStatusAlterado = EventoBase & {
  tipo: 'status.alterado'
  payload: { chamado_id: string; de: Status; para: Status; motivo: string; usuario_id: string }
}

export type Evento =
  | EventoChamadoAberto
  | EventoChamadoAtribuido
  | EventoMensagemAdicionada
  | EventoStatusAlterado

export type TipoEvento = Evento['tipo']
export const TIPOS_EVENTO: readonly TipoEvento[] = ['chamado.aberto', 'chamado.atribuido', 'mensagem.adicionada', 'status.alterado']

export function ehEvento(x: unknown): x is Evento {
  if (!x || typeof x !== 'object') return false
  const e = x as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.ocorrido_em === 'string'
    && TIPOS_EVENTO.includes(e.tipo as TipoEvento) && typeof e.payload === 'object' && e.payload !== null
}

export function chamadoIdDe(e: Evento): string {
  return e.tipo === 'chamado.aberto' ? e.payload.id : e.payload.chamado_id
}
```

`src/shared/types/index.ts`:
```ts
export * from './dominio'
export * from './evento'
```

- [ ] **Step 2: Teste de tipagem contra o arquivo real**

`src/tests/fixtures/dados.ts` (recorte reutilizável; o arquivo completo também é usado em alguns testes):
```ts
import type { Dados } from '@/shared/types'
import dadosCompletos from '@/mock-server/dados.json'

export const DADOS = dadosCompletos as unknown as Dados
export const AGORA_ISO = DADOS.meta.agora
export const AGORA_MS = Date.parse(AGORA_ISO)

export const MARINA = DADOS.usuarios.find((u) => u.nome === 'Marina Almeida')!
export const RICARDO = DADOS.usuarios.find((u) => u.perfil === 'gestor')!
export const HELENA = DADOS.usuarios.find((u) => u.nome === 'Helena Fernandes')!

export function chamadoPorNumero(numero: number) {
  return DADOS.chamados.find((c) => c.numero === numero)!
}
```

`src/shared/types/dominio.test.ts`:
```ts
import { DADOS, MARINA, HELENA, RICARDO } from '@/tests/fixtures/dados'
import { gruposDo } from './dominio'

describe('tipos do domínio x dados.json', () => {
  it('reconhece os três perfis como união discriminada', () => {
    expect(MARINA.perfil).toBe('consultor')
    expect(gruposDo(MARINA)).toHaveLength(1)
    expect(gruposDo(RICARDO)).toHaveLength(2)
    expect(gruposDo(HELENA)).toEqual([])
    if (HELENA.perfil === 'cliente') expect(HELENA.empresa).toBe('Lusitânia Seguros')
  })
  it('tem os volumes esperados', () => {
    expect(DADOS.chamados).toHaveLength(620)
    expect(DADOS.mensagens).toHaveLength(3381)
    expect(DADOS.historico).toHaveLength(1558)
  })
})
```
Run: `pnpm test src/shared/types`
Expected: PASS (2 testes)

- [ ] **Step 3: Commit**

```bash
git add src/shared/types src/tests/fixtures
git commit -m "feat: tipos do domínio e dos eventos a partir do dados.json"
```

---

### Task 3: Relógio virtual

**Files:**
- Create: `src/shared/utils/relogio.ts`, `src/shared/utils/relogio.test.ts`

- [ ] **Step 1: Teste**

`src/shared/utils/relogio.test.ts`:
```ts
import { criarRelogio } from './relogio'

const AGORA = '2026-11-03T13:00:00Z'

describe('relógio virtual', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T10:00:00Z')) })
  afterEach(() => vi.useRealTimers())

  it('nasce em meta.agora e anda com o tempo real', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    expect(r.agoraIso()).toBe('2026-11-03T13:00:00.000Z')
    vi.advanceTimersByTime(60_000)
    expect(r.agora()).toBe(Date.parse(AGORA) + 60_000)
  })

  it('não reinicia se já existe relógio gravado', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    vi.advanceTimersByTime(5_000)
    r.iniciar('2000-01-01T00:00:00Z')
    expect(r.agora()).toBe(Date.parse(AGORA) + 5_000)
  })

  it('velocidade acelera sem dar salto', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    vi.advanceTimersByTime(10_000)
    r.definirVelocidade(20)
    expect(r.agora()).toBe(Date.parse(AGORA) + 10_000)
    vi.advanceTimersByTime(60_000)
    expect(r.agora()).toBe(Date.parse(AGORA) + 10_000 + 20 * 60_000)
    expect(r.velocidade()).toBe(20)
  })

  it('lê do storage a cada chamada (outra aba pode ter reancorado)', () => {
    const a = criarRelogio(localStorage)
    const b = criarRelogio(localStorage)
    a.iniciar(AGORA)
    b.definirVelocidade(5)
    vi.advanceTimersByTime(1_000)
    expect(a.agora()).toBe(Date.parse(AGORA) + 5_000)
  })

  it('sem relógio gravado usa o tempo real', () => {
    const r = criarRelogio(localStorage)
    expect(r.agora()).toBe(Date.now())
  })

  it('resetar apaga o relógio', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    r.resetar()
    expect(localStorage.getItem('itsm:relogio')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/shared/utils/relogio`
Expected: FAIL, `criarRelogio` não existe.

- [ ] **Step 3: Implementar**

`src/shared/utils/relogio.ts`:
```ts
export const CHAVE_RELOGIO = 'itsm:relogio'

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
    },
    resetar: () => storage.removeItem(CHAVE_RELOGIO),
  }
}

/** Instância padrão para o app (localStorage do navegador). */
export const relogio: Relogio = criarRelogio(
  typeof localStorage !== 'undefined' ? localStorage : ({ getItem: () => null, setItem() {}, removeItem() {} } as unknown as Storage),
)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/utils/relogio`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/relogio.ts src/shared/utils/relogio.test.ts
git commit -m "feat: relógio virtual a partir de meta.agora, com velocidade"
```

---

### Task 4: SLA

**Files:**
- Create: `src/shared/utils/sla.ts`, `src/shared/utils/sla.test.ts`

- [ ] **Step 1: Teste**

`src/shared/utils/sla.test.ts`:
```ts
import { calcularPrazos, faixaMudou, faixaSla, ordenarEstouraPrimeiro, prazoRelevante, restanteMs } from './sla'
import { AGORA_MS, DADOS } from '@/tests/fixtures/dados'
import type { Chamado } from '@/shared/types'

const H = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()

function chamado(sobrescrever: Partial<Chamado>): Chamado {
  return {
    id: 'c1', numero: 1, titulo: 't', descricao: 'd', categoria_id: 'cat', grupo_id: 'g', prioridade: 'media',
    status: 'em_atendimento', solicitante_id: 's', responsavel_id: 'r',
    aberto_em: iso(AGORA_MS - 2 * H), atualizado_em: iso(AGORA_MS - H),
    primeira_resposta_em: iso(AGORA_MS - H), prazo_primeira_resposta: iso(AGORA_MS + 6 * H), prazo_resolucao: iso(AGORA_MS + 22 * H),
    sla_pausado: false, resolvido_em: null, fechado_em: null, ...sobrescrever,
  }
}

describe('prazoRelevante', () => {
  it('é primeira resposta enquanto não houve resposta', () => {
    const c = chamado({ primeira_resposta_em: null })
    expect(prazoRelevante(c)).toEqual({ tipo: 'primeira_resposta', prazo: c.prazo_primeira_resposta })
  })
  it('é resolução depois da primeira resposta', () => {
    const c = chamado({})
    expect(prazoRelevante(c)).toEqual({ tipo: 'resolucao', prazo: c.prazo_resolucao })
  })
})

describe('faixaSla', () => {
  it('encerrado para resolvido/fechado, mesmo com prazo vencido', () => {
    expect(faixaSla(chamado({ status: 'resolvido', prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe('encerrado')
    expect(faixaSla(chamado({ status: 'fechado' }), AGORA_MS)).toBe('encerrado')
  })
  it('pausado quando sla_pausado', () => {
    expect(faixaSla(chamado({ status: 'aguardando_cliente', sla_pausado: true, prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe('pausado')
  })
  it('faixas por tempo restante', () => {
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS - 1) }), AGORA_MS)).toBe('vencido')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 30 * 60_000) }), AGORA_MS)).toBe('ultima_hora')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 3 * H) }), AGORA_MS)).toBe('critico')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 10 * H) }), AGORA_MS)).toBe('atencao')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 48 * H) }), AGORA_MS)).toBe('ok')
  })
  it('restanteMs é negativo quando venceu', () => {
    expect(restanteMs(chamado({ prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe(-H)
  })
  it('bate com o arquivo: 76 pausados e mais de 100 vencidos pelo prazo relevante em meta.agora', () => {
    const ativos = DADOS.chamados.filter((c) => c.status !== 'resolvido' && c.status !== 'fechado')
    const vencidos = ativos.filter((c) => faixaSla(c, AGORA_MS) === 'vencido')
    const pausados = ativos.filter((c) => faixaSla(c, AGORA_MS) === 'pausado')
    expect(pausados).toHaveLength(76)
    expect(vencidos.length).toBeGreaterThan(100)
  })
})

describe('faixaMudou', () => {
  it('alerta só quando piora para crítico, última hora ou vencido', () => {
    expect(faixaMudou('ok', 'atencao')).toBe(false)
    expect(faixaMudou('atencao', 'critico')).toBe(true)
    expect(faixaMudou('critico', 'ultima_hora')).toBe(true)
    expect(faixaMudou('ultima_hora', 'vencido')).toBe(true)
    expect(faixaMudou('vencido', 'critico')).toBe(false)
    expect(faixaMudou('critico', 'critico')).toBe(false)
    expect(faixaMudou(undefined, 'vencido')).toBe(false)
  })
})

describe('calcularPrazos', () => {
  it('soma as horas da tabela de SLA', () => {
    const p = calcularPrazos(iso(AGORA_MS), 'critica', DADOS.sla)
    expect(p.prazo_primeira_resposta).toBe(iso(AGORA_MS + H))
    expect(p.prazo_resolucao).toBe(iso(AGORA_MS + 4 * H))
  })
})

describe('ordenarEstouraPrimeiro', () => {
  it('vencido, depois por restante, pausado, encerrado', () => {
    const lista = [
      chamado({ id: 'ok', prazo_resolucao: iso(AGORA_MS + 48 * H) }),
      chamado({ id: 'fechado', status: 'fechado', atualizado_em: iso(AGORA_MS - H) }),
      chamado({ id: 'pausado', status: 'aguardando_cliente', sla_pausado: true }),
      chamado({ id: 'critico', prazo_resolucao: iso(AGORA_MS + 2 * H) }),
      chamado({ id: 'vencido', prazo_resolucao: iso(AGORA_MS - H) }),
    ]
    expect(ordenarEstouraPrimeiro(lista, AGORA_MS).map((c) => c.id)).toEqual(['vencido', 'critico', 'ok', 'pausado', 'fechado'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/shared/utils/sla`
Expected: FAIL, módulo não existe.

- [ ] **Step 3: Implementar**

`src/shared/utils/sla.ts`:
```ts
import type { Chamado, Prioridade, Sla } from '@/shared/types'

export type Faixa = 'encerrado' | 'pausado' | 'vencido' | 'ultima_hora' | 'critico' | 'atencao' | 'ok'
export type TipoPrazo = 'primeira_resposta' | 'resolucao'

const HORA = 3_600_000
export const LIMITES = { ultima_hora: HORA, critico: 4 * HORA, atencao: 24 * HORA } as const

export function ehEncerrado(c: Pick<Chamado, 'status'>): boolean {
  return c.status === 'resolvido' || c.status === 'fechado'
}

export function prazoRelevante(c: Chamado): { tipo: TipoPrazo; prazo: string } {
  return c.primeira_resposta_em === null
    ? { tipo: 'primeira_resposta', prazo: c.prazo_primeira_resposta }
    : { tipo: 'resolucao', prazo: c.prazo_resolucao }
}

export function restanteMs(c: Chamado, agoraMs: number): number {
  return Date.parse(prazoRelevante(c).prazo) - agoraMs
}

export function faixaSla(c: Chamado, agoraMs: number): Faixa {
  if (ehEncerrado(c)) return 'encerrado'
  if (c.sla_pausado) return 'pausado'
  const r = restanteMs(c, agoraMs)
  if (r < 0) return 'vencido'
  if (r <= LIMITES.ultima_hora) return 'ultima_hora'
  if (r <= LIMITES.critico) return 'critico'
  if (r <= LIMITES.atencao) return 'atencao'
  return 'ok'
}

const GRAVIDADE: Record<Faixa, number> = { ok: 0, atencao: 1, critico: 2, ultima_hora: 3, vencido: 4, pausado: -1, encerrado: -1 }
const ALERTA: ReadonlySet<Faixa> = new Set(['critico', 'ultima_hora', 'vencido'])

/** Só piora para faixa de alerta merece aviso. */
export function faixaMudou(anterior: Faixa | undefined, atual: Faixa): boolean {
  if (anterior === undefined || anterior === atual) return false
  return ALERTA.has(atual) && GRAVIDADE[atual] > GRAVIDADE[anterior]
}

export function calcularPrazos(abertoEmIso: string, prioridade: Prioridade, tabela: Sla[]) {
  const sla = tabela.find((s) => s.prioridade === prioridade)
  if (!sla) throw new Error(`SLA não definido para prioridade ${prioridade}`)
  const base = Date.parse(abertoEmIso)
  return {
    prazo_primeira_resposta: new Date(base + sla.primeira_resposta_horas * HORA).toISOString(),
    prazo_resolucao: new Date(base + sla.resolucao_horas * HORA).toISOString(),
  }
}

/** Vencidos primeiro, depois menor restante, pausados, encerrados (mais recente primeiro). */
export function ordenarEstouraPrimeiro(chamados: Chamado[], agoraMs: number): Chamado[] {
  const grupo = (c: Chamado) => {
    const f = faixaSla(c, agoraMs)
    if (f === 'encerrado') return 3
    if (f === 'pausado') return 2
    if (f === 'vencido') return 0
    return 1
  }
  return [...chamados].sort((a, b) => {
    const ga = grupo(a), gb = grupo(b)
    if (ga !== gb) return ga - gb
    if (ga === 3) return Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em)
    if (ga === 2) return Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em)
    return restanteMs(a, agoraMs) - restanteMs(b, agoraMs)
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/utils/sla`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/sla.ts src/shared/utils/sla.test.ts
git commit -m "feat: faixas de SLA, prazo relevante e ordenação estoura primeiro"
```

---

### Task 5: Transições de status

**Files:**
- Create: `src/shared/utils/status.ts`, `src/shared/utils/status.test.ts`

- [ ] **Step 1: Teste**

`src/shared/utils/status.test.ts`:
```ts
import { motivoAutomatico, transicaoValida, transicoesPermitidas, ROTULO_STATUS_CLIENTE } from './status'

describe('transições por perfil', () => {
  it('consultor em atendimento: aguardando cliente ou resolvido', () => {
    expect(transicoesPermitidas('em_atendimento', 'consultor').sort()).toEqual(['aguardando_cliente', 'resolvido'])
  })
  it('gestor tem as mesmas do consultor', () => {
    expect(transicoesPermitidas('resolvido', 'gestor').sort()).toEqual(['em_atendimento', 'fechado'])
  })
  it('cliente só confirma ou reabre', () => {
    expect(transicoesPermitidas('resolvido', 'cliente').sort()).toEqual(['em_atendimento', 'fechado'])
    expect(transicoesPermitidas('fechado', 'cliente')).toEqual(['em_atendimento'])
    expect(transicoesPermitidas('em_atendimento', 'cliente')).toEqual([])
  })
  it('aberto -> em_atendimento só via atribuir, nunca por POST /status', () => {
    expect(transicoesPermitidas('aberto', 'consultor')).toEqual([])
    expect(transicaoValida('aberto', 'em_atendimento', 'consultor')).toBe(false)
  })
  it('fechado pode ser reaberto por qualquer perfil', () => {
    for (const p of ['cliente', 'consultor', 'gestor'] as const) expect(transicaoValida('fechado', 'em_atendimento', p)).toBe(true)
  })
})

describe('motivoAutomatico', () => {
  it('cliente confirmando resolução não precisa digitar motivo', () => {
    expect(motivoAutomatico('resolvido', 'fechado', 'cliente')).toBe('Confirmado pelo cliente')
  })
  it('consultor fechando precisa digitar', () => {
    expect(motivoAutomatico('resolvido', 'fechado', 'consultor')).toBeNull()
  })
  it('reabertura sempre exige motivo', () => {
    expect(motivoAutomatico('fechado', 'em_atendimento', 'cliente')).toBeNull()
  })
})

it('rótulos de cliente cobrem todos os status', () => {
  expect(Object.keys(ROTULO_STATUS_CLIENTE)).toHaveLength(5)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/shared/utils/status`
Expected: FAIL

- [ ] **Step 3: Implementar**

`src/shared/utils/status.ts`:
```ts
import type { Perfil, Status } from '@/shared/types'

interface Transicao {
  de: Status
  para: Status
  perfis: readonly Perfil[]
  /** Motivo que o servidor preenche; null = usuário digita. */
  automatico: ((perfil: Perfil) => string | null) | null
}

const EQUIPE: readonly Perfil[] = ['consultor', 'gestor']
const TODOS: readonly Perfil[] = ['cliente', 'consultor', 'gestor']

/** Spec §6.1. `aberto -> em_atendimento` não está aqui: só acontece via POST /atribuir. */
export const TRANSICOES: readonly Transicao[] = [
  { de: 'em_atendimento', para: 'aguardando_cliente', perfis: EQUIPE, automatico: null },
  { de: 'aguardando_cliente', para: 'em_atendimento', perfis: EQUIPE, automatico: null },
  { de: 'em_atendimento', para: 'resolvido', perfis: EQUIPE, automatico: null },
  { de: 'resolvido', para: 'fechado', perfis: TODOS, automatico: (p) => (p === 'cliente' ? 'Confirmado pelo cliente' : null) },
  { de: 'resolvido', para: 'em_atendimento', perfis: TODOS, automatico: null },
  { de: 'fechado', para: 'em_atendimento', perfis: TODOS, automatico: null },
]

export const MOTIVO_PEGOU = 'Assumido para atendimento'
export const MOTIVO_CLIENTE_RESPONDEU = 'Cliente respondeu'
export const motivoAtribuidoPor = (nomeGestor: string) => `Atribuído por ${nomeGestor}`

export function transicoesPermitidas(status: Status, perfil: Perfil): Status[] {
  return TRANSICOES.filter((t) => t.de === status && t.perfis.includes(perfil)).map((t) => t.para)
}

export function transicaoValida(de: Status, para: Status, perfil: Perfil): boolean {
  return TRANSICOES.some((t) => t.de === de && t.para === para && t.perfis.includes(perfil))
}

export function motivoAutomatico(de: Status, para: Status, perfil: Perfil): string | null {
  const t = TRANSICOES.find((t) => t.de === de && t.para === para && t.perfis.includes(perfil))
  return t?.automatico?.(perfil) ?? null
}

export function ehReabertura(de: Status, para: Status): boolean {
  return (de === 'resolvido' || de === 'fechado') && para === 'em_atendimento'
}

export const ROTULO_STATUS: Record<Status, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

/** Linguagem do cliente (spec §5.3). `{nome}` é substituído pelo responsável. */
export const ROTULO_STATUS_CLIENTE: Record<Status, string> = {
  aberto: 'Aguardando atendimento',
  em_atendimento: 'Em atendimento por {nome}',
  aguardando_cliente: 'Aguardando sua resposta',
  resolvido: 'Resolvido, aguardando sua confirmação',
  fechado: 'Fechado',
}

export const ROTULO_ACAO: Partial<Record<`${Status}>${Status}`, string>> = {
  'em_atendimento>aguardando_cliente': 'Aguardar cliente',
  'aguardando_cliente>em_atendimento': 'Retomar atendimento',
  'em_atendimento>resolvido': 'Marcar como resolvido',
  'resolvido>fechado': 'Fechar',
  'resolvido>em_atendimento': 'Reabrir',
  'fechado>em_atendimento': 'Reabrir',
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/utils/status`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/status.ts src/shared/utils/status.test.ts
git commit -m "feat: tabela de transições de status por perfil e motivos automáticos"
```

---

### Task 6: Visibilidade por perfil

**Files:**
- Create: `src/shared/utils/visibilidade.ts`, `src/shared/utils/visibilidade.test.ts`

- [ ] **Step 1: Teste**

`src/shared/utils/visibilidade.test.ts`:
```ts
import { historicoParaPerfil, mensagemVisivel, visivelPara } from './visibilidade'
import { DADOS, HELENA, MARINA, RICARDO } from '@/tests/fixtures/dados'
import type { Historico, Mensagem } from '@/shared/types'

describe('visivelPara', () => {
  it('cliente vê só os próprios', () => {
    const meu = DADOS.chamados.find((c) => c.solicitante_id === HELENA.id)!
    const outro = DADOS.chamados.find((c) => c.solicitante_id !== HELENA.id)!
    expect(visivelPara(HELENA, meu)).toBe(true)
    expect(visivelPara(HELENA, outro)).toBe(false)
  })
  it('consultor vê o próprio grupo', () => {
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const doGrupo = DADOS.chamados.find((c) => c.grupo_id === grupo)!
    const deOutro = DADOS.chamados.find((c) => c.grupo_id !== grupo)!
    expect(visivelPara(MARINA, doGrupo)).toBe(true)
    expect(visivelPara(MARINA, deOutro)).toBe(false)
  })
  it('gestor vê os grupos que gere (os dois)', () => {
    expect(DADOS.chamados.every((c) => visivelPara(RICARDO, c))).toBe(true)
  })
})

describe('mensagemVisivel', () => {
  const interna: Mensagem = { id: 'm', chamado_id: 'c', criada_em: '', autor_id: 'a', texto: 't', interna: true }
  it('cliente não vê nota interna; equipe vê', () => {
    expect(mensagemVisivel(HELENA, interna)).toBe(false)
    expect(mensagemVisivel(MARINA, interna)).toBe(true)
    expect(mensagemVisivel(HELENA, { ...interna, interna: null })).toBe(true)
  })
})

describe('historicoParaPerfil', () => {
  const lista: Historico[] = [
    { id: '1', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'u', motivo: null, ocorrido_em: '' },
    { id: '2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'u', motivo: 'segredo', ocorrido_em: '' },
  ]
  it('cliente recebe só status, sem motivo', () => {
    expect(historicoParaPerfil(HELENA, lista)).toEqual([{ ...lista[1], motivo: null }])
  })
  it('equipe recebe tudo', () => {
    expect(historicoParaPerfil(MARINA, lista)).toEqual(lista)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/shared/utils/visibilidade`
Expected: FAIL

- [ ] **Step 3: Implementar**

`src/shared/utils/visibilidade.ts`:
```ts
import { gruposDo, type Chamado, type Historico, type Mensagem, type Usuario } from '@/shared/types'

export function visivelPara(usuario: Usuario, chamado: Chamado): boolean {
  if (usuario.perfil === 'cliente') return chamado.solicitante_id === usuario.id
  return gruposDo(usuario).includes(chamado.grupo_id)
}

export function mensagemVisivel(usuario: Usuario, mensagem: Mensagem): boolean {
  return usuario.perfil !== 'cliente' || mensagem.interna !== true
}

/** Cliente: só entradas de status e sem motivo (spec §4.1, §5.4). */
export function historicoParaPerfil(usuario: Usuario, historico: Historico[]): Historico[] {
  if (usuario.perfil !== 'cliente') return historico
  return historico.filter((h) => h.tipo === 'status').map((h) => ({ ...h, motivo: null }))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/utils/visibilidade`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/visibilidade.ts src/shared/utils/visibilidade.test.ts
git commit -m "feat: regras de visibilidade por perfil"
```

---

### Task 7: Reducer e Estado

**Files:**
- Create: `src/shared/utils/reducer.ts`, `src/shared/utils/reducer.test.ts`

- [ ] **Step 1: Teste**

`src/shared/utils/reducer.test.ts`:
```ts
import { aplicar, criarEstado, type Estado } from './reducer'
import { DADOS, HELENA, MARINA, chamadoPorNumero } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'
let estado: Estado
beforeEach(() => { estado = criarEstado(DADOS) })

const semDono = () => Object.values(estado.chamados).find((c) => c.status === 'aberto' && c.grupo_id === (MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''))!

describe('criarEstado', () => {
  it('indexa por id e agrupa mensagens por chamado em ordem cronológica', () => {
    expect(Object.keys(estado.chamados)).toHaveLength(620)
    const c = Object.entries(estado.mensagens).find(([, m]) => m.length === 1500)!
    expect(c).toBeDefined()
    const [, msgs] = c
    for (let i = 1; i < msgs.length; i++) expect(msgs[i]!.criada_em >= msgs[i - 1]!.criada_em).toBe(true)
    expect(estado.historico).toHaveLength(1558)
    expect(estado.idsAplicados.size).toBe(0)
  })
})

describe('chamado.atribuido', () => {
  it('troca responsável, acrescenta histórico de atribuição e não muda status', () => {
    const c = semDono()
    const e: Evento = { id: 'e1', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    const s2 = aplicar(estado, e)
    expect(s2.chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(s2.chamados[c.id]!.status).toBe('aberto')
    expect(s2.chamados[c.id]!.atualizado_em).toBe(T)
    const h = s2.historico.at(-1)!
    expect(h).toMatchObject({ id: 'e1', chamado_id: c.id, tipo: 'atribuicao', de: null, para: null, usuario_id: MARINA.id, motivo: null, ocorrido_em: T })
    expect(estado.chamados[c.id]!.responsavel_id).toBeNull() // imutável
  })
})

describe('status.alterado', () => {
  it('muda status, pausa SLA em aguardando_cliente e registra histórico', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'em_atendimento')!
    const e: Evento = { id: 'e2', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'aguardando_cliente', motivo: 'Pedi logs', usuario_id: c.responsavel_id! } }
    const s2 = aplicar(estado, e)
    expect(s2.chamados[c.id]).toMatchObject({ status: 'aguardando_cliente', sla_pausado: true, atualizado_em: T })
    expect(s2.historico.at(-1)).toMatchObject({ id: 'e2', tipo: 'status', de: 'em_atendimento', para: 'aguardando_cliente', motivo: 'Pedi logs' })
  })
  it('preenche resolvido_em e fechado_em; reabrir não limpa', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'em_atendimento')!
    let s = aplicar(estado, { id: 'a', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'resolvido', motivo: 'ok', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.resolvido_em).toBe(T)
    s = aplicar(s, { id: 'b', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'resolvido', para: 'fechado', motivo: 'ok', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.fechado_em).toBe(T)
    s = aplicar(s, { id: 'c', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'fechado', para: 'em_atendimento', motivo: 'voltou', usuario_id: 'u' } })
    expect(s.chamados[c.id]).toMatchObject({ status: 'em_atendimento', fechado_em: T, sla_pausado: false })
  })
  it('nunca altera o para do evento', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'fechado')!
    const s = aplicar(estado, { id: 'x', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'fechado', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.status).toBe('em_atendimento')
  })
})

describe('mensagem.adicionada', () => {
  it('insere e preenche primeira_resposta_em só com resposta não interna da equipe', () => {
    const c = Object.values(estado.chamados).find((c) => c.primeira_resposta_em === null && c.responsavel_id)!
    const base = { chamado_id: c.id, criada_em: T, texto: 'oi' }
    let s = aplicar(estado, { id: 'm1', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm1', autor_id: c.solicitante_id, interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
    s = aplicar(s, { id: 'm2', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm2', autor_id: c.responsavel_id!, interna: true } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
    s = aplicar(s, { id: 'm3', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm3', autor_id: c.responsavel_id!, interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBe(T)
    expect(s.mensagens[c.id]!.slice(-3).map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
    expect(s.chamados[c.id]!.atualizado_em).toBe(T)
  })
})

describe('chamado.aberto', () => {
  it('insere o chamado com lista de mensagens vazia', () => {
    const novo = { ...chamadoPorNumero(10001), id: 'novo', numero: 99999, status: 'aberto' as const, responsavel_id: null }
    const s = aplicar(estado, { id: 'n', tipo: 'chamado.aberto', ocorrido_em: T, payload: novo })
    expect(s.chamados.novo).toEqual(novo)
    expect(s.mensagens.novo).toEqual([])
  })
})

describe('dedupe e chamado desconhecido', () => {
  it('evento repetido devolve o mesmo estado', () => {
    const c = semDono()
    const e: Evento = { id: 'dup', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    const s1 = aplicar(estado, e)
    const s2 = aplicar(s1, e)
    expect(s2).toBe(s1)
    expect(s2.historico.filter((h) => h.id === 'dup')).toHaveLength(1)
  })
  it('evento de chamado ausente é no-op, mas registra o id', () => {
    const s = aplicar(estado, { id: 'z', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: 'nao-existe', de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(s.chamados).toBe(estado.chamados)
    expect(s.idsAplicados.has('z')).toBe(true)
  })
  it('cliente respondendo não preenche primeira resposta', () => {
    const c = Object.values(estado.chamados).find((c) => c.solicitante_id === HELENA.id && c.primeira_resposta_em === null)
    if (!c) return
    const s = aplicar(estado, { id: 'h', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'h', chamado_id: c.id, criada_em: T, autor_id: HELENA.id, texto: 'x', interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/shared/utils/reducer`
Expected: FAIL

- [ ] **Step 3: Implementar**

`src/shared/utils/reducer.ts`:
```ts
import type { Chamado, Dados, Evento, Historico, Mensagem, Usuario } from '@/shared/types'

export interface Estado {
  chamados: Record<string, Chamado>
  /** por chamado_id, ordem cronológica */
  mensagens: Record<string, Mensagem[]>
  historico: Historico[]
  usuarios: Record<string, Usuario>
  idsAplicados: Set<string>
}

type Fonte = Pick<Dados, 'chamados' | 'mensagens' | 'historico' | 'usuarios'>

export function criarEstado(dados: Fonte): Estado {
  const chamados: Record<string, Chamado> = {}
  const mensagens: Record<string, Mensagem[]> = {}
  for (const c of dados.chamados) { chamados[c.id] = c; mensagens[c.id] = [] }
  for (const m of dados.mensagens) (mensagens[m.chamado_id] ??= []).push(m)
  // ordenação por string ISO: o arquivo não tem milissegundos e eventos novos têm; só desempata errado dentro do mesmo segundo
  for (const lista of Object.values(mensagens)) lista.sort((a, b) => a.criada_em.localeCompare(b.criada_em))
  const usuarios: Record<string, Usuario> = {}
  for (const u of dados.usuarios) usuarios[u.id] = u
  return {
    chamados,
    mensagens,
    historico: [...dados.historico].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em)),
    usuarios,
    idsAplicados: new Set(),
  }
}

export function estadoVazio(): Estado {
  return { chamados: {}, mensagens: {}, historico: [], usuarios: {}, idsAplicados: new Set() }
}

function ehEquipe(estado: Estado, usuarioId: string): boolean {
  const p = estado.usuarios[usuarioId]?.perfil
  return p === 'consultor' || p === 'gestor'
}

/** Puro. Devolve o mesmo objeto se o id já foi aplicado. Nunca altera `para`. */
export function aplicar(estado: Estado, evento: Evento): Estado {
  if (estado.idsAplicados.has(evento.id)) return estado
  const idsAplicados = new Set(estado.idsAplicados).add(evento.id)

  if (evento.tipo === 'chamado.aberto') {
    const c = evento.payload
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [c.id]: c },
      mensagens: { ...estado.mensagens, [c.id]: estado.mensagens[c.id] ?? [] },
    }
  }

  const id = evento.payload.chamado_id
  const atual = estado.chamados[id]
  if (!atual) return { ...estado, idsAplicados } // chegou antes do GET; o GET seguinte traz tudo

  if (evento.tipo === 'chamado.atribuido') {
    const h: Historico = { id: evento.id, chamado_id: id, tipo: 'atribuicao', de: null, para: null, usuario_id: evento.payload.consultor_id, motivo: null, ocorrido_em: evento.ocorrido_em }
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [id]: { ...atual, responsavel_id: evento.payload.consultor_id, atualizado_em: evento.ocorrido_em } },
      historico: [...estado.historico, h],
    }
  }

  if (evento.tipo === 'mensagem.adicionada') {
    const m = evento.payload
    const respostaDaEquipe = m.interna !== true && ehEquipe(estado, m.autor_id)
    const chamado: Chamado = {
      ...atual,
      atualizado_em: evento.ocorrido_em,
      primeira_resposta_em: atual.primeira_resposta_em ?? (respostaDaEquipe ? m.criada_em : null),
    }
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [id]: chamado },
      mensagens: { ...estado.mensagens, [id]: [...(estado.mensagens[id] ?? []), m] },
    }
  }

  // status.alterado
  const { de, para, motivo, usuario_id } = evento.payload
  const h: Historico = { id: evento.id, chamado_id: id, tipo: 'status', de, para, usuario_id, motivo, ocorrido_em: evento.ocorrido_em }
  const chamado: Chamado = {
    ...atual,
    status: para,
    atualizado_em: evento.ocorrido_em,
    sla_pausado: para === 'aguardando_cliente',
    resolvido_em: para === 'resolvido' ? evento.ocorrido_em : atual.resolvido_em,
    fechado_em: para === 'fechado' ? evento.ocorrido_em : atual.fechado_em,
  }
  return {
    ...estado,
    idsAplicados,
    chamados: { ...estado.chamados, [id]: chamado },
    historico: [...estado.historico, h],
  }
}

export function aplicarTodos(estado: Estado, eventos: Evento[]): Estado {
  return eventos.reduce(aplicar, estado)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/utils/reducer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/reducer.ts src/shared/utils/reducer.test.ts
git commit -m "feat: reducer puro dos 4 eventos sobre o Estado, com dedupe e histórico"
```

---

### Task 8: Log de eventos e barramento

**Files:**
- Create: `src/mock-server/eventLog.ts`, `src/mock-server/eventLog.test.ts`, `src/mock-server/bus.ts`, `src/mock-server/bus.test.ts`

- [ ] **Step 1: Teste do log**

`src/mock-server/eventLog.test.ts`:
```ts
import { criarEventLog, PREFIXO_EVENTO } from './eventLog'
import type { Evento } from '@/shared/types'

const ev = (id: string, t: string): Evento => ({ id, tipo: 'chamado.atribuido', ocorrido_em: t, payload: { chamado_id: 'c', consultor_id: 'u' } })

describe('eventLog', () => {
  it('grava uma chave por evento e lê em ordem de ocorrido_em', () => {
    const log = criarEventLog(localStorage)
    log.gravar(ev('b', '2026-11-03T13:02:00.000Z'))
    log.gravar(ev('a', '2026-11-03T13:01:00.000Z'))
    expect(localStorage.length).toBe(2)
    expect(log.ler().eventos.map((e) => e.id)).toEqual(['a', 'b'])
  })
  it('ignora chave inválida e conta', () => {
    const log = criarEventLog(localStorage)
    localStorage.setItem(PREFIXO_EVENTO + '2026-x:1', '{nao é json')
    localStorage.setItem(PREFIXO_EVENTO + '2026-y:2', JSON.stringify({ id: '2', tipo: 'inexistente' }))
    log.gravar(ev('ok', '2026-11-03T13:00:00.000Z'))
    const r = log.ler()
    expect(r.eventos.map((e) => e.id)).toEqual(['ok'])
    expect(r.ignorados).toBe(2)
    expect(localStorage.length).toBe(1) // inválidas removidas
  })
  it('limparTudo remove só chaves itsm:*', () => {
    const log = criarEventLog(localStorage)
    log.gravar(ev('a', '2026-11-03T13:00:00.000Z'))
    localStorage.setItem('itsm:relogio', '{}')
    localStorage.setItem('outra', '1')
    log.limparTudo()
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem('outra')).toBe('1')
  })
})
```

- [ ] **Step 2: Implementar o log**

`src/mock-server/eventLog.ts`:
```ts
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
```
Run: `pnpm test src/mock-server/eventLog` → PASS

- [ ] **Step 3: Teste do bus**

`src/mock-server/bus.test.ts`:
```ts
import { criarBus } from './bus'
import type { Evento } from '@/shared/types'

const ev = (id: string): Evento => ({ id, tipo: 'chamado.atribuido', ocorrido_em: '2026-11-03T13:00:00.000Z', payload: { chamado_id: 'c', consultor_id: 'u' } })

/** Canal fake: entrega às outras instâncias do mesmo nome, nunca a si mesma (como o real). */
function canalFake() {
  const instancias = new Set<{ onmessage: ((ev: MessageEvent) => void) | null }>()
  return function Canal(this: any) {
    const eu = { onmessage: null as ((ev: MessageEvent) => void) | null }
    instancias.add(eu)
    return {
      postMessage(data: unknown) { for (const i of instancias) if (i !== eu && i.onmessage) i.onmessage({ data } as MessageEvent) },
      set onmessage(cb: ((ev: MessageEvent) => void) | null) { eu.onmessage = cb },
      close() { instancias.delete(eu) },
    }
  } as unknown as typeof BroadcastChannel
}

describe('bus', () => {
  it('entrega aos assinantes locais na ordem de assinatura, de forma síncrona', () => {
    const bus = criarBus({ Canal: canalFake() })
    const ordem: string[] = []
    bus.assinar(() => ordem.push('a'))
    bus.assinar(() => ordem.push('b'))
    bus.publicar(ev('1'))
    expect(ordem).toEqual(['a', 'b'])
  })
  it('entrega às outras abas pelo canal', () => {
    const Canal = canalFake()
    const abaA = criarBus({ Canal })
    const abaB = criarBus({ Canal })
    const recebidos: string[] = []
    abaB.assinar((e) => recebidos.push(e.id))
    abaA.publicar(ev('1'))
    expect(recebidos).toEqual(['1'])
  })
  it('unsubscribe funciona', () => {
    const bus = criarBus({ Canal: canalFake() })
    const cb = vi.fn()
    const sair = bus.assinar(cb)
    sair()
    bus.publicar(ev('1'))
    expect(cb).not.toHaveBeenCalled()
  })
  it('duplica de propósito quando deveDuplicar diz sim', () => {
    const bus = criarBus({ Canal: canalFake(), deveDuplicar: () => true })
    const cb = vi.fn()
    bus.assinar(cb)
    bus.publicar(ev('1'))
    expect(cb).toHaveBeenCalledTimes(2)
  })
  it('sem canal, usa o evento storage como fallback', () => {
    const bus = criarBus({ Canal: undefined, storage: localStorage })
    const cb = vi.fn()
    bus.assinar(cb)
    const e = ev('9')
    window.dispatchEvent(new StorageEvent('storage', { key: 'itsm:evt:2026-11-03T13:00:00.000Z:9', newValue: JSON.stringify(e), storageArea: localStorage }))
    expect(cb).toHaveBeenCalledWith(e)
  })
})
```

- [ ] **Step 4: Implementar o bus**

`src/mock-server/bus.ts`:
```ts
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
```
Run: `pnpm test src/mock-server` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/mock-server/eventLog.ts src/mock-server/eventLog.test.ts src/mock-server/bus.ts src/mock-server/bus.test.ts
git commit -m "feat: log de eventos por chave e barramento entre abas"
```

---

### Task 9: Db (dados + replay + assinatura do bus)

**Files:**
- Create: `src/mock-server/db.ts`, `src/mock-server/db.test.ts`

- [ ] **Step 1: Teste**

`src/mock-server/db.test.ts`:
```ts
import { criarDb } from './db'
import { criarBus } from './bus'
import { criarEventLog } from './eventLog'
import { DADOS, MARINA } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'
const carregar = async () => DADOS

describe('db', () => {
  it('carrega o dados.json e reaplica o log gravado', async () => {
    const log = criarEventLog(localStorage)
    const semDono = DADOS.chamados.find((c) => c.status === 'aberto')!
    log.gravar({ id: 'antigo', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: semDono.id, consultor_id: MARINA.id } })
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log, carregar })
    expect(db.estado().chamados[semDono.id]!.responsavel_id).toBe(MARINA.id)
    expect(db.lookups().categorias).toHaveLength(8)
  })

  it('emitir grava no log e aplica via bus (um caminho só)', async () => {
    const log = criarEventLog(localStorage)
    const bus = criarBus({ Canal: undefined })
    const db = await criarDb({ bus, log, carregar })
    const c = DADOS.chamados.find((c) => c.status === 'aberto')!
    const e: Evento = { id: 'novo', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    db.emitir([e])
    expect(db.estado().chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(log.ler().eventos.map((x) => x.id)).toEqual(['novo'])
  })

  it('evento vindo de outra aba pelo bus é aplicado sem ir ao log desta aba', async () => {
    const log = criarEventLog(localStorage)
    const bus = criarBus({ Canal: undefined })
    const db = await criarDb({ bus, log, carregar })
    const c = DADOS.chamados.find((c) => c.status === 'aberto')!
    bus.publicar({ id: 'remoto', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } })
    expect(db.estado().chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(log.ler().eventos).toHaveLength(0)
  })

  it('proximoNumero é maior + 1', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar })
    expect(db.proximoNumero()).toBe(Math.max(...DADOS.chamados.map((c) => c.numero)) + 1)
  })
})
```

- [ ] **Step 2: Implementar**

`src/mock-server/db.ts`:
```ts
import type { Categoria, Dados, Evento, Grupo, Meta, Sla } from '@/shared/types'
import { aplicar, aplicarTodos, criarEstado, type Estado } from '@/shared/utils/reducer'
import type { Bus } from './bus'
import type { EventLog } from './eventLog'

export interface Lookups { meta: Meta; grupos: Grupo[]; categorias: Categoria[]; sla: Sla[] }

export interface Db {
  estado(): Estado
  lookups(): Lookups
  /** Grava no log e publica. Quem aplica no estado é a assinatura do bus. */
  emitir(eventos: Evento[]): void
  proximoNumero(): number
  ignoradosNoReplay(): number
}

interface Opcoes { bus: Bus; log: EventLog; carregar: () => Promise<Dados> }

export async function criarDb({ bus, log, carregar }: Opcoes): Promise<Db> {
  let estado: Estado | null = null
  const pendentes: Evento[] = []
  // Assina ANTES de carregar: nada que chegue durante o import se perde (spec §4.3).
  bus.assinar((e) => { if (estado) estado = aplicar(estado, e); else pendentes.push(e) })

  const dados = await carregar()
  const { eventos, ignorados } = log.ler()
  estado = aplicarTodos(criarEstado(dados), [...eventos, ...pendentes])
  pendentes.length = 0

  const lookups: Lookups = { meta: dados.meta, grupos: dados.grupos, categorias: dados.categorias, sla: dados.sla }
  return {
    estado: () => estado!,
    lookups: () => lookups,
    emitir(evs) {
      for (const e of evs) { log.gravar(e); bus.publicar(e) }
    },
    proximoNumero: () => Math.max(0, ...Object.values(estado!.chamados).map((c) => c.numero)) + 1,
    ignoradosNoReplay: () => ignorados,
  }
}
```
Run: `pnpm test src/mock-server/db` → PASS

- [ ] **Step 3: Commit**

```bash
git add src/mock-server/db.ts src/mock-server/db.test.ts
git commit -m "feat: db do mock-server com replay do log e assinatura do bus"
```

---

### Task 10: Handlers HTTP (MSW)

**Files:**
- Create: `src/mock-server/handlers.ts`, `src/mock-server/handlers.test.ts`, `src/mock-server/erros.ts`

Spec §4.1 e §7. Testes rodam em ambiente `node` (MSW intercepta `fetch` nativo) com `Storage` em memória.

- [ ] **Step 1: Erros e utilitários**

`src/mock-server/erros.ts`:
```ts
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
```

- [ ] **Step 2: Teste**

`src/mock-server/handlers.test.ts`:
```ts
// @vitest-environment node
import { setupServer } from 'msw/node'
import { criarHandlers, PIN_PADRAO } from './handlers'
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
  it('entra com e-mail e PIN padrão', async () => {
    const r = await fetch('http://localhost/api/auth/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: MARINA.email, pin: PIN_PADRAO }) })
    expect(r.status).toBe(200)
    expect((await r.json()).id).toBe(MARINA.id)
  })
  it('PIN errado ou e-mail desconhecido dá 401', async () => {
    const r = await fetch('http://localhost/api/auth/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: MARINA.email, pin: '000000' }) })
    expect(r.status).toBe(401)
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
  it('consultor vê só o grupo; chamado de outro grupo é 403', async () => {
    const lista = await (await get('/chamados', MARINA)).json()
    expect(lista.every((c: { grupo_id: string }) => c.grupo_id === grupoMarina)).toBe(true)
    const outro = DADOS.chamados.find((c) => c.grupo_id !== grupoMarina)!
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
```

- [ ] **Step 3: Implementar**

`src/mock-server/handlers.ts`:
```ts
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { Chamado, Evento, Mensagem, Prioridade, Status, Usuario } from '@/shared/types'
import { calcularPrazos } from '@/shared/utils/sla'
import { MOTIVO_CLIENTE_RESPONDEU, MOTIVO_PEGOU, motivoAtribuidoPor, motivoAutomatico, transicaoValida } from '@/shared/utils/status'
import { historicoParaPerfil, mensagemVisivel, visivelPara } from '@/shared/utils/visibilidade'
import type { Relogio } from '@/shared/utils/relogio'
import type { Db } from './db'
import { erro, respostaErro } from './erros'

export const PIN_PADRAO = '123456'
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
    http.post(`${BASE}/auth/entrar`, tentar(async (req) => {
      const { email, pin } = await corpo<{ email: string; pin: string }>(req)
      const u = Object.values(db.estado().usuarios).find((u) => u.email.toLowerCase() === String(email ?? '').trim().toLowerCase())
      if (!u || pin !== PIN_PADRAO) throw erro('nao_autenticado', 'E-mail ou PIN incorretos')
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
        primeira_resposta_em: null, ...calcularPrazos(agora, prioridade, db.lookups().sla), sla_pausado: false, resolvido_em: null, fechado_em: null,
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
        eventos.push(evento('status.alterado', { chamado_id: c.id, de: 'aguardando_cliente', para: 'em_atendimento', motivo: MOTIVO_CLIENTE_RESPONDEU, usuario_id: u.id }))
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
        if (c.responsavel_id) throw erro('conflito', `${nomeDe(c.responsavel_id)} pegou antes de você`)
      }
      const eventos: Evento[] = [evento('chamado.atribuido', { chamado_id: c.id, consultor_id: consultor.id })]
      if (c.status === 'aberto') {
        const motivo = u.perfil === 'gestor' ? motivoAtribuidoPor(u.nome) : MOTIVO_PEGOU
        eventos.push({ ...evento('status.alterado', { chamado_id: c.id, de: 'aberto', para: 'em_atendimento', motivo, usuario_id: u.id }), ocorrido_em: eventos[0]!.ocorrido_em })
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/mock-server/handlers`
Expected: PASS. Se MSW reclamar de `onUnhandledRequest`, conferir que toda URL do teste começa com `http://localhost/api`.

- [ ] **Step 5: Commit**

```bash
git add src/mock-server/erros.ts src/mock-server/handlers.ts src/mock-server/handlers.test.ts
git commit -m "feat: handlers MSW da API fake com validação, permissões e eventos derivados"
```

---

### Task 11: Socket filtrado por visibilidade

**Files:**
- Create: `src/mock-server/socket.ts`, `src/mock-server/socket.test.ts`

- [ ] **Step 1: Teste**

`src/mock-server/socket.test.ts`:
```ts
import { criarSocket } from './socket'
import { criarBus } from './bus'
import { criarDb } from './db'
import { criarEventLog } from './eventLog'
import { DADOS, HELENA, MARINA } from '@/tests/fixtures/dados'
import type { Evento, Usuario } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'

async function montar(sessao: () => Usuario | null) {
  const bus = criarBus({ Canal: undefined })
  const db = await criarDb({ bus, log: criarEventLog(localStorage), carregar: async () => DADOS })
  const socket = criarSocket({ bus, db, usuarioSessao: sessao })
  const recebidos: Evento[] = []
  socket.assinar((e) => recebidos.push(e))
  return { bus, db, recebidos }
}

describe('socket', () => {
  it('cliente não recebe mensagem interna nem chamado de outro cliente', async () => {
    const { bus, recebidos } = await montar(() => HELENA)
    const meu = DADOS.chamados.find((c) => c.solicitante_id === HELENA.id)!
    const outro = DADOS.chamados.find((c) => c.solicitante_id !== HELENA.id)!
    bus.publicar({ id: '1', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm1', chamado_id: meu.id, criada_em: T, autor_id: 'x', texto: 'nota', interna: true } })
    bus.publicar({ id: '2', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm2', chamado_id: meu.id, criada_em: T, autor_id: 'x', texto: 'oi', interna: false } })
    bus.publicar({ id: '3', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: outro.id, de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    bus.publicar({ id: '4', tipo: 'chamado.aberto', ocorrido_em: T, payload: { ...outro, id: 'novo-de-outro' } })
    expect(recebidos.map((e) => e.id)).toEqual(['2'])
  })
  it('consultor não recebe chamado de outro grupo; recebe do seu', async () => {
    const { bus, recebidos } = await montar(() => MARINA)
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const doGrupo = DADOS.chamados.find((c) => c.grupo_id === grupo)!
    const deOutro = DADOS.chamados.find((c) => c.grupo_id !== grupo)!
    bus.publicar({ id: 'a', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: doGrupo.id, consultor_id: MARINA.id } })
    bus.publicar({ id: 'b', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: deOutro.id, consultor_id: 'x' } })
    expect(recebidos.map((e) => e.id)).toEqual(['a'])
  })
  it('sem sessão, descarta tudo', async () => {
    const { bus, recebidos } = await montar(() => null)
    bus.publicar({ id: 'a', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: DADOS.chamados[0]!.id, consultor_id: 'x' } })
    expect(recebidos).toEqual([])
  })
})
```

- [ ] **Step 2: Implementar**

`src/mock-server/socket.ts`:
```ts
import type { Evento, Usuario } from '@/shared/types'
import { chamadoIdDe } from '@/shared/types'
import { mensagemVisivel, visivelPara } from '@/shared/utils/visibilidade'
import type { Bus } from './bus'
import type { Db } from './db'

export interface Socket {
  assinar(cb: (e: Evento) => void): () => void
  estado(): 'conectado' | 'desconectado'
}

interface Opcoes { bus: Bus; db: Db; usuarioSessao: () => Usuario | null }

/** O "servidor" do socket: entrega só o que o usuário desta aba pode ver (spec §4.3 passo 4). */
export function criarSocket({ bus, db, usuarioSessao }: Opcoes): Socket {
  return {
    assinar(cb) {
      return bus.assinar((e) => {
        const u = usuarioSessao()
        if (!u) return
        const chamado = e.tipo === 'chamado.aberto' ? e.payload : db.estado().chamados[chamadoIdDe(e)]
        if (!chamado || !visivelPara(u, chamado)) return
        if (e.tipo === 'mensagem.adicionada' && !mensagemVisivel(u, e.payload)) return
        cb(e)
      })
    },
    estado: () => (bus.conectado() ? 'conectado' : 'desconectado'),
  }
}
```
Run: `pnpm test src/mock-server/socket` → PASS

- [ ] **Step 3: Commit**

```bash
git add src/mock-server/socket.ts src/mock-server/socket.test.ts
git commit -m "feat: socket fake filtrado pela visibilidade do usuário da aba"
```

---

### Task 12: Similaridade e agregados da equipe

**Files:**
- Create: `src/shared/utils/similaridade.ts`, `src/shared/utils/similaridade.test.ts`, `src/shared/utils/equipe.ts`, `src/shared/utils/equipe.test.ts`

- [ ] **Step 1: Teste de similaridade**

`src/shared/utils/similaridade.test.ts`:
```ts
import { normalizarTitulo, sugerirParecido } from './similaridade'
import { AGORA_MS, DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'

const daHelena = DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id)

describe('normalizarTitulo', () => {
  it('minúsculas, sem acento, sem stopwords', () => {
    expect(normalizarTitulo('Solicitação de acesso para o novo colaborador')).toEqual(['solicitacao', 'acesso', 'novo', 'colaborador'])
  })
})

describe('sugerirParecido', () => {
  it('acha #10612 (fechado) ao digitar o título de #10614', () => {
    const alvo = chamadoPorNumero(10614)
    const s = sugerirParecido(alvo.titulo, daHelena.filter((c) => c.id !== alvo.id), AGORA_MS)
    expect(s?.numero).toBe(10612)
  })
  it('não sugere sem palavra em comum', () => {
    expect(sugerirParecido('xyzzy plugh', daHelena, AGORA_MS)).toBeNull()
  })
  it('só considera resolvido/fechado dos últimos 90 dias', () => {
    const alvo = chamadoPorNumero(10614)
    const daqui200dias = AGORA_MS + 200 * 24 * 3_600_000
    expect(sugerirParecido(alvo.titulo, daHelena, daqui200dias)).toBeNull()
  })
  it('título curto demais (1 palavra útil) não sugere, a menos que seja idêntico', () => {
    const fechado = daHelena.find((c) => c.status === 'fechado')!
    expect(sugerirParecido(fechado.titulo, daHelena, AGORA_MS)?.id).toBe(fechado.id)
  })
})
```

- [ ] **Step 2: Implementar similaridade**

`src/shared/utils/similaridade.ts`:
```ts
import type { Chamado } from '@/shared/types'

const STOPWORDS = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'um', 'uma', 'ao', 'aos', 'que', 'se', 'ou', 'nao', 'ja', 'mais'])
const DIAS_90 = 90 * 24 * 3_600_000

export function normalizarTitulo(t: string): string[] {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((p) => p.length > 1 && !STOPWORDS.has(p))
}

/** Spec §6.4: mesmo solicitante (lista já filtrada), encerrado nos últimos 90 dias, ≥ 2 palavras em comum ou título idêntico. */
export function sugerirParecido(titulo: string, candidatos: Chamado[], agoraMs: number): Chamado | null {
  const palavras = new Set(normalizarTitulo(titulo))
  const alvo = normalizarTitulo(titulo).join(' ')
  if (palavras.size === 0) return null
  const elegiveis = candidatos
    .filter((c) => (c.status === 'resolvido' || c.status === 'fechado') && agoraMs - Date.parse(c.atualizado_em) <= DIAS_90 && agoraMs >= Date.parse(c.atualizado_em))
    .filter((c) => {
      const dele = normalizarTitulo(c.titulo)
      if (dele.join(' ') === alvo) return true
      return dele.filter((p) => palavras.has(p)).length >= 2
    })
    .sort((a, b) => Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em))
  return elegiveis[0] ?? null
}
```
Run: `pnpm test src/shared/utils/similaridade` → PASS

- [ ] **Step 3: Teste dos agregados**

`src/shared/utils/equipe.test.ts`:
```ts
import { agregadosPorConsultor, ociosoNaJanela } from './equipe'
import { AGORA_MS, DADOS, MARINA, RICARDO } from '@/tests/fixtures/dados'
import type { Chamado, Historico, UsuarioConsultor } from '@/shared/types'

const H = 3_600_000, DIA = 24 * H
const iso = (ms: number) => new Date(ms).toISOString()
const consultor: UsuarioConsultor = { id: 'k', nome: 'K', email: 'k@x', locale: 'pt-BR', zoneinfo: 'America/Sao_Paulo', perfil: 'consultor', grupo_id: 'g' }

describe('ociosoNaJanela', () => {
  it('sem nenhum chamado a semana toda = 7 dias', () => {
    expect(ociosoNaJanela(consultor.id, [], [], AGORA_MS)).toBe(7 * DIA)
  })
  it('com um chamado ativo o tempo todo = 0', () => {
    const c = { id: 'c', responsavel_id: 'k', status: 'em_atendimento' } as Chamado
    // como no dado real, toda atribuição vem com o aberto -> em_atendimento correspondente
    const h: Historico[] = [
      { id: 'h', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'k', motivo: null, ocorrido_em: iso(AGORA_MS - 30 * DIA) },
      { id: 'h2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 30 * DIA) },
    ]
    expect(ociosoNaJanela('k', h, [c], AGORA_MS)).toBe(0)
  })
  it('chamado atribuído há 2 dias e resolvido há 1 dia: ocioso = 5 d + 1 d', () => {
    const c = { id: 'c', responsavel_id: 'k', status: 'resolvido' } as Chamado
    const h: Historico[] = [
      { id: '1', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'k', motivo: null, ocorrido_em: iso(AGORA_MS - 2 * DIA) },
      { id: '2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 2 * DIA) },
      { id: '3', chamado_id: 'c', tipo: 'status', de: 'em_atendimento', para: 'resolvido', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 1 * DIA) },
    ]
    expect(ociosoNaJanela('k', h, [c], AGORA_MS)).toBe(6 * DIA)
  })
})

describe('agregadosPorConsultor', () => {
  it('Marina tem 42 ativos no arquivo', () => {
    const consultores = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor')
    const ag = agregadosPorConsultor(consultores, DADOS.chamados, DADOS.historico, AGORA_MS)
    const marina = ag.find((a) => a.consultor.id === MARINA.id)!
    expect(marina.ativos).toBe(42)
    expect(marina.vencidos + marina.vencendo4h).toBeLessThanOrEqual(42)
    expect(ag[0]!.vencidos).toBeGreaterThanOrEqual(ag[1]!.vencidos)
    expect(RICARDO.perfil).toBe('gestor')
  })
})
```

- [ ] **Step 4: Implementar agregados**

`src/shared/utils/equipe.ts`:
```ts
import type { Chamado, Historico, UsuarioConsultor } from '@/shared/types'
import { faixaSla, ehEncerrado } from './sla'

const DIA = 24 * 3_600_000
export const JANELA_OCIOSO = 7 * DIA

export interface AgregadoConsultor {
  consultor: UsuarioConsultor
  ativos: number
  vencidos: number
  vencendo4h: number
  ociosoMs: number
}

const ATIVO = (s: Chamado['status']) => s === 'em_atendimento' || s === 'aguardando_cliente'

/**
 * Spec §6.5. Reconstrói, do histórico, os períodos em que cada chamado esteve ativo e atribuído ao consultor;
 * ocioso = tempo da janela sem nenhum chamado ativo.
 */
export function ociosoNaJanela(consultorId: string, historico: Historico[], chamados: Chamado[], agoraMs: number): number {
  const inicio = agoraMs - JANELA_OCIOSO
  const porChamado = new Map<string, Historico[]>()
  for (const h of historico) (porChamado.get(h.chamado_id) ?? porChamado.set(h.chamado_id, []).get(h.chamado_id)!).push(h)
  const intervalos: Array<[number, number]> = []
  const porId = new Map(chamados.map((c) => [c.id, c]))

  for (const [chamadoId, hs] of porChamado) {
    hs.sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em))
    let dono: string | null = null, status: Chamado['status'] = 'aberto', desde: number | null = null
    const fechar = (ate: number) => { if (desde !== null) { intervalos.push([desde, ate]); desde = null } }
    for (const h of hs) {
      const t = Date.parse(h.ocorrido_em)
      if (h.tipo === 'atribuicao') dono = h.usuario_id
      else if (h.para) status = h.para
      const ativoDele = dono === consultorId && ATIVO(status)
      if (ativoDele && desde === null) desde = t
      if (!ativoDele) fechar(t)
    }
    const atual = porId.get(chamadoId)
    if (desde !== null) {
      // continua ativo até agora se o estado atual confirma; senão fecha na última entrada
      if (atual && atual.responsavel_id === consultorId && ATIVO(atual.status)) fechar(agoraMs)
      else fechar(Date.parse(hs.at(-1)!.ocorrido_em))
    }
  }
  // chamados ativos do consultor sem histórico de atribuição (defesa): contam desde aberto_em
  for (const c of chamados) {
    if (c.responsavel_id === consultorId && ATIVO(c.status) && !porChamado.has(c.id)) intervalos.push([Date.parse(c.aberto_em), agoraMs])
  }

  const recortados = intervalos.map(([a, b]) => [Math.max(a, inicio), Math.min(b, agoraMs)] as [number, number]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  let ocupado = 0, cursor = inicio
  for (const [a, b] of recortados) {
    if (b <= cursor) continue
    ocupado += b - Math.max(a, cursor)
    cursor = b
  }
  return JANELA_OCIOSO - ocupado
}

export function agregadosPorConsultor(consultores: UsuarioConsultor[], chamados: Chamado[], historico: Historico[], agoraMs: number): AgregadoConsultor[] {
  return consultores.map((consultor) => {
    const dele = chamados.filter((c) => c.responsavel_id === consultor.id && !ehEncerrado(c))
    const faixas = dele.map((c) => faixaSla(c, agoraMs))
    return {
      consultor,
      ativos: dele.length,
      vencidos: faixas.filter((f) => f === 'vencido').length,
      vencendo4h: faixas.filter((f) => f === 'critico' || f === 'ultima_hora').length,
      ociosoMs: ociosoNaJanela(consultor.id, historico, chamados, agoraMs),
    }
  }).sort((a, b) => b.vencidos - a.vencidos || b.ativos - a.ativos)
}
```
Run: `pnpm test src/shared/utils/equipe` → PASS. Se o teste do 3º caso der 6 d ± poucos ms por arredondamento, trocar `toBe` por `toBeCloseTo(6 * DIA, -3)`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/similaridade.ts src/shared/utils/similaridade.test.ts src/shared/utils/equipe.ts src/shared/utils/equipe.test.ts
git commit -m "feat: sugestão de chamado parecido e agregados por consultor com tempo ocioso"
```

---

### Task 13: Simulador e bootstrap do mock-server

**Files:**
- Create: `src/mock-server/simulator.ts`, `src/mock-server/simulator.test.ts`, `src/mock-server/index.ts`

- [ ] **Step 1: Teste do simulador (lógica, sem timers reais)**

`src/mock-server/simulator.test.ts`:
```ts
import { escolherAcao, criarSimulador } from './simulator'
import { criarDb } from './db'
import { criarBus } from './bus'
import { criarEventLog } from './eventLog'
import { DADOS } from '@/tests/fixtures/dados'

describe('escolherAcao', () => {
  it('gera uma requisição válida com ator e corpo', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    for (let i = 0; i < 50; i++) {
      const a = escolherAcao(db.estado(), db.lookups(), () => 0.5)
      expect(a).not.toBeNull()
      expect(a!.url).toMatch(/^\/api\/chamados/)
      expect(a!.ator).toBeTruthy()
    }
  })
})

describe('criarSimulador', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('dispara fetch no intervalo e para ao pausar', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }))
    const sim = criarSimulador({ db, fetchFn, intervaloBaseMs: 1000, velocidade: () => 1, obterLock: async (fn) => fn() })
    sim.ligar()
    await vi.advanceTimersByTimeAsync(2500)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    sim.desligar()
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it('dispararAgora chama uma vez mesmo desligado', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }))
    const sim = criarSimulador({ db, fetchFn, intervaloBaseMs: 1000, velocidade: () => 1, obterLock: async (fn) => fn() })
    await sim.dispararAgora()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Implementar**

`src/mock-server/simulator.ts`:
```ts
import type { Usuario } from '@/shared/types'
import type { Estado } from '@/shared/utils/reducer'
import type { Lookups } from './db'
import type { Db } from './db'

export const CHAVE_SIMULADOR = 'itsm:simulador'
export const MOTIVO_SIMULADOR = 'Simulador: atualização de rotina'

export interface Acao { url: string; corpo: unknown; ator: Usuario; descricao: string }

const FRASES_CLIENTE = ['Continua acontecendo.', 'Segue o print em anexo.', 'Testei de novo e funcionou parcialmente.', 'Alguma novidade?', 'Já reiniciei e nada.']
const TITULOS = ['Erro ao acessar o sistema', 'Impressora não responde', 'VPN desconecta sozinha', 'Relatório não abre', 'Senha expirada']

function sorteio<T>(lista: T[], rnd: () => number): T | undefined { return lista[Math.floor(rnd() * lista.length)] }

/** Escolhe uma ação plausível (spec §4.4). `rnd` injetável para teste. */
export function escolherAcao(estado: Estado, lookups: Lookups, rnd: () => number = Math.random): Acao | null {
  const chamados = Object.values(estado.chamados)
  const usuarios = Object.values(estado.usuarios)
  const r = rnd()
  if (r < 0.4) {
    const c = sorteio(chamados.filter((c) => c.status === 'aguardando_cliente' || c.status === 'em_atendimento'), rnd)
    const cliente = c && estado.usuarios[c.solicitante_id]
    if (c && cliente) return { url: `/api/chamados/${c.id}/mensagens`, corpo: { texto: sorteio(FRASES_CLIENTE, rnd), interna: false }, ator: cliente, descricao: `${cliente.nome} respondeu #${c.numero}` }
  }
  if (r < 0.65) {
    const c = sorteio(chamados.filter((c) => c.status === 'aberto'), rnd)
    const consultor = c && sorteio(usuarios.filter((u) => u.perfil === 'consultor' && u.grupo_id === c.grupo_id), rnd)
    if (c && consultor) return { url: `/api/chamados/${c.id}/atribuir`, corpo: { consultor_id: consultor.id }, ator: consultor, descricao: `${consultor.nome} pegou #${c.numero}` }
  }
  if (r < 0.9) {
    const c = sorteio(chamados.filter((c) => c.status === 'em_atendimento' && c.responsavel_id), rnd)
    const consultor = c && estado.usuarios[c.responsavel_id!]
    if (c && consultor) {
      const para = rnd() < 0.5 ? 'aguardando_cliente' : 'resolvido'
      return { url: `/api/chamados/${c.id}/status`, corpo: { para, motivo: MOTIVO_SIMULADOR }, ator: consultor, descricao: `${consultor.nome} mudou #${c.numero} para ${para}` }
    }
  }
  const cliente = sorteio(usuarios.filter((u) => u.perfil === 'cliente'), rnd)
  const cat = sorteio(lookups.categorias, rnd)
  if (cliente && cat) return { url: '/api/chamados', corpo: { titulo: sorteio(TITULOS, rnd), descricao: 'Aberto pelo simulador.', categoria_id: cat.id }, ator: cliente, descricao: `${cliente.nome} abriu um chamado` }
  return null
}

export interface Simulador {
  ligar(): void
  desligar(): void
  ligado(): boolean
  dispararAgora(): Promise<Acao | null>
  /** true quando esta aba detém o lock e gera eventos. */
  ativoNestaAba(): boolean
  onAcao(cb: (a: Acao) => void): () => void
}

interface Opcoes {
  db: Db
  fetchFn?: typeof fetch
  intervaloBaseMs?: number
  velocidade: () => number
  /** Executa `fn` enquanto detiver o lock; resolve quando liberar. Default: navigator.locks. */
  obterLock?: (fn: () => Promise<void>) => Promise<void>
  storage?: Storage
}

export function criarSimulador(opts: Opcoes): Simulador {
  const { db, velocidade } = opts
  const fetchFn = opts.fetchFn ?? fetch
  const base = opts.intervaloBaseMs ?? 8000
  const storage = opts.storage
  const ouvintes = new Set<(a: Acao) => void>()
  let ligado = storage?.getItem(CHAVE_SIMULADOR) !== 'off'
  let detemLock = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const executar = async (): Promise<Acao | null> => {
    const acao = escolherAcao(db.estado(), db.lookups())
    if (!acao) return null
    await fetchFn(acao.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Usuario-Id': acao.ator.id }, body: JSON.stringify(acao.corpo) })
    for (const cb of ouvintes) cb(acao)
    return acao
  }
  const agendar = () => {
    if (!ligado || !detemLock) return
    timer = setTimeout(async () => { try { await executar() } finally { agendar() } }, base / Math.max(1, velocidade()))
  }
  const obterLock = opts.obterLock ?? (async (fn) => {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) return navigator.locks.request('itsm:simulador', fn)
    return fn() // sem Web Locks: roda em toda aba (documentado)
  })
  const comecar = () => {
    // a promessa fica pendente de propósito: o lock só é liberado quando a aba fecha (spec §4.4).
    // desligar() não libera o lock: "ligado" é global (localStorage), então outra aba não deve assumir.
    void obterLock(() => new Promise<void>(() => { detemLock = true; agendar() }))
  }

  return {
    ligar() { ligado = true; storage?.setItem(CHAVE_SIMULADOR, 'on'); if (!detemLock) comecar(); else agendar() },
    desligar() { ligado = false; storage?.setItem(CHAVE_SIMULADOR, 'off'); if (timer) clearTimeout(timer); timer = null },
    ligado: () => ligado,
    dispararAgora: executar,
    ativoNestaAba: () => detemLock && ligado,
    onAcao(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb) } },
  }
}
```

`src/mock-server/index.ts`:
```ts
import { setupWorker } from 'msw/browser'
import type { Dados, Usuario } from '@/shared/types'
import { relogio } from '@/shared/utils/relogio'
import { criarBus } from './bus'
import { criarDb, type Db } from './db'
import { criarEventLog } from './eventLog'
import { criarHandlers } from './handlers'
import { criarSimulador, type Simulador } from './simulator'
import { criarSocket, type Socket } from './socket'

export interface MockServer { db: Db; socket: Socket; simulador: Simulador; resetar(): void; ignoradosNoReplay: number }

/** Chamado uma vez em main.tsx. `usuarioSessao` é lido do store de sessão da aba. */
export async function iniciarMockServer(usuarioSessao: () => Usuario | null): Promise<MockServer> {
  const log = criarEventLog(localStorage)
  const bus = criarBus({ storage: localStorage, deveDuplicar: () => localStorage.getItem('itsm:simulador') !== 'off' && Math.random() < 0.1 })
  const db = await criarDb({ bus, log, carregar: async () => (await import('./dados.json')).default as unknown as Dados })
  relogio.iniciar(db.lookups().meta.agora)
  const worker = setupWorker(...criarHandlers({ db, relogio }))
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  const socket = criarSocket({ bus, db, usuarioSessao })
  const simulador = criarSimulador({ db, velocidade: () => relogio.velocidade(), storage: localStorage })
  if (simulador.ligado()) simulador.ligar()
  return {
    db, socket, simulador, ignoradosNoReplay: db.ignoradosNoReplay(),
    resetar() { log.limparTudo(); relogio.resetar(); location.reload() },
  }
}
```

- [ ] **Step 3: Gerar o service worker do MSW e rodar os testes**

```bash
pnpm exec msw init public --save
pnpm test
pnpm typecheck
```
Expected: todos os testes passam; `typecheck` sem erro. Confirmar que `public/mockServiceWorker.js` existe.

- [ ] **Step 4: Commit**

```bash
git add src/mock-server/simulator.ts src/mock-server/simulator.test.ts src/mock-server/index.ts public/mockServiceWorker.js package.json
git commit -m "feat: simulador em uma aba e bootstrap do mock-server"
```

**Fim do Chunk 1.** Nesta altura existe o "backend" completo, testado, sem nenhuma tela.

> Validação do chunk (14/11/2026): o código acima foi montado num rascunho fora do repositório com as versões indicadas e rodou `tsc -b --noEmit` limpo e 91/91 testes verdes. Não subir major de dependência (vitest 5, msw 3, react-router 8, TS 7) sem rever essas conclusões.

---

## Chunk 2: Casca, sessão, tempo real no cliente e detalhe do chamado

### Task 14: Tokens, reset e componentes base

**Files:**
- Create: `src/shared/styles/tokens.css`, `src/shared/styles/reset.css`, `src/shared/components/Button.tsx` (+ `.module.css`), `Badge.tsx`, `Dialog.tsx`, `Toast.tsx`, `Campo.tsx`, `Select.tsx`, `Tabs.tsx`, `Estado.tsx`, `src/shared/components/index.ts`

- [ ] **Step 1: Tokens e reset**

`src/shared/styles/tokens.css`:
```css
:root {
  --cor-fundo: #f6f7f9;
  --cor-superficie: #ffffff;
  --cor-borda: #e2e5ea;
  --cor-texto: #1b1f27;
  --cor-texto-fraco: #5b6472;
  --cor-primaria: #2457d6;
  --cor-primaria-texto: #ffffff;
  --cor-interna: #fff7db;          /* fundo de nota interna */
  --cor-interna-borda: #e8c66a;

  /* faixas de SLA (spec §6.2) */
  --sla-ok: #2f9e6b;
  --sla-atencao: #c48a00;
  --sla-critico: #e07a12;
  --sla-ultima-hora: #d9480f;
  --sla-vencido: #c92a2a;
  --sla-pausado: #7a8290;
  --sla-encerrado: #9aa3ad;

  --raio: 8px;
  --sombra: 0 1px 2px rgb(0 0 0 / 6%);
  --fonte: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --fonte-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --espaco-1: 4px; --espaco-2: 8px; --espaco-3: 12px; --espaco-4: 16px; --espaco-6: 24px;
}
```

`src/shared/styles/reset.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: var(--fonte); color: var(--cor-texto); background: var(--cor-fundo); font-size: 14px; line-height: 1.45; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--cor-primaria); }
:focus-visible { outline: 2px solid var(--cor-primaria); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

- [ ] **Step 2: Componentes**

`src/shared/components/Button.module.css`:
```css
.btn { display: inline-flex; align-items: center; gap: var(--espaco-2); padding: 6px 12px; border-radius: var(--raio); border: 1px solid var(--cor-borda); background: var(--cor-superficie); }
.btn:hover { background: #f0f2f5; }
.btn:disabled { opacity: .5; cursor: default; }
.primaria { background: var(--cor-primaria); color: var(--cor-primaria-texto); border-color: var(--cor-primaria); }
.primaria:hover { background: #1d49b5; }
.perigo { color: var(--sla-vencido); }
.pequeno { padding: 2px 8px; font-size: 13px; }
```

`src/shared/components/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react'
import s from './Button.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'padrao' | 'primaria' | 'perigo'; pequeno?: boolean }

export function Button({ variante = 'padrao', pequeno, className, type = 'button', ...rest }: Props) {
  const classes = [s.btn, variante === 'primaria' && s.primaria, variante === 'perigo' && s.perigo, pequeno && s.pequeno, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
```

`src/shared/components/Badge.module.css`:
```css
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #fff; background: var(--cor-texto-fraco); white-space: nowrap; }
.ok { background: var(--sla-ok); } .atencao { background: var(--sla-atencao); } .critico { background: var(--sla-critico); }
.ultima_hora { background: var(--sla-ultima-hora); } .vencido { background: var(--sla-vencido); } .pausado { background: var(--sla-pausado); } .encerrado { background: var(--sla-encerrado); }
.neutro { background: #e2e5ea; color: var(--cor-texto); }
```

`src/shared/components/Badge.tsx`:
```tsx
import type { ReactNode } from 'react'
import type { Faixa } from '@/shared/utils/sla'
import s from './Badge.module.css'

export function Badge({ faixa, children, title }: { faixa?: Faixa | 'neutro'; children: ReactNode; title?: string }) {
  return <span className={`${s.badge} ${faixa ? s[faixa] : ''}`} title={title}>{children}</span>
}
```

`src/shared/components/Dialog.module.css`:
```css
.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 35%); }
.conteudo { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(480px, calc(100vw - 32px)); background: var(--cor-superficie); border-radius: var(--raio); padding: var(--espaco-6); box-shadow: 0 10px 30px rgb(0 0 0 / 20%); display: grid; gap: var(--espaco-3); }
.titulo { margin: 0; font-size: 16px; }
.acoes { display: flex; justify-content: flex-end; gap: var(--espaco-2); margin-top: var(--espaco-2); }
```

`src/shared/components/Dialog.tsx`:
```tsx
import * as RD from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import s from './Dialog.module.css'

interface Props { aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode; acoes?: ReactNode }

export function Dialog({ aberto, onFechar, titulo, children, acoes }: Props) {
  return (
    <RD.Root open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <RD.Portal>
        <RD.Overlay className={s.overlay} />
        <RD.Content className={s.conteudo} aria-describedby={undefined}>
          <RD.Title className={s.titulo}>{titulo}</RD.Title>
          {children}
          {acoes && <div className={s.acoes}>{acoes}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  )
}
```

`src/shared/components/Toast.module.css`:
```css
.viewport { position: fixed; bottom: 56px; right: 16px; display: grid; gap: var(--espaco-2); width: 360px; max-width: calc(100vw - 32px); z-index: 50; list-style: none; margin: 0; padding: 0; }
.toast { background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-left: 4px solid var(--cor-primaria); border-radius: var(--raio); padding: var(--espaco-3); box-shadow: var(--sombra); display: grid; gap: var(--espaco-1); }
.erro { border-left-color: var(--sla-vencido); } .alerta { border-left-color: var(--sla-ultima-hora); }
.titulo { font-weight: 600; } .descricao { color: var(--cor-texto-fraco); }
.acoes { display: flex; gap: var(--espaco-2); justify-content: flex-end; }
```

`src/shared/components/Toast.tsx`:
```tsx
import * as RT from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Button } from './Button'
import s from './Toast.module.css'

export interface ToastItem { id: string; titulo: string; descricao?: string; tipo?: 'info' | 'erro' | 'alerta'; acao?: { rotulo: string; onClick: () => void }; duracaoMs?: number }
interface Ctx { notificar(t: Omit<ToastItem, 'id'> & { id?: string }): void }
const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([])
  const notificar = useCallback<Ctx['notificar']>((t) => {
    const id = t.id ?? crypto.randomUUID()
    setItens((atual) => (atual.some((x) => x.id === id) ? atual : [...atual, { ...t, id }]))
  }, [])
  const ctx = useMemo(() => ({ notificar }), [notificar])
  return (
    <ToastCtx.Provider value={ctx}>
      <RT.Provider swipeDirection="right">
        {children}
        {itens.map((t) => (
          <RT.Root key={t.id} className={`${s.toast} ${t.tipo === 'erro' ? s.erro : t.tipo === 'alerta' ? s.alerta : ''}`} duration={t.duracaoMs ?? 6000}
            onOpenChange={(o) => !o && setItens((a) => a.filter((x) => x.id !== t.id))}>
            <RT.Title className={s.titulo}>{t.titulo}</RT.Title>
            {t.descricao && <RT.Description className={s.descricao}>{t.descricao}</RT.Description>}
            <div className={s.acoes}>
              {t.acao && <RT.Action altText={t.acao.rotulo} asChild><Button pequeno onClick={t.acao.onClick}>{t.acao.rotulo}</Button></RT.Action>}
              <RT.Close asChild><Button pequeno aria-label="Fechar aviso">Fechar</Button></RT.Close>
            </div>
          </RT.Root>
        ))}
        <RT.Viewport className={s.viewport} />
      </RT.Provider>
    </ToastCtx.Provider>
  )
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
```

`src/shared/components/Campo.module.css`:
```css
.campo { display: grid; gap: var(--espaco-1); }
.rotulo { font-weight: 600; font-size: 13px; }
.entrada { padding: 8px 10px; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-superficie); width: 100%; }
.entrada:focus { border-color: var(--cor-primaria); }
.erro { color: var(--sla-vencido); font-size: 12px; }
.ajuda { color: var(--cor-texto-fraco); font-size: 12px; }
```

`src/shared/components/Campo.tsx`:
```tsx
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import s from './Campo.module.css'

type Base = { rotulo: string; erro?: string; ajuda?: string }
type InputProps = Base & InputHTMLAttributes<HTMLInputElement> & { multilinha?: false }
type AreaProps = Base & TextareaHTMLAttributes<HTMLTextAreaElement> & { multilinha: true }

export function Campo(props: InputProps | AreaProps) {
  const id = useId()
  const { rotulo, erro, ajuda } = props
  return (
    <div className={s.campo}>
      <label className={s.rotulo} htmlFor={id}>{rotulo}</label>
      {props.multilinha
        ? (() => { const { rotulo: _r, erro: _e, ajuda: _a, multilinha: _m, ...rest } = props; return <textarea id={id} className={s.entrada} aria-invalid={!!erro} {...rest} /> })()
        : (() => { const { rotulo: _r, erro: _e, ajuda: _a, multilinha: _m, ...rest } = props; return <input id={id} className={s.entrada} aria-invalid={!!erro} {...rest} /> })()}
      {erro ? <span className={s.erro} role="alert">{erro}</span> : ajuda ? <span className={s.ajuda}>{ajuda}</span> : null}
    </div>
  )
}
```

`src/shared/components/Select.module.css`:
```css
.trigger { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--espaco-2); min-width: 160px; padding: 6px 10px; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-superficie); }
.conteudo { background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio); box-shadow: 0 8px 24px rgb(0 0 0 / 15%); padding: 4px; z-index: 60; }
.item { padding: 6px 10px; border-radius: 6px; cursor: pointer; outline: none; }
.item[data-highlighted] { background: #eef2ff; }
```

`src/shared/components/Select.tsx`:
```tsx
import * as RS from '@radix-ui/react-select'
import s from './Select.module.css'

export interface Opcao { valor: string; rotulo: string }
interface Props { valor: string | undefined; onChange: (v: string) => void; opcoes: Opcao[]; placeholder?: string; ariaLabel: string }

export function Select({ valor, onChange, opcoes, placeholder = 'Selecione', ariaLabel }: Props) {
  return (
    <RS.Root value={valor} onValueChange={onChange}>
      <RS.Trigger className={s.trigger} aria-label={ariaLabel}><RS.Value placeholder={placeholder} /><RS.Icon>▾</RS.Icon></RS.Trigger>
      <RS.Portal>
        <RS.Content className={s.conteudo} position="popper" sideOffset={4}>
          <RS.Viewport>
            {opcoes.map((o) => <RS.Item key={o.valor} value={o.valor} className={s.item}><RS.ItemText>{o.rotulo}</RS.ItemText></RS.Item>)}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
```

`src/shared/components/Tabs.module.css`:
```css
.lista { display: flex; gap: var(--espaco-1); border-bottom: 1px solid var(--cor-borda); }
.aba { padding: 8px 12px; border: 0; background: none; color: var(--cor-texto-fraco); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.aba[data-state="active"] { color: var(--cor-texto); border-bottom-color: var(--cor-primaria); font-weight: 600; }
.contador { margin-left: 6px; background: #e2e5ea; border-radius: 999px; padding: 0 6px; font-size: 12px; }
```

`src/shared/components/Tabs.tsx`:
```tsx
import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import s from './Tabs.module.css'

export interface Aba { valor: string; rotulo: string; contador?: number }
interface Props { abas: Aba[]; valor: string; onChange: (v: string) => void; ariaLabel: string; children: ReactNode }

export function Tabs({ abas, valor, onChange, ariaLabel, children }: Props) {
  return (
    <RTabs.Root value={valor} onValueChange={onChange}>
      <RTabs.List className={s.lista} aria-label={ariaLabel}>
        {abas.map((a) => (
          <RTabs.Trigger key={a.valor} value={a.valor} className={s.aba}>
            {a.rotulo}{a.contador !== undefined && <span className={s.contador}>{a.contador}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  )
}
```

`src/shared/components/Estado.module.css`:
```css
.caixa { padding: var(--espaco-6); text-align: center; color: var(--cor-texto-fraco); display: grid; gap: var(--espaco-3); justify-items: center; }
.skeleton { height: 14px; border-radius: 6px; background: linear-gradient(90deg, #e9ecf0 25%, #f4f6f8 50%, #e9ecf0 75%); background-size: 200% 100%; animation: brilho 1.2s infinite; }
@keyframes brilho { from { background-position: 200% 0 } to { background-position: -200% 0 } }
```

`src/shared/components/Estado.tsx`:
```tsx
import { Button } from './Button'
import s from './Estado.module.css'

export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return <div className={s.caixa} role="status" aria-label="Carregando">{Array.from({ length: linhas }, (_, i) => <div key={i} className={s.skeleton} style={{ width: `${90 - i * 10}%` }} />)}</div>
}
export function Vazio({ texto }: { texto: string }) {
  return <div className={s.caixa}>{texto}</div>
}
export function Erro({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  const msg = erro instanceof Error ? erro.message : 'Algo deu errado'
  return <div className={s.caixa} role="alert"><span>{msg}</span>{tentar && <Button onClick={tentar}>Tentar de novo</Button>}</div>
}
```

`src/shared/components/index.ts`:
```ts
export { Button } from './Button'
export { Badge } from './Badge'
export { Dialog } from './Dialog'
export { ToastProvider, useToast } from './Toast'
export { Campo } from './Campo'
export { Select, type Opcao } from './Select'
export { Tabs, type Aba } from './Tabs'
export { Carregando, Vazio, Erro } from './Estado'
```

- [ ] **Step 3: Declarar CSS Modules para o TypeScript e checar**

Vite já expõe `*.module.css` como `Record<string, string>` via `vite/client`. Garantir em `src/vite-env.d.ts`: `/// <reference types="vite/client" />`.

Run: `pnpm typecheck` → sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/shared/styles src/shared/components src/vite-env.d.ts
git commit -m "feat: tokens, reset e componentes base sobre Radix"
```

---

### Task 15: Sessão, apiClient e queries

**Files:**
- Create: `src/state/sessao.ts`, `src/state/sessao.test.ts`, `src/api/apiClient.ts`, `src/api/apiClient.test.ts`, `src/api/queries/chaves.ts`, `src/api/queries/chamados.ts`, `src/api/queries/lookups.ts`, `src/api/queries/index.ts`

- [ ] **Step 1: Teste da sessão**

`src/state/sessao.test.ts`:
```ts
import { useSessao, CHAVE_SESSAO } from './sessao'
import { MARINA } from '@/tests/fixtures/dados'

describe('sessão', () => {
  it('entrar grava em sessionStorage; sair limpa', () => {
    useSessao.getState().entrar(MARINA)
    expect(useSessao.getState().usuario?.id).toBe(MARINA.id)
    expect(sessionStorage.getItem(CHAVE_SESSAO)).toContain(MARINA.id)
    useSessao.getState().sair()
    expect(useSessao.getState().usuario).toBeNull()
    expect(sessionStorage.getItem(CHAVE_SESSAO)).toBeNull()
  })
  it('não toca em localStorage', () => {
    useSessao.getState().entrar(MARINA)
    expect(localStorage.length).toBe(0)
  })
})
```

- [ ] **Step 2: Implementar sessão**

`src/state/sessao.ts`:
```ts
import { create } from 'zustand'
import type { Usuario } from '@/shared/types'

export const CHAVE_SESSAO = 'itsm:sessao'

interface Sessao { usuario: Usuario | null; entrar(u: Usuario): void; sair(): void }

function lerInicial(): Usuario | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO)
    return bruto ? (JSON.parse(bruto) as Usuario) : null
  } catch { return null }
}

/** Por aba (sessionStorage): Marina e Helena convivem no mesmo navegador (spec §4.1). */
export const useSessao = create<Sessao>((set) => ({
  usuario: lerInicial(),
  entrar(u) { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(u)); set({ usuario: u }) },
  sair() { sessionStorage.removeItem(CHAVE_SESSAO); set({ usuario: null }) },
}))

export const usuarioAtual = () => useSessao.getState().usuario
```
Run: `pnpm test src/state` → PASS

- [ ] **Step 3: apiClient com teste**

`src/api/apiClient.test.ts`:
```ts
import { ApiError, api } from './apiClient'
import { useSessao } from '@/state/sessao'
import { MARINA } from '@/tests/fixtures/dados'

describe('apiClient', () => {
  it('manda X-Usuario-Id e converte não-2xx em ApiError', async () => {
    useSessao.getState().entrar(MARINA)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ codigo: 'conflito', mensagem: 'Rafael pegou antes de você' }), { status: 409 }))
    await expect(api.post('/chamados/x/atribuir', {})).rejects.toMatchObject({ status: 409, codigo: 'conflito', message: 'Rafael pegou antes de você' } satisfies Partial<ApiError>)
    const init = fetchMock.mock.calls[0]![1]!
    expect(new Headers(init.headers).get('X-Usuario-Id')).toBe(MARINA.id)
    fetchMock.mockRestore()
  })
})
```

`src/api/apiClient.ts`:
```ts
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
```
Run: `pnpm test src/api` → PASS

- [ ] **Step 4: Chaves e queries**

`src/api/queries/chaves.ts`:
```ts
export const chaves = {
  chamados: ['chamados'] as const,
  chamado: (id: string) => ['chamado', id] as const,
  historico: ['historico'] as const,
  usuarios: ['usuarios'] as const,
  categorias: ['categorias'] as const,
  grupos: ['grupos'] as const,
  sla: ['sla'] as const,
}
```

`src/api/queries/chamados.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Chamado, Historico, Mensagem, Status } from '@/shared/types'
import { api } from '../apiClient'
import { chaves } from './chaves'
import { hidratar } from '../realtime'

export interface DetalheChamado { chamado: Chamado; mensagens: Mensagem[]; historico: Historico[] }

export function useChamados() {
  return useQuery({ queryKey: chaves.chamados, queryFn: async () => { const d = await api.get<Chamado[]>('/chamados'); hidratar.chamados(d); return d } })
}
export function useChamado(id: string | undefined) {
  return useQuery({ queryKey: chaves.chamado(id ?? ''), enabled: !!id, queryFn: async () => { const d = await api.get<DetalheChamado>(`/chamados/${id}`); hidratar.detalhe(d); return d } })
}
export function useHistorico(habilitado: boolean) {
  return useQuery({ queryKey: chaves.historico, enabled: habilitado, queryFn: async () => { const d = await api.get<Historico[]>('/historico'); hidratar.historico(d); return d } })
}

/** As mutations não mexem no cache: a tela muda quando o evento chega (spec §4.3). */
export function useAbrirChamado() {
  return useMutation({ mutationFn: (corpo: { titulo: string; descricao: string; categoria_id: string }) => api.post<{ id: string }>('/chamados', corpo) })
}
export function useEnviarMensagem(chamadoId: string) {
  return useMutation({ mutationFn: (corpo: { texto: string; interna: boolean }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/mensagens`, corpo) })
}
export function useAtribuir() {
  return useMutation({ mutationFn: ({ chamadoId, consultorId }: { chamadoId: string; consultorId: string }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/atribuir`, { consultor_id: consultorId }) })
}
export function useMudarStatus(chamadoId: string) {
  return useMutation({ mutationFn: (corpo: { para: Status; motivo?: string }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/status`, corpo) })
}
export function useInvalidarTudo() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}
```

`src/api/queries/lookups.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import type { Categoria, Grupo, Sla, Usuario } from '@/shared/types'
import { api } from '../apiClient'
import { chaves } from './chaves'
import { hidratar } from '../realtime'

const umaHora = 3_600_000
export function useUsuarios() {
  return useQuery({ queryKey: chaves.usuarios, staleTime: umaHora, queryFn: async () => { const d = await api.get<Usuario[]>('/usuarios'); hidratar.usuarios(d); return d } })
}
export const useCategorias = () => useQuery({ queryKey: chaves.categorias, staleTime: umaHora, queryFn: () => api.get<Categoria[]>('/categorias') })
export const useGrupos = () => useQuery({ queryKey: chaves.grupos, staleTime: umaHora, queryFn: () => api.get<Grupo[]>('/grupos') })
export const useSla = () => useQuery({ queryKey: chaves.sla, staleTime: umaHora, queryFn: () => api.get<Sla[]>('/sla') })

/** Mapa id → usuário, para nomes em listas. */
export function useMapaUsuarios(): Record<string, Usuario> {
  const { data } = useUsuarios()
  return Object.fromEntries((data ?? []).map((u) => [u.id, u]))
}
```

`src/api/queries/index.ts`:
```ts
export * from './chaves'
export * from './chamados'
export * from './lookups'
```

- [ ] **Step 5: Commit** (o typecheck só passa depois da Task 16, que cria `realtime.ts`; commitar junto com ela ou criar `realtime.ts` com `hidratar` vazio agora)

Criar agora `src/api/realtime.ts` mínimo para o typecheck:
```ts
import type { Chamado, Historico, Usuario } from '@/shared/types'
import type { DetalheChamado } from './queries/chamados'
export const hidratar = {
  chamados(_: Chamado[]) {}, detalhe(_: DetalheChamado) {}, historico(_: Historico[]) {}, usuarios(_: Usuario[]) {},
}
```
```bash
pnpm typecheck && pnpm test
git add src/state src/api
git commit -m "feat: sessão por aba, apiClient e queries do TanStack"
```

---

### Task 16: realtime.ts — espelho, hidratação e projeção

**Files:**
- Modify: `src/api/realtime.ts`
- Create: `src/api/realtime.test.ts`

Spec §4.6. O espelho é um `Estado`; cada `GET` substitui uma fatia; cada evento aplica o `reducer` e projeta nos caches.

- [ ] **Step 1: Teste**

`src/api/realtime.test.ts`:
```ts
import { QueryClient } from '@tanstack/react-query'
import { criarRealtime } from './realtime'
import { chaves } from './queries/chaves'
import { DADOS, MARINA } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'
import type { Socket } from '@/mock-server/socket'

const T = '2026-11-03T13:05:00.000Z'

function socketFake() {
  const cbs = new Set<(e: Evento) => void>()
  const socket: Socket = { assinar(cb) { cbs.add(cb); return () => cbs.delete(cb) }, estado: () => 'conectado' }
  return { socket, emitir: (e: Evento) => cbs.forEach((cb) => cb(e)) }
}

describe('realtime', () => {
  it('hidrata com GET, aplica evento e projeta para os caches', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    rt.hidratar.usuarios(DADOS.usuarios)
    const lista = DADOS.chamados.filter((c) => c.grupo_id === (MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''))
    qc.setQueryData(chaves.chamados, lista)
    rt.hidratar.chamados(lista)
    const alvo = lista.find((c) => c.status === 'aberto')!
    emitir({ id: 'e1', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: alvo.id, consultor_id: MARINA.id } })
    const cache = qc.getQueryData<typeof lista>(chaves.chamados)!
    expect(cache.find((c) => c.id === alvo.id)!.responsavel_id).toBe(MARINA.id)
    expect(cache).toHaveLength(lista.length)
    expect(qc.getQueryData(chaves.chamado(alvo.id))).toBeUndefined() // detalhe não carregado: não cria
    rt.parar()
  })

  it('evento repetido não duplica mensagem; detalhe carregado recebe a mensagem', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    rt.hidratar.usuarios(DADOS.usuarios)
    const c = DADOS.chamados.find((x) => x.status === 'em_atendimento')!
    const det = { chamado: c, mensagens: DADOS.mensagens.filter((m) => m.chamado_id === c.id), historico: DADOS.historico.filter((h) => h.chamado_id === c.id) }
    qc.setQueryData(chaves.chamado(c.id), det)
    rt.hidratar.detalhe(det)
    const e: Evento = { id: 'm', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm', chamado_id: c.id, criada_em: T, autor_id: c.solicitante_id, texto: 'oi', interna: false } }
    emitir(e); emitir(e)
    const novo = qc.getQueryData<typeof det>(chaves.chamado(c.id))!
    expect(novo.mensagens).toHaveLength(det.mensagens.length + 1)
    expect(novo.chamado.atualizado_em).toBe(T)
    rt.parar()
  })

  it('GET depois do evento substitui a fatia (hidratação vence)', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    const c = DADOS.chamados.find((x) => x.status === 'em_atendimento')!
    qc.setQueryData(chaves.chamados, [c])
    rt.hidratar.chamados([c])
    emitir({ id: 's', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'resolvido', motivo: 'x', usuario_id: 'u' } })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)![0]!.status).toBe('resolvido')
    rt.hidratar.chamados([{ ...c, status: 'fechado' }])
    emitir({ id: 'outro', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: 'k' } })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)![0]!.status).toBe('fechado')
    rt.parar()
  })

  it('evento de chamado ainda não carregado é no-op, exceto chamado.aberto', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    qc.setQueryData(chaves.chamados, [])
    rt.hidratar.chamados([])
    emitir({ id: 'x', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: 'fantasma', de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(qc.getQueryData(chaves.chamados)).toEqual([])
    const novo = { ...DADOS.chamados[0]!, id: 'novo' }
    emitir({ id: 'n', tipo: 'chamado.aberto', ocorrido_em: T, payload: novo })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)).toEqual([novo])
    rt.parar()
  })
})
```

- [ ] **Step 2: Implementar**

`src/api/realtime.ts` (substituir o stub):
```ts
import type { QueryClient } from '@tanstack/react-query'
import type { Chamado, Evento, Historico, Usuario } from '@/shared/types'
import { chamadoIdDe } from '@/shared/types'
import { aplicar, estadoVazio, type Estado } from '@/shared/utils/reducer'
import type { Socket } from '@/mock-server/socket'
import { chaves } from './queries/chaves'
import type { DetalheChamado } from './queries/chamados'

export interface Hidratar {
  chamados(lista: Chamado[]): void
  detalhe(d: DetalheChamado): void
  historico(h: Historico[]): void
  usuarios(u: Usuario[]): void
}

export interface Realtime {
  hidratar: Hidratar
  /** chamado_ids que receberam evento; a tela usa para o ponto azul e o aviso de "mensagem nova". */
  onEvento(cb: (e: Evento) => void): () => void
  parar(): void
}

let instancia: Realtime | null = null
/** Usado pelas queries. Antes de `criarRealtime` é no-op (testes de query isolados). */
export const hidratar: Hidratar = {
  chamados: (l) => instancia?.hidratar.chamados(l),
  detalhe: (d) => instancia?.hidratar.detalhe(d),
  historico: (h) => instancia?.hidratar.historico(h),
  usuarios: (u) => instancia?.hidratar.usuarios(u),
}

export function criarRealtime(qc: QueryClient, socket: Socket): Realtime {
  let espelho: Estado = estadoVazio()
  const ouvintes = new Set<(e: Evento) => void>()

  const projetar = (chamadoId: string) => {
    if (qc.getQueryData(chaves.chamados) !== undefined) qc.setQueryData<Chamado[]>(chaves.chamados, Object.values(espelho.chamados))
    const chaveDet = chaves.chamado(chamadoId)
    if (qc.getQueryData(chaveDet) !== undefined && espelho.chamados[chamadoId]) {
      qc.setQueryData<DetalheChamado>(chaveDet, {
        chamado: espelho.chamados[chamadoId]!,
        mensagens: espelho.mensagens[chamadoId] ?? [],
        historico: espelho.historico.filter((h) => h.chamado_id === chamadoId),
      })
    }
    if (qc.getQueryData(chaves.historico) !== undefined) qc.setQueryData<Historico[]>(chaves.historico, espelho.historico)
  }

  const sair = socket.assinar((e) => {
    const antes = espelho
    espelho = aplicar(espelho, e)
    if (espelho === antes) return // duplicado
    projetar(chamadoIdDe(e))
    for (const cb of ouvintes) cb(e)
  })

  const substituirHistoricoDe = (chamadoId: string, novo: Historico[]) =>
    [...espelho.historico.filter((h) => h.chamado_id !== chamadoId), ...novo].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em))

  const rt: Realtime = {
    hidratar: {
      chamados(lista) {
        const chamados: Record<string, Chamado> = {}
        for (const c of lista) chamados[c.id] = c
        espelho = { ...espelho, chamados }
      },
      detalhe(d) {
        espelho = {
          ...espelho,
          chamados: { ...espelho.chamados, [d.chamado.id]: d.chamado },
          mensagens: { ...espelho.mensagens, [d.chamado.id]: d.mensagens },
          historico: substituirHistoricoDe(d.chamado.id, d.historico),
        }
      },
      historico(h) { espelho = { ...espelho, historico: [...h].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em)) } },
      usuarios(u) { espelho = { ...espelho, usuarios: Object.fromEntries(u.map((x) => [x.id, x])) } },
    },
    onEvento(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb) } },
    parar() { sair(); if (instancia === rt) instancia = null },
  }
  instancia = rt
  return rt
}
```

Nota: hidratar substitui a fatia mas **mantém `idsAplicados`**, então um evento já visto que chegue depois de um refetch continua sendo ignorado.

- [ ] **Step 3: Rodar e ver passar**

Run: `pnpm test src/api/realtime` → PASS

- [ ] **Step 4: Commit**

```bash
git add src/api/realtime.ts src/api/realtime.test.ts
git commit -m "feat: espelho de estado no cliente com hidratação e projeção para o TanStack Query"
```

---

### Task 17: Providers, relógio na UI, rotas e layout

**Files:**
- Create: `src/app/providers/QueryProvider.tsx`, `src/app/providers/RealtimeProvider.tsx`, `src/shared/hooks/useNow.ts`, `src/shared/hooks/useUltimaVisita.ts`, `src/shared/utils/datas.ts`, `src/shared/utils/datas.test.ts`, `src/app/routes/index.tsx`, `src/app/routes/RotaProtegida.tsx`, `src/app/layout/Casca.tsx` (+ css), `src/app/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: `datas.ts` com teste**

`src/shared/utils/datas.test.ts`:
```ts
import { formatarDataHora, formatarDuracao, formatarRelativo } from './datas'
import { HELENA, MARINA } from '@/tests/fixtures/dados'

describe('datas', () => {
  it('formata no fuso do usuário', () => {
    const iso = '2026-11-03T13:00:00Z'
    expect(formatarDataHora(iso, HELENA)).toMatch(/13:00/)   // Lisboa, UTC+0 em novembro
    expect(formatarDataHora(iso, MARINA)).toMatch(/10:00/)   // São Paulo, UTC-3
  })
  it('duração em horas e minutos', () => {
    expect(formatarDuracao(98 * 60_000)).toBe('1h 38')
    expect(formatarDuracao(5 * 60_000)).toBe('5 min')
    expect(formatarDuracao(30 * 3_600_000)).toBe('1 d 6h')
    expect(formatarDuracao(24 * 3_600_000)).toBe('1 d')
    expect(formatarDuracao(3 * 3_600_000)).toBe('3h')
  })
  it('relativo: vence em / venceu há', () => {
    expect(formatarRelativo(40 * 60_000)).toBe('vence em 40 min')
    expect(formatarRelativo(-3 * 3_600_000)).toBe('venceu há 3h')
  })
})
```

`src/shared/utils/datas.ts`:
```ts
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
  return restanteMs >= 0 ? `vence em ${formatarDuracao(restanteMs)}` : `venceu há ${formatarDuracao(-restanteMs)}`
}
```
Run: `pnpm test src/shared/utils/datas` → PASS. Se o teste de fuso falhar por formato de locale (`pt-PT` pode usar "13:00" ou "13h00"), afrouxar para `/13/`.

- [ ] **Step 2: Hooks `useNow` e `useUltimaVisita`**

`src/shared/hooks/useNow.ts`:
```ts
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
```

`src/shared/hooks/useUltimaVisita.ts`:
```ts
import { useCallback, useSyncExternalStore } from 'react'

const chave = (usuarioId: string, chamadoId?: string) => `itsm:visita:${usuarioId}${chamadoId ? `:${chamadoId}` : ''}`
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((cb) => cb())

export function lerUltimaVisita(usuarioId: string, chamadoId?: string): number | null {
  try { const v = localStorage.getItem(chave(usuarioId, chamadoId)); return v ? Number(v) : null } catch { return null }
}
export function marcarVisita(usuarioId: string, agoraMs: number, chamadoId?: string) {
  try { localStorage.setItem(chave(usuarioId, chamadoId), String(agoraMs)); avisar() } catch { /* storage bloqueado */ }
}

/** Spec §5.1 (por chamado) e §5.3 (geral). Chaves por usuário para não vazar entre perfis na mesma máquina. */
export function useUltimaVisita(usuarioId: string, chamadoId?: string) {
  const assinar = useCallback((cb: () => void) => { ouvintes.add(cb); return () => { ouvintes.delete(cb) } }, [])
  const valor = useSyncExternalStore(assinar, () => lerUltimaVisita(usuarioId, chamadoId))
  const marcar = useCallback((agoraMs: number) => marcarVisita(usuarioId, agoraMs, chamadoId), [usuarioId, chamadoId])
  return [valor, marcar] as const
}
```

- [ ] **Step 3: Providers**

`src/app/providers/QueryProvider.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

`src/app/providers/RealtimeProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { criarRealtime, type Realtime } from '@/api/realtime'
import type { MockServer } from '@/mock-server'
import { queryClient } from './QueryProvider'

interface Ctx { realtime: Realtime; servidor: MockServer }
const RealtimeCtx = createContext<Ctx | null>(null)

/**
 * Cria o realtime num effect, não em useMemo: em StrictMode o useMemo roda duas vezes, o React guarda a
 * primeira instância mas a global `instancia` de realtime.ts aponta para a segunda, e o cleanup do
 * StrictMode desassina a instância do contexto. Com effect + cleanup, mount → unmount → mount fica correto.
 */
export function RealtimeProvider({ servidor, children }: { servidor: MockServer; children: ReactNode }) {
  const [realtime, setRealtime] = useState<Realtime | null>(null)
  useEffect(() => {
    const rt = criarRealtime(queryClient, servidor.socket)
    setRealtime(rt)
    return () => rt.parar()
  }, [servidor])
  const ctx = useMemo(() => (realtime ? { realtime, servidor } : null), [realtime, servidor])
  if (!ctx) return null
  return <RealtimeCtx.Provider value={ctx}>{children}</RealtimeCtx.Provider>
}

export function useRealtime(): Ctx {
  const ctx = useContext(RealtimeCtx)
  if (!ctx) throw new Error('useRealtime fora do RealtimeProvider')
  return ctx
}
```

- [ ] **Step 4: Rotas e guarda**

`src/app/routes/RotaProtegida.tsx`:
```tsx
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import type { Perfil } from '@/shared/types'
import { useSessao } from '@/state/sessao'

export const ROTA_INICIAL: Record<Perfil, string> = { consultor: '/fila', gestor: '/equipe', cliente: '/meus-chamados' }

export function RotaProtegida({ perfis }: { perfis?: Perfil[] }) {
  const usuario = useSessao((s) => s.usuario)
  const loc = useLocation()
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: loc.pathname }} />
  if (perfis && !perfis.includes(usuario.perfil)) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Sem acesso</h1>
        <p>Esta tela não é do seu perfil. <Link to={ROTA_INICIAL[usuario.perfil]}>Ir para a minha tela</Link></p>
      </main>
    )
  }
  return <Outlet />
}
```

`src/app/routes/index.tsx`:
```tsx
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth'
import { ChamadoPage, FilaConsultorPage, MeusChamadosPage, NovoChamadoPage } from '@/features/chamados'
import { EquipePage } from '@/features/equipe'
import { useSessao } from '@/state/sessao'
import { Casca } from '../layout/Casca'
import { RotaProtegida, ROTA_INICIAL } from './RotaProtegida'

function Raiz() {
  const usuario = useSessao((s) => s.usuario)
  return <Navigate to={usuario ? ROTA_INICIAL[usuario.perfil] : '/entrar'} replace />
}

export function Rotas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route element={<RotaProtegida />}>
          <Route element={<Casca />}>
            <Route path="/" element={<Raiz />} />
            <Route path="/chamados/:id" element={<ChamadoPage />} />
            <Route element={<RotaProtegida perfis={['consultor']} />}>
              <Route path="/fila" element={<FilaConsultorPage />} />
              <Route path="/fila/:id" element={<FilaConsultorPage />} />
            </Route>
            <Route element={<RotaProtegida perfis={['gestor']} />}>
              <Route path="/equipe" element={<EquipePage />} />
            </Route>
            <Route element={<RotaProtegida perfis={['cliente']} />}>
              <Route path="/meus-chamados" element={<MeusChamadosPage />} />
              <Route path="/meus-chamados/novo" element={<NovoChamadoPage />} />
            </Route>
            <Route path="*" element={<main style={{ padding: 24 }}><h1>Página não encontrada</h1><Link to="/">Ir para a minha tela</Link></main>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

As páginas importadas ainda não existem. Criar **stubs** em arquivos `.tsx` dentro de `pages/` (nunca JSX em `.ts`) e barrels `.ts` que só reexportam:

`src/features/auth/pages/LoginPage.tsx`: `export function LoginPage() { return <p>login</p> }` · `src/features/auth/index.ts`: `export { LoginPage } from './pages/LoginPage'`.

`src/features/chamados/pages/{ChamadoPage,FilaConsultorPage,MeusChamadosPage,NovoChamadoPage}.tsx` com o mesmo padrão · `src/features/chamados/index.ts`:
```ts
export { ChamadoPage } from './pages/ChamadoPage'
export { FilaConsultorPage } from './pages/FilaConsultorPage'
export { MeusChamadosPage } from './pages/MeusChamadosPage'
export { NovoChamadoPage } from './pages/NovoChamadoPage'
```
`src/features/equipe/pages/EquipePage.tsx` e `src/features/equipe/index.ts` idem. As Tasks 18 a 22 substituem os stubs pelas páginas reais, mantendo os barrels.

- [ ] **Step 5: Casca**

`src/app/layout/Casca.module.css`:
```css
.casca { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
.topo { display: flex; align-items: center; gap: var(--espaco-4); padding: var(--espaco-2) var(--espaco-4); background: var(--cor-superficie); border-bottom: 1px solid var(--cor-borda); }
.marca { font-weight: 700; }
.espaco { flex: 1; }
.usuario { color: var(--cor-texto-fraco); }
.conteudo { min-height: 0; overflow: auto; }
.faixaOffline { background: var(--sla-atencao); color: #fff; padding: 4px 16px; font-size: 13px; }
```

`src/app/layout/Casca.tsx`:
```tsx
import { Outlet, useNavigate } from 'react-router'
import { Button } from '@/shared/components'
import { useSessao } from '@/state/sessao'
import { useRealtime } from '../providers/RealtimeProvider'
import { PainelSimulador } from './PainelSimulador'
import s from './Casca.module.css'

const ROTULO_PERFIL = { consultor: 'Consultora', gestor: 'Gestor', cliente: 'Cliente' } as const

export function Casca() {
  const usuario = useSessao((st) => st.usuario)!
  const sair = useSessao((st) => st.sair)
  const nav = useNavigate()
  const { servidor } = useRealtime()
  return (
    <div className={s.casca}>
      <header className={s.topo}>
        <span className={s.marca}>Chamados</span>
        <span className={s.espaco} />
        <span className={s.usuario}>{usuario.nome} · {ROTULO_PERFIL[usuario.perfil]}</span>
        <Button pequeno onClick={() => { sair(); nav('/entrar') }}>Sair</Button>
      </header>
      {/* lido uma vez por render: a conectividade do bus é fixa por aba */}
      {servidor.socket.estado() === 'desconectado' && <div className={s.faixaOffline} role="status">Sem atualização em tempo real nesta aba. Os dados são recarregados ao voltar o foco.</div>}
      <main className={s.conteudo}><Outlet /></main>
      <PainelSimulador />
    </div>
  )
}
```

`src/app/layout/PainelSimulador.tsx`: criar stub agora (`export function PainelSimulador() { return null }`); a Task 23 implementa.

- [ ] **Step 6: `App.tsx` e `main.tsx`**

`src/app/App.tsx`:
```tsx
import type { MockServer } from '@/mock-server'
import { ToastProvider } from '@/shared/components'
import { QueryProvider } from './providers/QueryProvider'
import { RealtimeProvider } from './providers/RealtimeProvider'
import { Rotas } from './routes'

export function App({ servidor }: { servidor: MockServer }) {
  return (
    <QueryProvider>
      <RealtimeProvider servidor={servidor}>
        <ToastProvider>
          <Rotas />
        </ToastProvider>
      </RealtimeProvider>
    </QueryProvider>
  )
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/tokens.css'
import '@/shared/styles/reset.css'
import { App } from '@/app/App'
import { iniciarMockServer } from '@/mock-server'
import { usuarioAtual } from '@/state/sessao'

const servidor = await iniciarMockServer(usuarioAtual)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App servidor={servidor} />
  </StrictMode>,
)
```
Top-level `await` exige `"target": "ES2022"` ou superior em `tsconfig.app.json` e `build.target: 'es2022'` no Vite (padrão do Vite 8 já atende).

- [ ] **Step 7: Verificar no navegador**

```bash
pnpm typecheck && pnpm test
pnpm dev
```
Abrir `http://localhost:5173`: deve redirecionar para `/entrar` e mostrar o stub "login". No console, nenhum erro; na aba Application → Service Workers, o `mockServiceWorker.js` ativo.

- [ ] **Step 8: Commit**

```bash
git add src/app src/shared/hooks src/shared/utils/datas.ts src/shared/utils/datas.test.ts src/main.tsx src/features
git commit -m "feat: providers, rotas protegidas por perfil, casca e bootstrap do app"
```

---

### Task 18: Login com e-mail e PIN

**Files:**
- Create: `src/features/auth/pages/LoginPage.tsx` (+ `.module.css`), `src/features/auth/pages/LoginPage.test.tsx`, `src/features/auth/services/entrar.ts`
- Modify: `src/features/auth/index.ts`

- [ ] **Step 1: Teste**

`src/features/auth/pages/LoginPage.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './LoginPage'
import { useSessao } from '@/state/sessao'
import { HELENA, MARINA } from '@/tests/fixtures/dados'

function montar() {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/entrar']}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/fila" element={<p>tela da fila</p>} />
          <Route path="/meus-chamados" element={<p>tela do cliente</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('PIN errado mostra erro do servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ codigo: 'nao_autenticado', mensagem: 'E-mail ou PIN incorretos' }), { status: 401 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), MARINA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou PIN incorretos')
    expect(useSessao.getState().usuario).toBeNull()
  })

  it('consultora entra e vai para /fila', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(MARINA), { status: 200 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), MARINA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(screen.getByText('tela da fila')).toBeInTheDocument())
    expect(useSessao.getState().usuario?.id).toBe(MARINA.id)
  })

  it('cliente entra e vai para /meus-chamados', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(HELENA), { status: 200 }))
    montar()
    await userEvent.type(screen.getByLabelText(/e-mail/i), HELENA.email)
    await userEvent.type(screen.getByLabelText(/pin/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(screen.getByText('tela do cliente')).toBeInTheDocument())
  })

  it('"quem posso ser?" preenche o e-mail', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: /quem posso ser/i }))
    await userEvent.click(screen.getByRole('button', { name: /Helena Fernandes/ }))
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue('helena.fernandes@lusitania.example')
  })
})
```

- [ ] **Step 2: Implementar**

`src/features/auth/services/entrar.ts`:
```ts
import { api } from '@/api/apiClient'
import type { Usuario } from '@/shared/types'

export const entrar = (email: string, pin: string) => api.post<Usuario>('/auth/entrar', { email, pin })

/** Os três do enunciado. PIN padrão para todos: 123456 (README). */
export const PERSONAS = [
  { nome: 'Marina Almeida', perfil: 'Consultora', email: 'marina.almeida@suporte.example' },
  { nome: 'Ricardo Monteiro', perfil: 'Gestor', email: 'ricardo.monteiro@suporte.example' },
  { nome: 'Helena Fernandes', perfil: 'Cliente', email: 'helena.fernandes@lusitania.example' },
] as const
export const PIN_PADRAO = '123456'
```

`src/features/auth/pages/LoginPage.module.css`:
```css
.pagina { min-height: 100%; display: grid; place-items: center; padding: var(--espaco-4); }
.cartao { width: min(400px, 100%); background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio); padding: var(--espaco-6); display: grid; gap: var(--espaco-4); }
.titulo { margin: 0; font-size: 20px; }
.personas { display: grid; gap: var(--espaco-2); }
.persona { text-align: left; display: grid; }
.persona small { color: var(--cor-texto-fraco); }
.link { background: none; border: 0; color: var(--cor-primaria); padding: 0; text-decoration: underline; }
```

`src/features/auth/pages/LoginPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { Usuario } from '@/shared/types'
import { api } from '@/api/apiClient'
import { chaves } from '@/api/queries/chaves'
import { hidratar } from '@/api/realtime'
import { Button, Campo } from '@/shared/components'
import { useSessao } from '@/state/sessao'
import { ROTA_INICIAL } from '@/app/routes/RotaProtegida'
import { entrar, PERSONAS, PIN_PADRAO } from '../services/entrar'
import s from './LoginPage.module.css'

export function LoginPage() {
  const usuario = useSessao((st) => st.usuario)
  const guardar = useSessao((st) => st.entrar)
  const nav = useNavigate()
  const qc = useQueryClient()
  const loc = useLocation() as { state?: { de?: string } }
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [mostrarPersonas, setMostrarPersonas] = useState(false)
  const m = useMutation({
    mutationFn: () => entrar(email.trim(), pin),
    onSuccess(u) {
      guardar(u)
      // hidrata `usuarios` do espelho já no login (spec §4.6): o reducer precisa do perfil do autor
      void qc.prefetchQuery({ queryKey: chaves.usuarios, queryFn: async () => { const d = await api.get<Usuario[]>('/usuarios'); hidratar.usuarios(d); return d } })
      nav(loc.state?.de && loc.state.de !== '/' ? loc.state.de : ROTA_INICIAL[u.perfil], { replace: true })
    },
  })
  if (usuario) return <Navigate to={ROTA_INICIAL[usuario.perfil]} replace />

  const enviar = (e: FormEvent) => { e.preventDefault(); if (pin.length === 6) m.mutate() }
  return (
    <main className={s.pagina}>
      <form className={s.cartao} onSubmit={enviar} aria-labelledby="titulo-login">
        <h1 id="titulo-login" className={s.titulo}>Entrar nos chamados</h1>
        <Campo rotulo="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Campo rotulo="PIN (6 dígitos)" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required ajuda={`Ambiente de demonstração: o PIN de todos é ${PIN_PADRAO}`} />
        {m.isError && <p role="alert" style={{ color: 'var(--sla-vencido)', margin: 0 }}>{m.error.message}</p>}
        <Button type="submit" variante="primaria" disabled={m.isPending || pin.length !== 6}>{m.isPending ? 'Entrando…' : 'Entrar'}</Button>
        <button type="button" className={s.link} onClick={() => setMostrarPersonas((v) => !v)}>Quem posso ser?</button>
        {mostrarPersonas && (
          <div className={s.personas}>
            {PERSONAS.map((p) => (
              <Button key={p.email} className={s.persona} onClick={() => { setEmail(p.email); setPin(PIN_PADRAO) }}>
                <span>{p.nome}</span><small>{p.perfil} · {p.email}</small>
              </Button>
            ))}
          </div>
        )}
      </form>
    </main>
  )
}
```

`src/features/auth/index.ts`:
```ts
export { LoginPage } from './pages/LoginPage'
export { PERSONAS, PIN_PADRAO } from './services/entrar'
```

- [ ] **Step 3: Rodar**

Run: `pnpm test src/features/auth` → PASS. Em `pnpm dev`, entrar como Marina leva para `/fila` (ainda stub).

- [ ] **Step 4: Commit**

```bash
git add src/features/auth
git commit -m "feat: login por e-mail e PIN com atalho das três personas"
```

---

### Task 19: Detalhe do chamado compartilhado

**Files:**
- Create em `src/features/chamados/components/`: `CabecalhoChamado.tsx`, `Conversa.tsx`, `Conversa.test.tsx`, `CaixaResposta.tsx`, `AcoesStatus.tsx`, `HistoricoLista.tsx`, `BadgePrazo.tsx`, `DetalheChamado.tsx`, `detalhe.module.css`
- Create: `src/features/chamados/pages/ChamadoPage.tsx`, `src/features/chamados/utils/rotulos.ts`
- Modify: `src/features/chamados/index.ts`

Spec §5.4. Um componente, três visões por `usuario.perfil`.

- [ ] **Step 1: Rótulos**

`src/features/chamados/utils/rotulos.ts`:
```ts
import type { Chamado, Usuario } from '@/shared/types'
import { ROTULO_STATUS, ROTULO_STATUS_CLIENTE } from '@/shared/utils/status'

export function rotuloStatus(c: Chamado, perfil: Usuario['perfil'], nomeResponsavel?: string): string {
  if (perfil !== 'cliente') return ROTULO_STATUS[c.status]
  return ROTULO_STATUS_CLIENTE[c.status].replace('{nome}', nomeResponsavel ?? 'nossa equipe')
}

export const TIPO_PRAZO = { primeira_resposta: 'primeira resposta', resolucao: 'resolução' } as const
```

- [ ] **Step 2: Badge de prazo**

`src/features/chamados/components/BadgePrazo.tsx`:
```tsx
import type { Chamado } from '@/shared/types'
import { Badge } from '@/shared/components'
import { faixaSla, prazoRelevante, restanteMs } from '@/shared/utils/sla'
import { formatarRelativo } from '@/shared/utils/datas'
import { TIPO_PRAZO } from '../utils/rotulos'

export function BadgePrazo({ chamado, agora }: { chamado: Chamado; agora: number }) {
  const faixa = faixaSla(chamado, agora)
  if (faixa === 'encerrado') return <Badge faixa="encerrado">encerrado</Badge>
  if (faixa === 'pausado') return <Badge faixa="pausado" title="SLA pausado enquanto aguarda o cliente">pausado</Badge>
  const { tipo } = prazoRelevante(chamado)
  return <Badge faixa={faixa} title={`Prazo de ${TIPO_PRAZO[tipo]}`}>{formatarRelativo(restanteMs(chamado, agora))}</Badge>
}
```

- [ ] **Step 3: Teste da conversa (aviso de mensagem nova sem rolar)**

`src/features/chamados/components/Conversa.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { Conversa } from './Conversa'
import { DADOS, HELENA, MARINA } from '@/tests/fixtures/dados'
import type { Mensagem } from '@/shared/types'

const usuarios = Object.fromEntries(DADOS.usuarios.map((u) => [u.id, u]))
const msg = (id: string, interna = false): Mensagem => ({ id, chamado_id: 'c', criada_em: '2026-11-03T13:00:00Z', autor_id: HELENA.id, texto: `texto ${id}`, interna })

describe('Conversa', () => {
  beforeAll(() => {
    // jsdom não mede layout; o virtualizador precisa de altura > 0
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 })
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ height: 600, width: 400, top: 0, left: 0, bottom: 600, right: 400, x: 0, y: 0, toJSON() {} }) })
  })

  it('mensagem nova enquanto digita mostra aviso e não rola', () => {
    const { rerender } = render(<Conversa mensagens={[msg('1')]} usuarios={usuarios} usuario={MARINA} digitando />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    rerender(<Conversa mensagens={[msg('1'), msg('2')]} usuarios={usuarios} usuario={MARINA} digitando />)
    expect(screen.getByRole('status')).toHaveTextContent('1 mensagem nova')
  })

  it('sem texto na caixa, não mostra aviso (rola sozinho)', () => {
    const { rerender } = render(<Conversa mensagens={[msg('1')]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    rerender(<Conversa mensagens={[msg('1'), msg('2')]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('nota interna tem rótulo "só a equipe vê" para a equipe', () => {
    render(<Conversa mensagens={[msg('1', true)]} usuarios={usuarios} usuario={MARINA} digitando={false} />)
    expect(screen.getByText(/só a equipe vê/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Implementar conversa, caixa, cabeçalho, histórico, ações**

`src/features/chamados/components/detalhe.module.css`:
```css
.detalhe { display: grid; grid-template-rows: auto 1fr auto; height: 100%; min-height: 0; background: var(--cor-superficie); }
.cabecalho { padding: var(--espaco-3) var(--espaco-4); border-bottom: 1px solid var(--cor-borda); display: grid; gap: var(--espaco-2); }
.linhaTitulo { display: flex; align-items: center; gap: var(--espaco-3); flex-wrap: wrap; }
.numero { color: var(--cor-texto-fraco); font-family: var(--fonte-mono); }
.titulo { margin: 0; font-size: 16px; }
.meta { display: flex; gap: var(--espaco-4); flex-wrap: wrap; color: var(--cor-texto-fraco); font-size: 13px; }
.barraPrazo { padding: 6px 12px; border-radius: 6px; color: #fff; font-weight: 600; }
.ultima_hora { background: var(--sla-ultima-hora); } .vencido { background: var(--sla-vencido); }
.conversa { position: relative; overflow: auto; padding: var(--espaco-3) var(--espaco-4); }
.mensagem { padding: var(--espaco-2) var(--espaco-3); border-radius: var(--raio); background: var(--cor-fundo); margin-bottom: var(--espaco-2); }
.minha { background: #e9f0ff; }
.interna { background: var(--cor-interna); border: 1px dashed var(--cor-interna-borda); }
.autor { font-size: 12px; color: var(--cor-texto-fraco); display: flex; gap: var(--espaco-2); }
.rotuloInterna { font-weight: 600; color: #8a6d00; }
.avisoNova { position: sticky; bottom: 8px; display: flex; justify-content: center; }
.caixa { border-top: 1px solid var(--cor-borda); padding: var(--espaco-3) var(--espaco-4); display: grid; gap: var(--espaco-2); }
.caixaLinha { display: flex; gap: var(--espaco-2); align-items: center; flex-wrap: wrap; }
.textarea { width: 100%; min-height: 72px; padding: 8px 10px; border: 1px solid var(--cor-borda); border-radius: var(--raio); resize: vertical; }
.textarea.interna { background: var(--cor-interna); }
.acoes { display: flex; gap: var(--espaco-2); flex-wrap: wrap; }
.historico { list-style: none; margin: 0; padding: var(--espaco-3) var(--espaco-4); display: grid; gap: var(--espaco-2); font-size: 13px; }
.historico li { display: grid; grid-template-columns: 110px 1fr; gap: var(--espaco-2); }
.quando { color: var(--cor-texto-fraco); }
.passos { display: flex; gap: var(--espaco-2); flex-wrap: wrap; padding: var(--espaco-2) var(--espaco-4); font-size: 13px; color: var(--cor-texto-fraco); border-bottom: 1px solid var(--cor-borda); }
```

`src/features/chamados/components/Conversa.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Mensagem, Usuario } from '@/shared/types'
import { Button } from '@/shared/components'
import { formatarDataHora } from '@/shared/utils/datas'
import s from './detalhe.module.css'

interface Props { mensagens: Mensagem[]; usuarios: Record<string, Usuario>; usuario: Usuario; digitando: boolean }

/** Virtualizada (há um chamado com 1.500 mensagens). Mensagem nova com texto na caixa vira aviso, não rolagem (spec §5.1). */
export function Conversa({ mensagens, usuarios, usuario, digitando }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [novas, setNovas] = useState(0)
  const totalAnterior = useRef(mensagens.length)
  const noFim = useRef(true)

  const virtual = useVirtualizer({ count: mensagens.length, getScrollElement: () => ref.current, estimateSize: () => 72, overscan: 8, measureElement: (el) => el.getBoundingClientRect().height })

  const rolarParaFim = () => { if (mensagens.length) virtual.scrollToIndex(mensagens.length - 1, { align: 'end' }); setNovas(0) }

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

  return (
    <div className={s.conversa} ref={ref} onScroll={aoRolar} aria-label="Conversa">
      <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
        {virtual.getVirtualItems().map((item) => {
          const m = mensagens[item.index]!
          const autor = usuarios[m.autor_id]
          const minha = m.autor_id === usuario.id
          return (
            <div key={m.id} data-index={item.index} ref={virtual.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}>
              <div className={`${s.mensagem} ${minha ? s.minha : ''} ${m.interna ? s.interna : ''}`}>
                <div className={s.autor}>
                  <strong>{autor?.nome ?? 'Alguém'}</strong>
                  <span>{formatarDataHora(m.criada_em, usuario)}</span>
                  {m.interna && <span className={s.rotuloInterna}>Nota interna · só a equipe vê</span>}
                </div>
                <div>{m.texto}</div>
              </div>
            </div>
          )
        })}
      </div>
      {novas > 0 && (
        <div className={s.avisoNova} role="status">
          <Button pequeno variante="primaria" onClick={rolarParaFim}>{novas === 1 ? '1 mensagem nova' : `${novas} mensagens novas`} · ver</Button>
        </div>
      )}
    </div>
  )
}
```

`src/features/chamados/components/CaixaResposta.tsx`:
```tsx
import { useState } from 'react'
import type { Usuario } from '@/shared/types'
import { Button, useToast } from '@/shared/components'
import { useEnviarMensagem } from '@/api/queries'
import s from './detalhe.module.css'

interface Props { chamadoId: string; usuario: Usuario; onDigitando(v: boolean): void; textoInicial?: string }

export function CaixaResposta({ chamadoId, usuario, onDigitando, textoInicial = '' }: Props) {
  const [texto, setTexto] = useState(textoInicial)
  const [interna, setInterna] = useState(false)
  const { notificar } = useToast()
  const enviar = useEnviarMensagem(chamadoId)
  const equipe = usuario.perfil !== 'cliente'
  const mandar = () => {
    if (!texto.trim()) return
    enviar.mutate({ texto: texto.trim(), interna: equipe && interna }, {
      onSuccess() { setTexto(''); onDigitando(false) },
      onError(e) { notificar({ titulo: 'Não foi possível enviar', descricao: e.message, tipo: 'erro' }) },
    })
  }
  return (
    <div className={s.caixa}>
      {equipe && (
        <div className={s.caixaLinha} role="radiogroup" aria-label="Tipo de mensagem">
          <label><input type="radio" name="tipo" checked={!interna} onChange={() => setInterna(false)} /> Resposta ao cliente</label>
          <label><input type="radio" name="tipo" checked={interna} onChange={() => setInterna(true)} /> Nota interna (só a equipe vê)</label>
        </div>
      )}
      <textarea className={`${s.textarea} ${interna ? s.interna : ''}`} aria-label={interna ? 'Nota interna' : 'Resposta'} value={texto}
        placeholder={interna ? 'Anotação para colegas…' : 'Escreva sua resposta…'}
        onChange={(e) => { setTexto(e.target.value); onDigitando(e.target.value.trim().length > 0) }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) mandar() }} />
      <div className={s.caixaLinha}>
        <Button variante="primaria" onClick={mandar} disabled={enviar.isPending || !texto.trim()}>{interna ? 'Salvar nota' : 'Enviar'}</Button>
        <small style={{ color: 'var(--cor-texto-fraco)' }}>Ctrl+Enter envia</small>
      </div>
    </div>
  )
}
```

`src/features/chamados/components/AcoesStatus.tsx`:
```tsx
import { useState } from 'react'
import type { Chamado, Status, Usuario, UsuarioConsultor } from '@/shared/types'
import { Button, Campo, Dialog, Select, useToast } from '@/shared/components'
import { useAtribuir, useMudarStatus } from '@/api/queries'
import { ehReabertura, motivoAutomatico, ROTULO_ACAO, transicoesPermitidas } from '@/shared/utils/status'
import s from './detalhe.module.css'

interface Props { chamado: Chamado; usuario: Usuario; consultoresDoGrupo: UsuarioConsultor[]; reabrirInicial?: string }

/** Menu de ações filtrado por §6.1 e §7. Toda transição manual abre diálogo com motivo obrigatório. */
export function AcoesStatus({ chamado, usuario, consultoresDoGrupo, reabrirInicial }: Props) {
  const { notificar } = useToast()
  const mudar = useMudarStatus(chamado.id)
  const atribuir = useAtribuir()
  const [alvo, setAlvo] = useState<Status | null>(reabrirInicial !== undefined ? 'em_atendimento' : null)
  const [motivo, setMotivo] = useState(reabrirInicial ?? '')
  const [destino, setDestino] = useState<string | undefined>()
  const [atribuindo, setAtribuindo] = useState(false)

  const erro = (e: Error) => notificar({ titulo: 'Não deu certo', descricao: e.message, tipo: 'erro' })
  const transicoes = transicoesPermitidas(chamado.status, usuario.perfil)
  const semDono = chamado.responsavel_id === null
  const podePegar = usuario.perfil === 'consultor' && semDono && chamado.grupo_id === usuario.grupo_id
  const podeAtribuir = usuario.perfil === 'gestor' && chamado.status !== 'resolvido' && chamado.status !== 'fechado'

  const executar = (para: Status) => {
    const automatico = motivoAutomatico(chamado.status, para, usuario.perfil)
    if (automatico) mudar.mutate({ para }, { onError: erro })
    else { setAlvo(para); setMotivo('') }
  }
  const confirmar = () => {
    if (!alvo || !motivo.trim()) return
    mudar.mutate({ para: alvo, motivo: motivo.trim() }, { onSuccess: () => setAlvo(null), onError: erro })
  }
  const rotulo = (para: Status) => {
    const base = ROTULO_ACAO[`${chamado.status}>${para}`] ?? para
    if (usuario.perfil === 'cliente' && chamado.status === 'resolvido' && para === 'em_atendimento') return 'Ainda não resolveu'
    if (usuario.perfil === 'cliente' && chamado.status === 'resolvido' && para === 'fechado') return 'Resolvido? Confirmar'
    return base
  }

  return (
    <div className={s.acoes}>
      {podePegar && <Button variante="primaria" onClick={() => atribuir.mutate({ chamadoId: chamado.id, consultorId: usuario.id }, { onError: erro })} disabled={atribuir.isPending}>Pegar para atender</Button>}
      {podeAtribuir && <Button onClick={() => setAtribuindo(true)}>{semDono ? 'Atribuir a…' : 'Reatribuir a…'}</Button>}
      {transicoes.map((para) => <Button key={para} onClick={() => executar(para)} disabled={mudar.isPending}>{rotulo(para)}</Button>)}

      <Dialog aberto={alvo !== null} onFechar={() => setAlvo(null)} titulo={alvo && ehReabertura(chamado.status, alvo) ? 'Reabrir chamado' : 'Mudar status'}
        acoes={<><Button onClick={() => setAlvo(null)}>Cancelar</Button><Button variante="primaria" onClick={confirmar} disabled={!motivo.trim() || mudar.isPending}>Confirmar</Button></>}>
        <Campo multilinha rotulo={usuario.perfil === 'cliente' ? 'Conte o que aconteceu' : 'Motivo'} value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus required />
      </Dialog>

      <Dialog aberto={atribuindo} onFechar={() => setAtribuindo(false)} titulo="Atribuir chamado"
        acoes={<><Button onClick={() => setAtribuindo(false)}>Cancelar</Button>
          <Button variante="primaria" disabled={!destino || atribuir.isPending} onClick={() => destino && atribuir.mutate({ chamadoId: chamado.id, consultorId: destino }, { onSuccess: () => setAtribuindo(false), onError: erro })}>Atribuir</Button></>}>
        <Select ariaLabel="Consultor" valor={destino} onChange={setDestino} opcoes={consultoresDoGrupo.map((c) => ({ valor: c.id, rotulo: c.nome }))} placeholder="Escolha o consultor" />
      </Dialog>
    </div>
  )
}
```

`src/features/chamados/components/HistoricoLista.tsx`:
```tsx
import type { Historico, Usuario } from '@/shared/types'
import { formatarDataHora } from '@/shared/utils/datas'
import { ROTULO_STATUS } from '@/shared/utils/status'
import s from './detalhe.module.css'

interface Props { historico: Historico[]; usuarios: Record<string, Usuario>; usuario: Usuario }

export function HistoricoLista({ historico, usuarios, usuario }: Props) {
  if (historico.length === 0) return <p className={s.historico}>Sem histórico.</p>
  return (
    <ol className={s.historico} aria-label="Histórico">
      {[...historico].reverse().map((h) => (
        <li key={h.id}>
          <span className={s.quando}>{formatarDataHora(h.ocorrido_em, usuario)}</span>
          <span>
            {h.tipo === 'atribuicao'
              ? <>Atribuído a <strong>{usuarios[h.usuario_id]?.nome ?? 'alguém'}</strong></>
              : <>{h.de ? ROTULO_STATUS[h.de] : '—'} → <strong>{h.para ? ROTULO_STATUS[h.para] : '—'}</strong> por {usuarios[h.usuario_id]?.nome ?? 'alguém'}{h.motivo && <> · <em>{h.motivo}</em></>}</>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Visão do cliente: só passos de status, sem motivo (spec §5.4). */
export function PassosCliente({ historico, usuario }: { historico: Historico[]; usuario: Usuario }) {
  const passos = historico.filter((h) => h.tipo === 'status' && h.para)
  if (!passos.length) return null
  return (
    <div className={s.passos} aria-label="O que aconteceu">
      {passos.map((h) => <span key={h.id}>{formatarDataHora(h.ocorrido_em, usuario)} · {ROTULO_STATUS[h.para!]}</span>)}
    </div>
  )
}
```

`src/features/chamados/components/CabecalhoChamado.tsx`:
```tsx
import type { Chamado, Usuario } from '@/shared/types'
import { Badge } from '@/shared/components'
import { faixaSla, prazoRelevante, restanteMs } from '@/shared/utils/sla'
import { formatarDiaHora, formatarRelativo } from '@/shared/utils/datas'
import { rotuloStatus, TIPO_PRAZO } from '../utils/rotulos'
import { BadgePrazo } from './BadgePrazo'
import s from './detalhe.module.css'

interface Props { chamado: Chamado; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; reabertoEm?: string; categoria?: string }

export function CabecalhoChamado({ chamado, usuario, usuarios, agora, reabertoEm, categoria }: Props) {
  const responsavel = chamado.responsavel_id ? usuarios[chamado.responsavel_id] : undefined
  const solicitante = usuarios[chamado.solicitante_id]
  const cliente = usuario.perfil === 'cliente'
  const faixa = faixaSla(chamado, agora)
  const { tipo, prazo } = prazoRelevante(chamado)
  return (
    <header className={s.cabecalho}>
      <div className={s.linhaTitulo}>
        <span className={s.numero}>#{chamado.numero}</span>
        <h1 className={s.titulo}>{chamado.titulo}</h1>
        <Badge faixa="neutro">{rotuloStatus(chamado, usuario.perfil, responsavel?.nome)}</Badge>
        {!cliente && <BadgePrazo chamado={chamado} agora={agora} />}
        {reabertoEm && <Badge faixa="neutro">reaberto em {formatarDiaHora(reabertoEm, usuario)}</Badge>}
      </div>
      {!cliente && (faixa === 'ultima_hora' || faixa === 'vencido') && (
        <div className={`${s.barraPrazo} ${s[faixa]}`} role="alert">{formatarRelativo(restanteMs(chamado, agora))} · prazo de {TIPO_PRAZO[tipo]}</div>
      )}
      <div className={s.meta}>
        {cliente
          ? (faixa !== 'encerrado' && faixa !== 'pausado' && <span>{restanteMs(chamado, agora) >= 0 ? `Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, usuario)}` : 'Em atraso. Estamos cuidando.'}</span>)
          : <>
              <span>Cliente: {solicitante?.nome}{solicitante?.perfil === 'cliente' && ` · ${solicitante.empresa}`}</span>
              <span>Responsável: {responsavel?.nome ?? 'sem dono'}</span>
              {categoria && <span>{categoria} · prioridade {chamado.prioridade}</span>}
            </>}
        {responsavel && cliente && <span>Quem está cuidando: {responsavel.nome}</span>}
      </div>
      <p style={{ margin: 0, color: 'var(--cor-texto-fraco)' }}>{chamado.descricao}</p>
    </header>
  )
}
```

`src/features/chamados/components/DetalheChamado.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { Usuario, UsuarioConsultor } from '@/shared/types'
import { useChamado, useCategorias, useMapaUsuarios } from '@/api/queries'
import { relogio } from '@/shared/utils/relogio'
import { Carregando, Erro, Tabs } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { ehReabertura } from '@/shared/utils/status'
import { AcoesStatus } from './AcoesStatus'
import { CabecalhoChamado } from './CabecalhoChamado'
import { CaixaResposta } from './CaixaResposta'
import { Conversa } from './Conversa'
import { HistoricoLista, PassosCliente } from './HistoricoLista'
import s from './detalhe.module.css'

interface Props { id: string; usuario: Usuario; reabrirInicial?: string; textoInicial?: string }

export function DetalheChamado({ id, usuario, reabrirInicial, textoInicial }: Props) {
  const q = useChamado(id)
  const usuarios = useMapaUsuarios()
  const categorias = useCategorias().data ?? []
  const agora = useNow()
  const [digitando, setDigitando] = useState(false)
  const [aba, setAba] = useState('conversa')
  const [, marcarVisita] = useUltimaVisita(usuario.id, id)
  // marca "vi este chamado" sempre que a conversa cresce enquanto estou nele; relógio VIRTUAL, o mesmo de atualizado_em
  const totalMensagens = q.data?.mensagens.length
  useEffect(() => { if (totalMensagens !== undefined) marcarVisita(relogio.agora()) }, [totalMensagens, marcarVisita])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />
  const { chamado, mensagens, historico } = q.data
  const reabertoEm = [...historico].reverse().find((h) => h.tipo === 'status' && h.de && h.para && ehReabertura(h.de, h.para))?.ocorrido_em
  const consultoresDoGrupo = Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.grupo_id === chamado.grupo_id)
  const cliente = usuario.perfil === 'cliente'

  return (
    <article className={s.detalhe} aria-label={`Chamado ${chamado.numero}`}>
      <div>
        <CabecalhoChamado chamado={chamado} usuario={usuario} usuarios={usuarios} agora={agora} reabertoEm={reabertoEm} categoria={cliente ? undefined : categorias.find((c) => c.id === chamado.categoria_id)?.nome} />
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--cor-borda)' }}>
          <AcoesStatus chamado={chamado} usuario={usuario} consultoresDoGrupo={consultoresDoGrupo} reabrirInicial={reabrirInicial} />
        </div>
        {cliente && <PassosCliente historico={historico} usuario={usuario} />}
      </div>
      {cliente
        ? <Conversa mensagens={mensagens} usuarios={usuarios} usuario={usuario} digitando={digitando} />
        : (
          <Tabs ariaLabel="Conversa e histórico" abas={[{ valor: 'conversa', rotulo: 'Conversa', contador: mensagens.length }, { valor: 'historico', rotulo: 'Histórico', contador: historico.length }]} valor={aba} onChange={setAba}>
            {aba === 'conversa'
              ? <Conversa mensagens={mensagens} usuarios={usuarios} usuario={usuario} digitando={digitando} />
              : <HistoricoLista historico={historico} usuarios={usuarios} usuario={usuario} />}
          </Tabs>
        )}
      <CaixaResposta chamadoId={chamado.id} usuario={usuario} onDigitando={setDigitando} textoInicial={textoInicial} />
    </article>
  )
}
```

Nota de layout: `Tabs` precisa deixar a conversa ocupar o espaço restante. Em `detalhe.module.css` adicionar `.detalhe > [data-orientation] { display: grid; grid-template-rows: auto 1fr; min-height: 0; }`.

`src/features/chamados/pages/ChamadoPage.tsx`:
```tsx
import { useLocation, useParams } from 'react-router'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../components/DetalheChamado'

export function ChamadoPage() {
  const { id } = useParams<{ id: string }>()
  const usuario = useSessao((s) => s.usuario)!
  const loc = useLocation() as { state?: { reabrir?: string } }
  if (!id) return null
  return <div style={{ height: '100%' }}><DetalheChamado id={id} usuario={usuario} reabrirInicial={loc.state?.reabrir} textoInicial={loc.state?.reabrir} /></div>
}
```

`src/features/chamados/index.ts`: exportar `ChamadoPage`, `DetalheChamado`, `BadgePrazo`, e manter os stubs de `FilaConsultorPage`, `MeusChamadosPage`, `NovoChamadoPage` até as Tasks 20 a 22.

- [ ] **Step 5: Rodar**

```bash
pnpm test src/features/chamados && pnpm typecheck
```
Em `pnpm dev`, entrar como Ricardo e abrir `/chamados/<id de um chamado>` (pegar um id no `material/dados.json`): cabeçalho, conversa, histórico e ações aparecem. Abrir o chamado com 1.500 mensagens (`f440ab58-8776-46e2-a052-fcb8a110c4cd`) e rolar: fluido.

- [ ] **Step 6: Commit**

```bash
git add src/features/chamados
git commit -m "feat: detalhe de chamado compartilhado com conversa virtualizada, ações por perfil e histórico"
```

**Fim do Chunk 2.** Nesta altura é possível entrar e abrir qualquer chamado por URL, com tempo real funcionando entre abas.

> Validação do chunk (14/11/2026): montado em rascunho sobre o Chunk 1; com as correções já incorporadas acima, typecheck limpo e 107/107 testes verdes. O bug do `RealtimeProvider` em StrictMode só aparece em `pnpm dev`; `pnpm build && pnpm preview` não o revela.

---

## Chunk 3: Telas por perfil

### Task 20: Fila da consultora com alerta de SLA

**Files:**
- Create: `src/features/chamados/utils/fila.ts`, `src/features/chamados/utils/fila.test.ts`, `src/features/chamados/hooks/useAlertaSla.ts`, `src/features/chamados/hooks/useAlertaSla.test.tsx`, `src/features/chamados/components/FaixaAlerta.tsx`, `src/features/chamados/components/LinhaChamado.tsx`, `src/features/chamados/components/ListaChamados.tsx`, `src/features/chamados/pages/FilaConsultorPage.tsx` (+ `.module.css`)
- Modify: `src/features/chamados/index.ts`

Spec §5.1.

- [ ] **Step 1: Teste da ordenação/filtro da fila**

`src/features/chamados/utils/fila.test.ts`:
```ts
import { filtrarFila, type FiltroFila } from './fila'
import { AGORA_MS, DADOS, MARINA } from '@/tests/fixtures/dados'

const base: FiltroFila = { aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' }
const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''

describe('filtrarFila', () => {
  it('"meus" traz os 42 ativos da Marina, vencidos primeiro', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, base, AGORA_MS)
    expect(r).toHaveLength(42)
    expect(r.every((c) => c.responsavel_id === MARINA.id)).toBe(true)
    const primeiro = r[0]!
    expect(Date.parse(primeiro.prazo_resolucao) < AGORA_MS || Date.parse(primeiro.prazo_primeira_resposta) < AGORA_MS).toBe(true)
  })
  it('"sem dono" traz só abertos do grupo dela', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, { ...base, aba: 'sem_dono' }, AGORA_MS)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.status === 'aberto' && c.grupo_id === grupo)).toBe(true)
  })
  it('status "todos" inclui encerrados; busca por número', () => {
    const todos = filtrarFila(DADOS.chamados, MARINA, { ...base, status: 'todos' }, AGORA_MS)
    expect(todos.length).toBeGreaterThan(42)
    const alvo = todos[0]!
    expect(filtrarFila(DADOS.chamados, MARINA, { ...base, status: 'todos', busca: String(alvo.numero) }, AGORA_MS)).toEqual([alvo])
  })
})
```

`src/features/chamados/utils/fila.ts`:
```ts
import type { Chamado, Status, Usuario } from '@/shared/types'
import { ehEncerrado, ordenarEstouraPrimeiro } from '@/shared/utils/sla'

export type AbaFila = 'meus' | 'sem_dono'
export type FiltroStatus = 'ativos' | 'todos' | Status
export type OrdemFila = 'estoura' | 'recente' | 'cliente'
export interface FiltroFila { aba: AbaFila; status: FiltroStatus; busca: string; ordem: OrdemFila }

export function filtrarFila(chamados: Chamado[], usuario: Usuario, f: FiltroFila, agoraMs: number, nomes: Record<string, string> = {}): Chamado[] {
  let lista = chamados.filter((c) => f.aba === 'meus' ? c.responsavel_id === usuario.id : c.status === 'aberto' && c.responsavel_id === null)
  if (f.status === 'ativos') lista = lista.filter((c) => !ehEncerrado(c))
  else if (f.status !== 'todos') lista = lista.filter((c) => c.status === f.status)
  const q = f.busca.trim().toLowerCase()
  if (q) lista = lista.filter((c) => String(c.numero).includes(q) || c.titulo.toLowerCase().includes(q) || (nomes[c.solicitante_id] ?? '').toLowerCase().includes(q))
  if (f.ordem === 'recente') return [...lista].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  if (f.ordem === 'cliente') return [...lista].sort((a, b) => (nomes[a.solicitante_id] ?? '').localeCompare(nomes[b.solicitante_id] ?? ''))
  return ordenarEstouraPrimeiro(lista, agoraMs)
}
```
Run: `pnpm test src/features/chamados/utils` → PASS

- [ ] **Step 2: Teste do alerta de SLA**

`src/features/chamados/hooks/useAlertaSla.test.tsx`:
```tsx
import { renderHook } from '@testing-library/react'
import { useAlertaSla } from './useAlertaSla'
import { AGORA_MS } from '@/tests/fixtures/dados'
import type { Chamado } from '@/shared/types'

const H = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()
const chamado = (id: string, prazo: number): Chamado => ({
  id, numero: 1, titulo: 'VPN', descricao: '', categoria_id: '', grupo_id: 'g', prioridade: 'media', status: 'em_atendimento', solicitante_id: 's', responsavel_id: 'r',
  aberto_em: iso(AGORA_MS - H), atualizado_em: iso(AGORA_MS), primeira_resposta_em: iso(AGORA_MS), prazo_primeira_resposta: iso(AGORA_MS), prazo_resolucao: iso(prazo),
  sla_pausado: false, resolvido_em: null, fechado_em: null,
})

describe('useAlertaSla', () => {
  it('conta vencidos e próxima hora; alerta uma vez ao cruzar faixa', () => {
    const alertar = vi.fn()
    const lista = [chamado('a', AGORA_MS + 90 * 60_000), chamado('b', AGORA_MS - H)]
    const { result, rerender } = renderHook(({ agora }) => useAlertaSla(lista, agora, alertar), { initialProps: { agora: AGORA_MS } })
    expect(result.current).toEqual({ vencidos: 1, proximaHora: 0 })
    expect(alertar).not.toHaveBeenCalled() // primeira avaliação não alerta
    rerender({ agora: AGORA_MS + 40 * 60_000 }) // 'a' entra em ultima_hora
    expect(result.current).toEqual({ vencidos: 1, proximaHora: 1 })
    expect(alertar).toHaveBeenCalledTimes(1)
    expect(alertar).toHaveBeenCalledWith(lista[0], 'ultima_hora')
    rerender({ agora: AGORA_MS + 45 * 60_000 })
    expect(alertar).toHaveBeenCalledTimes(1) // não repete
    rerender({ agora: AGORA_MS + 2 * H })
    expect(alertar).toHaveBeenCalledTimes(2) // 'a' venceu
    expect(result.current.vencidos).toBe(2)
  })
})
```

`src/features/chamados/hooks/useAlertaSla.ts`:
```ts
import { useEffect, useMemo, useRef } from 'react'
import type { Chamado } from '@/shared/types'
import { faixaMudou, faixaSla, type Faixa } from '@/shared/utils/sla'

export interface ResumoAlerta { vencidos: number; proximaHora: number }

/** Spec §5.1: roda uma vez por tick sobre a lista, alerta só em piora para faixa de alerta, uma vez por chamado por faixa. */
export function useAlertaSla(chamados: Chamado[], agora: number, alertar: (c: Chamado, faixa: Faixa) => void): ResumoAlerta {
  const anteriores = useRef<Map<string, Faixa> | null>(null)
  const faixas = useMemo(() => new Map(chamados.map((c) => [c.id, faixaSla(c, agora)] as const)), [chamados, agora])

  useEffect(() => {
    if (anteriores.current) {
      for (const c of chamados) {
        const atual = faixas.get(c.id)!
        if (faixaMudou(anteriores.current.get(c.id), atual)) alertar(c, atual)
      }
    }
    anteriores.current = faixas
  }, [faixas, chamados, alertar])

  return useMemo(() => {
    let vencidos = 0, proximaHora = 0
    for (const f of faixas.values()) { if (f === 'vencido') vencidos++; else if (f === 'ultima_hora') proximaHora++ }
    return { vencidos, proximaHora }
  }, [faixas])
}
```
Run: `pnpm test src/features/chamados/hooks` → PASS

- [ ] **Step 3: Componentes da fila**

`src/features/chamados/components/FaixaAlerta.tsx`:
```tsx
import type { ResumoAlerta } from '../hooks/useAlertaSla'

interface Props { resumo: ResumoAlerta; onFiltrar?: (qual: 'vencidos' | 'proximaHora') => void; sufixo?: string }

/** Faixa fixa no topo (spec §5.1). Some quando não há nada. */
export function FaixaAlerta({ resumo, onFiltrar, sufixo = 'seus' }: Props) {
  if (resumo.vencidos === 0 && resumo.proximaHora === 0) return null
  const partes: Array<{ texto: string; qual: 'vencidos' | 'proximaHora' }> = []
  if (resumo.proximaHora) partes.push({ texto: `${resumo.proximaHora} ${resumo.proximaHora === 1 ? 'chamado' : 'chamados'} ${sufixo} ${resumo.proximaHora === 1 ? 'vence' : 'vencem'} na próxima hora`, qual: 'proximaHora' })
  if (resumo.vencidos) partes.push({ texto: `${resumo.vencidos} já ${resumo.vencidos === 1 ? 'venceu' : 'venceram'}`, qual: 'vencidos' })
  return (
    <div role="status" style={{ background: resumo.vencidos ? 'var(--sla-vencido)' : 'var(--sla-ultima-hora)', color: '#fff', padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center', fontWeight: 600 }}>
      {partes.map((p) => onFiltrar
        ? <button key={p.qual} onClick={() => onFiltrar(p.qual)} style={{ background: 'transparent', border: 0, color: 'inherit', fontWeight: 'inherit', textDecoration: 'underline', padding: 0 }}>{p.texto}</button>
        : <span key={p.qual}>{p.texto}</span>)}
    </div>
  )
}
```

`src/features/chamados/components/LinhaChamado.tsx`:
```tsx
import { memo } from 'react'
import type { Chamado } from '@/shared/types'
import { Badge } from '@/shared/components'
import { ROTULO_STATUS } from '@/shared/utils/status'
import { BadgePrazo } from './BadgePrazo'

interface Props { chamado: Chamado; agora: number; nomeCliente: string; ativo: boolean; temNovidade: boolean; onAbrir: (id: string) => void }

export const LinhaChamado = memo(function LinhaChamado({ chamado, agora, nomeCliente, ativo, temNovidade, onAbrir }: Props) {
  return (
    <button onClick={() => onAbrir(chamado.id)} aria-current={ativo || undefined}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--cor-borda)', background: ativo ? '#eef2ff' : 'var(--cor-superficie)' }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
        {temNovidade && <span aria-label="mensagem nova" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--cor-primaria)', flex: 'none' }} />}
        <span style={{ fontFamily: 'var(--fonte-mono)', color: 'var(--cor-texto-fraco)' }}>#{chamado.numero}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{chamado.titulo}</span>
      </span>
      <BadgePrazo chamado={chamado} agora={agora} />
      <span style={{ color: 'var(--cor-texto-fraco)', fontSize: 13 }}>{nomeCliente}</span>
      <Badge faixa="neutro">{ROTULO_STATUS[chamado.status]}</Badge>
    </button>
  )
})
```

`src/features/chamados/components/ListaChamados.tsx`:
```tsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Chamado, Usuario } from '@/shared/types'
import { Vazio } from '@/shared/components'
import { lerUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { LinhaChamado } from './LinhaChamado'

interface Props { chamados: Chamado[]; agora: number; usuario: Usuario; usuarios: Record<string, Usuario>; ativoId?: string; onAbrir: (id: string) => void; vazio: string }

export function ListaChamados({ chamados, agora, usuario, usuarios, ativoId, onAbrir, vazio }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: chamados.length, getScrollElement: () => ref.current, estimateSize: () => 64, overscan: 10 })
  if (chamados.length === 0) return <Vazio texto={vazio} />
  return (
    <div ref={ref} style={{ overflow: 'auto', height: '100%' }} role="list" aria-label="Chamados">
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((item) => {
          const c = chamados[item.index]!
          const visita = lerUltimaVisita(usuario.id, c.id)
          const temNovidade = visita !== null && Date.parse(c.atualizado_em) > visita && c.id !== ativoId
          return (
            <div key={c.id} role="listitem" ref={v.measureElement} data-index={item.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}>
              <LinhaChamado chamado={c} agora={agora} nomeCliente={usuarios[c.solicitante_id]?.nome ?? ''} ativo={c.id === ativoId} temNovidade={temNovidade} onAbrir={onAbrir} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Nota: `temNovidade` usa `atualizado_em`, que o `reducer` já atualiza em qualquer evento; a "última visita" por chamado é marcada pelo `DetalheChamado`. Sem registro de visita, sem ponto (spec §5.1).

- [ ] **Step 4: Página da fila**

`src/features/chamados/pages/FilaConsultorPage.module.css`:
```css
.pagina { display: grid; grid-template-columns: minmax(320px, 420px) 1fr; height: 100%; min-height: 0; }
.fila { display: grid; grid-template-rows: auto auto 1fr; min-height: 0; border-right: 1px solid var(--cor-borda); background: var(--cor-superficie); }
.filtros { display: flex; gap: var(--espaco-2); padding: var(--espaco-2) var(--espaco-3); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--cor-borda); }
.busca { flex: 1; min-width: 140px; padding: 6px 10px; border: 1px solid var(--cor-borda); border-radius: var(--raio); }
.detalhe { min-height: 0; }
.vazioDetalhe { display: grid; place-items: center; height: 100%; color: var(--cor-texto-fraco); }
@media (max-width: 900px) {
  .pagina { grid-template-columns: 1fr; }
  .fila.comDetalhe { display: none; }
}
```

`src/features/chamados/pages/FilaConsultorPage.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { Chamado, UsuarioConsultor } from '@/shared/types'
import { useChamados, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro, Select, Tabs, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarRelativo } from '@/shared/utils/datas'
import { restanteMs, type Faixa } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../components/DetalheChamado'
import { FaixaAlerta } from '../components/FaixaAlerta'
import { ListaChamados } from '../components/ListaChamados'
import { useAlertaSla } from '../hooks/useAlertaSla'
import { filtrarFila, type AbaFila, type FiltroFila, type FiltroStatus, type OrdemFila } from '../utils/fila'
import s from './FilaConsultorPage.module.css'

const OPCOES_STATUS = [{ valor: 'ativos', rotulo: 'Ativos' }, { valor: 'todos', rotulo: 'Todos' }, { valor: 'aberto', rotulo: 'Aberto' }, { valor: 'em_atendimento', rotulo: 'Em atendimento' }, { valor: 'aguardando_cliente', rotulo: 'Aguardando cliente' }, { valor: 'resolvido', rotulo: 'Resolvido' }, { valor: 'fechado', rotulo: 'Fechado' }]
const OPCOES_ORDEM = [{ valor: 'estoura', rotulo: 'Estoura primeiro' }, { valor: 'recente', rotulo: 'Mais recente' }, { valor: 'cliente', rotulo: 'Cliente' }]

export function FilaConsultorPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioConsultor
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const q = useChamados()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const { notificar } = useToast()
  const [filtro, setFiltro] = useState<FiltroFila>({ aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' })
  const [soAlerta, setSoAlerta] = useState<'vencidos' | 'proximaHora' | null>(null)

  const nomes = useMemo(() => Object.fromEntries(Object.values(usuarios).map((u) => [u.id, u.nome])), [usuarios])
  const todos = q.data ?? []
  const meus = useMemo(() => todos.filter((c) => c.responsavel_id === usuario.id && c.status !== 'resolvido' && c.status !== 'fechado'), [todos, usuario.id])
  const semDono = useMemo(() => todos.filter((c) => c.status === 'aberto' && c.responsavel_id === null), [todos])

  const alertar = useCallback((c: Chamado, faixa: Faixa) => {
    notificar({ id: `sla:${c.id}:${faixa}`, tipo: 'alerta', titulo: `#${c.numero} ${faixa === 'vencido' ? 'venceu' : 'vence em breve'}`, descricao: `${c.titulo} · ${formatarRelativo(restanteMs(c, agora))}`, acao: { rotulo: 'Abrir', onClick: () => nav(`/fila/${c.id}`) }, duracaoMs: 15_000 })
  }, [notificar, nav, agora])
  const resumo = useAlertaSla(meus, agora, alertar)

  useEffect(() => { document.title = resumo.vencidos ? `(${resumo.vencidos}) Chamados` : 'Chamados'; return () => { document.title = 'Chamados' } }, [resumo.vencidos])

  const lista = useMemo(() => {
    let r = filtrarFila(todos, usuario, filtro, agora, nomes)
    if (soAlerta === 'vencidos') r = r.filter((c) => restanteMs(c, agora) < 0 && !c.sla_pausado)
    if (soAlerta === 'proximaHora') r = r.filter((c) => { const m = restanteMs(c, agora); return m >= 0 && m <= 3_600_000 && !c.sla_pausado })
    return r
  }, [todos, usuario, filtro, agora, nomes, soAlerta])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />

  return (
    <div className={s.pagina}>
      <section className={`${s.fila} ${id ? s.comDetalhe : ''}`} aria-label="Fila">
        <FaixaAlerta resumo={resumo} onFiltrar={(qual) => { setFiltro((f) => ({ ...f, aba: 'meus', status: 'ativos' })); setSoAlerta((a) => (a === qual ? null : qual)) }} />
        <Tabs ariaLabel="Filas" abas={[{ valor: 'meus', rotulo: 'Meus', contador: meus.length }, { valor: 'sem_dono', rotulo: 'Do grupo, sem dono', contador: semDono.length }]} valor={filtro.aba} onChange={(v) => { setFiltro((f) => ({ ...f, aba: v as AbaFila })); setSoAlerta(null) }}>
          <div className={s.filtros}>
            <input className={s.busca} type="search" placeholder="Número, título ou cliente" aria-label="Buscar chamado" value={filtro.busca} onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))} />
            <Select ariaLabel="Status" valor={filtro.status} onChange={(v) => setFiltro((f) => ({ ...f, status: v as FiltroStatus }))} opcoes={OPCOES_STATUS} />
            <Select ariaLabel="Ordenar" valor={filtro.ordem} onChange={(v) => setFiltro((f) => ({ ...f, ordem: v as OrdemFila }))} opcoes={OPCOES_ORDEM} />
            {soAlerta && <button onClick={() => setSoAlerta(null)} style={{ background: 'none', border: 0, color: 'var(--cor-primaria)', textDecoration: 'underline' }}>limpar filtro de alerta</button>}
          </div>
        </Tabs>
        <ListaChamados chamados={lista} agora={agora} usuario={usuario} usuarios={usuarios} ativoId={id} onAbrir={(cid) => nav(`/fila/${cid}`)} vazio={filtro.aba === 'meus' ? 'Nenhum chamado seu com esse filtro.' : 'Fila do grupo vazia. Bom sinal.'} />
      </section>
      <section className={s.detalhe} aria-label="Chamado">
        {id ? <DetalheChamado key={id} id={id} usuario={usuario} /> : <div className={s.vazioDetalhe}>Escolha um chamado na fila. O primeiro é o que estoura antes.</div>}
      </section>
    </div>
  )
}
```

Atualizar `src/features/chamados/index.ts` para exportar `FilaConsultorPage` real.

- [ ] **Step 5: Verificar**

```bash
pnpm test src/features/chamados && pnpm typecheck
```
`pnpm dev` como Marina: 42 em "Meus", vencidos no topo, faixa vermelha com contagem. Com o painel do simulador em 20x (Task 23) um chamado cruza faixa e dispara toast. Abrir um chamado, começar a digitar, e em outra aba (Helena, dona do chamado) mandar mensagem: aparece "1 mensagem nova" sem rolar.

- [ ] **Step 6: Commit**

```bash
git add src/features/chamados
git commit -m "feat: fila da consultora com ordenação estoura primeiro e alerta ativo de SLA"
```

---

### Task 21: Telas do cliente

**Files:**
- Create: `src/features/chamados/pages/MeusChamadosPage.tsx` (+ `.module.css`), `src/features/chamados/pages/NovoChamadoPage.tsx`, `src/features/chamados/pages/NovoChamadoPage.test.tsx`, `src/features/chamados/components/Novidades.tsx`, `src/features/chamados/utils/categoriasAmigaveis.ts`
- Modify: `src/features/chamados/index.ts`

Spec §5.3.

- [ ] **Step 1: Nomes amigáveis das categorias**

`src/features/chamados/utils/categoriasAmigaveis.ts`:
```ts
/** "O que parou?" em linguagem de cliente (spec §5.3). Chave = nome da categoria no dados.json. */
export const CATEGORIA_AMIGAVEL: Record<string, string> = {
  'Acesso e senhas': 'Não consigo entrar (acesso ou senha)',
  'E-mail': 'E-mail',
  'Rede e VPN': 'Internet, rede ou VPN',
  'Estação de trabalho': 'Meu computador ou equipamento',
  'ERP': 'Sistema de gestão (ERP)',
  'CRM': 'Sistema de clientes (CRM)',
  'Relatórios e BI': 'Relatórios e painéis',
  'Integrações': 'Integração entre sistemas',
}
export const amigavel = (nome: string) => CATEGORIA_AMIGAVEL[nome] ?? nome
```

- [ ] **Step 2: Teste da sugestão de reabertura na tela**

`src/features/chamados/pages/NovoChamadoPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NovoChamadoPage } from './NovoChamadoPage'
import { useSessao } from '@/state/sessao'
import { DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'
import { relogio } from '@/shared/utils/relogio'

describe('NovoChamadoPage', () => {
  beforeEach(() => {
    useSessao.getState().entrar(HELENA)
    relogio.iniciar(DADOS.meta.agora)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.endsWith('/api/chamados')) return new Response(JSON.stringify(DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id)), { status: 200 })
      if (u.endsWith('/api/categorias')) return new Response(JSON.stringify(DADOS.categorias), { status: 200 })
      return new Response('[]', { status: 200 })
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('ao digitar o título de #10614 sugere reabrir #10612', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/meus-chamados/novo']}>
          <Routes><Route path="/meus-chamados/novo" element={<NovoChamadoPage />} /><Route path="/chamados/:id" element={<p>detalhe</p>} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.type(await screen.findByLabelText(/título/i), chamadoPorNumero(10614).titulo)
    expect(await screen.findByText(/parece com seu chamado #10612/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reabrir/i }))
    expect(await screen.findByText('detalhe')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Implementar**

`src/features/chamados/components/Novidades.tsx`:
```tsx
import type { Chamado, Usuario } from '@/shared/types'
import { Button } from '@/shared/components'
import { useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import { rotuloStatus } from '../utils/rotulos'

interface Props { chamados: Chamado[]; usuario: Usuario; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }

/** Spec §5.3: o que mudou desde a última visita. Primeira visita: nada (login marca a visita). */
export function Novidades({ chamados, usuario, usuarios, agora, onAbrir }: Props) {
  const [ultima, marcar] = useUltimaVisita(usuario.id)
  if (ultima === null) return null
  const mudaram = chamados.filter((c) => Date.parse(c.atualizado_em) > ultima).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  if (mudaram.length === 0) return null
  return (
    <section aria-label="Novidades" style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 'var(--raio)', padding: 12, display: 'grid', gap: 8 }}>
      <strong>Novidades desde sua última visita</strong>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {mudaram.map((c) => {
          const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
          return <li key={c.id}><button onClick={() => onAbrir(c.id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--cor-primaria)', textDecoration: 'underline' }}>#{c.numero} {c.titulo}</button>: {rotuloStatus(c, 'cliente', resp)}</li>
        })}
      </ul>
      <div><Button pequeno onClick={() => marcar(agora)}>Entendi</Button></div>
    </section>
  )
}
```

`src/features/chamados/pages/MeusChamadosPage.module.css`:
```css
.pagina { max-width: 860px; margin: 0 auto; padding: var(--espaco-6) var(--espaco-4); display: grid; gap: var(--espaco-4); }
.topo { display: flex; align-items: center; justify-content: space-between; gap: var(--espaco-3); flex-wrap: wrap; }
.lista { display: grid; gap: var(--espaco-2); }
.cartao { display: grid; gap: 4px; width: 100%; text-align: left; padding: var(--espaco-3) var(--espaco-4); background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio); }
.cartao:hover { border-color: var(--cor-primaria); }
.linha { display: flex; justify-content: space-between; gap: var(--espaco-3); flex-wrap: wrap; }
.situacao { color: var(--cor-texto-fraco); }
.previsao { font-size: 13px; color: var(--cor-texto-fraco); }
```

`src/features/chamados/pages/MeusChamadosPage.tsx`:
```tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useChamados, useMapaUsuarios } from '@/api/queries'
import { Button, Carregando, Erro, Vazio } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDiaHora } from '@/shared/utils/datas'
import { ehEncerrado, prazoRelevante, restanteMs } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { Novidades } from '../components/Novidades'
import { rotuloStatus, TIPO_PRAZO } from '../utils/rotulos'
import s from './MeusChamadosPage.module.css'

export function MeusChamadosPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioCliente
  const nav = useNavigate()
  const q = useChamados()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const lista = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(ehEncerrado(a)) - Number(ehEncerrado(b)) || b.atualizado_em.localeCompare(a.atualizado_em)), [q.data])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />
  return (
    <div className={s.pagina}>
      <div className={s.topo}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Meus chamados</h1>
        <Button variante="primaria" onClick={() => nav('/meus-chamados/novo')}>Abrir chamado</Button>
      </div>
      <Novidades chamados={lista} usuario={usuario} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      {lista.length === 0 ? <Vazio texto="Você ainda não abriu nenhum chamado." /> : (
        <div className={s.lista}>
          {lista.map((c) => {
            const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
            const mostraPrevisao = !ehEncerrado(c) && !c.sla_pausado
            const { tipo, prazo } = prazoRelevante(c)
            return (
              <button key={c.id} className={s.cartao} onClick={() => nav(`/chamados/${c.id}`)}>
                <div className={s.linha}><strong>{c.titulo}</strong><span style={{ fontFamily: 'var(--fonte-mono)', color: 'var(--cor-texto-fraco)' }}>#{c.numero}</span></div>
                <div className={s.linha}>
                  <span className={s.situacao}>{rotuloStatus(c, 'cliente', resp)}</span>
                  {mostraPrevisao && <span className={s.previsao}>{restanteMs(c, agora) >= 0 ? `Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, usuario)}` : 'Em atraso. Estamos cuidando.'}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

`src/features/chamados/pages/NovoChamadoPage.tsx`:
```tsx
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useAbrirChamado, useCategorias, useChamados } from '@/api/queries'
import { Button, Campo, Select, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { sugerirParecido } from '@/shared/utils/similaridade'
import { useSessao } from '@/state/sessao'
import { amigavel } from '../utils/categoriasAmigaveis'
import s from './MeusChamadosPage.module.css'

export function NovoChamadoPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioCliente
  const nav = useNavigate()
  const { notificar } = useToast()
  const categorias = useCategorias().data ?? []
  const meus = useChamados().data ?? []
  const agora = useNow()
  const abrir = useAbrirChamado()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string | undefined>()
  const [descartou, setDescartou] = useState<string | null>(null)

  const parecido = useMemo(() => (titulo.trim().length >= 4 ? sugerirParecido(titulo, meus, agora) : null), [titulo, meus, agora])
  const mostrarSugestao = parecido && descartou !== parecido.id

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!categoria) return
    abrir.mutate({ titulo: titulo.trim(), descricao: descricao.trim(), categoria_id: categoria }, {
      onSuccess: ({ id }) => nav(`/chamados/${id}`, { replace: true }),
      onError: (err) => notificar({ titulo: 'Não foi possível abrir', descricao: err.message, tipo: 'erro' }),
    })
  }

  return (
    <form className={s.pagina} onSubmit={enviar} aria-labelledby="t-novo">
      <h1 id="t-novo" style={{ margin: 0, fontSize: 20 }}>Abrir chamado</h1>
      <div>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>O que parou?</span>
        <Select ariaLabel="O que parou" valor={categoria} onChange={setCategoria} placeholder="Escolha" opcoes={categorias.map((c) => ({ valor: c.id, rotulo: amigavel(c.nome) }))} />
      </div>
      <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} placeholder="Em uma frase, o que está acontecendo" />
      {mostrarSugestao && (
        <div role="status" style={{ background: 'var(--cor-interna)', border: '1px solid var(--cor-interna-borda)', borderRadius: 'var(--raio)', padding: 12, display: 'grid', gap: 8 }}>
          <span>Parece com seu chamado <strong>#{parecido.numero}</strong> ({parecido.status === 'fechado' ? 'fechado' : 'resolvido'} em {formatarDataHora(parecido.atualizado_em, usuario, { day: '2-digit', month: '2-digit' })}). É o mesmo problema?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variante="primaria" onClick={() => nav(`/chamados/${parecido.id}`, { state: { reabrir: descricao.trim() || titulo.trim() } })}>Reabrir esse</Button>
            <Button onClick={() => setDescartou(parecido.id)}>É outro</Button>
          </div>
        </div>
      )}
      <Campo multilinha rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required rows={5} placeholder="O que você estava fazendo, o que apareceu na tela, desde quando" />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" variante="primaria" disabled={abrir.isPending || !categoria || !titulo.trim() || !descricao.trim()}>Abrir chamado</Button>
        <Button onClick={() => nav('/meus-chamados')}>Cancelar</Button>
      </div>
    </form>
  )
}
```

Ajuste no `DetalheChamado` para o fluxo "Reabrir esse": quando `reabrirInicial` vem, o diálogo de reabertura já abre com o texto; ao confirmar, a `AcoesStatus` deve, depois do `status`, enviar a descrição como mensagem. Implementar em `AcoesStatus.confirmar`: se `reabrirInicial !== undefined`, no `onSuccess` do `mudar` chamar `useEnviarMensagem(chamado.id).mutate({ texto: motivo, interna: false })` com `onError` → toast "Reaberto, mas a mensagem não foi enviada. O texto ficou na caixa." (o `textoInicial` da `CaixaResposta` já tem o texto). Adicionar o hook `useEnviarMensagem` no topo da `AcoesStatus`.

Atualizar `index.ts` da feature com `MeusChamadosPage` e `NovoChamadoPage` reais.

- [ ] **Step 4: Verificar**

```bash
pnpm test src/features/chamados && pnpm typecheck
```
`pnpm dev` como Helena: lista em linguagem simples com horários de Lisboa; "Abrir chamado" com sugestão ao digitar "Solicitação de acesso…" (título do #10614); fechar e reabrir mostra a faixa de novidades na volta (depois de "Entendi" e de o simulador mexer num chamado dela).

- [ ] **Step 5: Commit**

```bash
git add src/features/chamados
git commit -m "feat: telas do cliente com novidades, previsão no fuso dela e sugestão de reabertura"
```

---

### Task 22: Painel do gestor

**Files:**
- Create: `src/features/equipe/pages/EquipePage.tsx` (+ `.module.css`), `src/features/equipe/components/CartaoConsultor.tsx`, `src/features/equipe/components/Redistribuir.tsx`, `src/features/equipe/components/Redistribuir.test.tsx`, `src/features/equipe/components/FilaSemDono.tsx`, `src/features/equipe/components/VencendoEmBreve.tsx`
- Modify: `src/features/equipe/index.ts`

Spec §5.2. Tudo calculado no cliente a partir de `useChamados()` + `useHistorico()`.

- [ ] **Step 1: Teste do redistribuir (seleção múltipla gera um POST por chamado)**

`src/features/equipe/components/Redistribuir.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Redistribuir } from './Redistribuir'
import { DADOS, MARINA, RICARDO } from '@/tests/fixtures/dados'
import { useSessao } from '@/state/sessao'
import type { UsuarioConsultor } from '@/shared/types'

describe('Redistribuir', () => {
  it('um POST /atribuir por chamado marcado', async () => {
    useSessao.getState().entrar(RICARDO)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    const daMarina = DADOS.chamados.filter((c) => c.responsavel_id === MARINA.id && c.status === 'em_atendimento').slice(0, 3)
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const colegas = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && u.grupo_id === grupo && u.id !== MARINA.id)
    render(<QueryClientProvider client={new QueryClient()}><Redistribuir chamados={daMarina} consultores={colegas} usuarios={{}} agora={Date.parse(DADOS.meta.agora)} onFechar={() => {}} /></QueryClientProvider>)
    await userEvent.click(screen.getByLabelText(`Selecionar #${daMarina[0]!.numero}`))
    await userEvent.click(screen.getByLabelText(`Selecionar #${daMarina[1]!.numero}`))
    await userEvent.click(screen.getByRole('combobox', { name: /destino/i }))
    await userEvent.click(await screen.findByRole('option', { name: colegas[0]!.nome }))
    await userEvent.click(screen.getByRole('button', { name: /redistribuir 2/i }))
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/atribuir'))).toHaveLength(2)
    fetchMock.mockRestore()
  })
})
```

- [ ] **Step 2: Implementar componentes**

`src/features/equipe/pages/EquipePage.module.css`:
```css
.pagina { padding: var(--espaco-4); display: grid; gap: var(--espaco-4); max-width: 1400px; margin: 0 auto; }
.secao { display: grid; gap: var(--espaco-2); }
.titulo { margin: 0; font-size: 16px; display: flex; gap: var(--espaco-2); align-items: baseline; }
.cartoes { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--espaco-3); }
.cartao { background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio); padding: var(--espaco-3); display: grid; gap: 6px; text-align: left; }
.cartao:hover { border-color: var(--cor-primaria); }
.semChamado { border-color: var(--sla-atencao); background: #fff9e8; }
.nome { font-weight: 600; display: flex; justify-content: space-between; }
.numeros { display: flex; gap: var(--espaco-3); font-size: 13px; color: var(--cor-texto-fraco); }
.numeros strong { color: var(--cor-texto); }
.vermelho { color: var(--sla-vencido) !important; } .laranja { color: var(--sla-critico) !important; }
.tabela { width: 100%; border-collapse: collapse; background: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio); font-size: 13px; }
.tabela th, .tabela td { padding: 8px 10px; border-bottom: 1px solid var(--cor-borda); text-align: left; }
.link { background: none; border: 0; color: var(--cor-primaria); text-decoration: underline; padding: 0; }
```

`src/features/equipe/components/CartaoConsultor.tsx`:
```tsx
import type { AgregadoConsultor } from '@/shared/utils/equipe'
import { formatarDuracao } from '@/shared/utils/datas'
import s from '../pages/EquipePage.module.css'

export function CartaoConsultor({ a, grupo, onAbrir }: { a: AgregadoConsultor; grupo: string; onAbrir: () => void }) {
  return (
    <button className={`${s.cartao} ${a.ativos === 0 ? s.semChamado : ''}`} onClick={onAbrir} aria-label={`${a.consultor.nome}, ${a.ativos} ativos`}>
      <div className={s.nome}><span>{a.consultor.nome}</span><small style={{ color: 'var(--cor-texto-fraco)', fontWeight: 400 }}>{grupo}</small></div>
      {a.ativos === 0 && <strong style={{ color: 'var(--sla-atencao)' }}>Sem chamado</strong>}
      <div className={s.numeros}>
        <span><strong>{a.ativos}</strong> ativos</span>
        <span className={a.vencidos ? s.vermelho : ''}><strong>{a.vencidos}</strong> vencidos</span>
        <span className={a.vencendo4h ? s.laranja : ''}><strong>{a.vencendo4h}</strong> em 4h</span>
      </div>
      <div className={s.numeros}><span>ocioso na semana: <strong>{formatarDuracao(a.ociosoMs)}</strong></span></div>
    </button>
  )
}
```

`src/features/equipe/components/Redistribuir.tsx`:
```tsx
import { useState } from 'react'
import type { Chamado, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { Button, Select, useToast } from '@/shared/components'
import { BadgePrazo } from '@/features/chamados'
import s from '../pages/EquipePage.module.css'

interface Props { chamados: Chamado[]; consultores: UsuarioConsultor[]; usuarios: Record<string, Usuario>; agora: number; onFechar: () => void }

/** Spec §5.2: seleção múltipla, um POST /atribuir por chamado. */
export function Redistribuir({ chamados, consultores, usuarios, agora, onFechar }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState<string | undefined>()
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  const alternar = (id: string) => setMarcados((m) => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n })
  const executar = async () => {
    if (!destino) return
    const resultados = await Promise.allSettled([...marcados].map((chamadoId) => atribuir.mutateAsync({ chamadoId, consultorId: destino })))
    const falhas = resultados.filter((r) => r.status === 'rejected')
    if (falhas.length) notificar({ titulo: `${falhas.length} não redistribuídos`, descricao: (falhas[0] as PromiseRejectedResult).reason?.message, tipo: 'erro' })
    else { notificar({ titulo: `${marcados.size} chamados redistribuídos` }); onFechar() }
  }
  return (
    <div className={s.secao}>
      <table className={s.tabela}>
        <thead><tr><th></th><th>#</th><th>Título</th><th>Cliente</th><th>Prazo</th></tr></thead>
        <tbody>
          {chamados.map((c) => (
            <tr key={c.id}>
              <td><input type="checkbox" aria-label={`Selecionar #${c.numero}`} checked={marcados.has(c.id)} onChange={() => alternar(c.id)} /></td>
              <td>{c.numero}</td><td>{c.titulo}</td><td>{usuarios[c.solicitante_id]?.nome}</td><td><BadgePrazo chamado={c} agora={agora} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select ariaLabel="Destino" valor={destino} onChange={setDestino} placeholder="Redistribuir para…" opcoes={consultores.map((c) => ({ valor: c.id, rotulo: c.nome }))} />
        <Button variante="primaria" disabled={!destino || marcados.size === 0 || atribuir.isPending} onClick={executar}>Redistribuir {marcados.size || ''}</Button>
        <Button onClick={onFechar}>Fechar</Button>
      </div>
    </div>
  )
}
```

`src/features/equipe/components/FilaSemDono.tsx`:
```tsx
import type { Chamado, Grupo, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { Select, useToast } from '@/shared/components'
import { BadgePrazo } from '@/features/chamados'
import s from '../pages/EquipePage.module.css'

interface Props { chamados: Chamado[]; consultores: UsuarioConsultor[]; grupos: Grupo[]; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }

export function FilaSemDono({ chamados, consultores, grupos, usuarios, agora, onAbrir }: Props) {
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  if (chamados.length === 0) return <p style={{ color: 'var(--cor-texto-fraco)' }}>Nenhum chamado esperando dono.</p>
  return (
    <table className={s.tabela}>
      <thead><tr><th>#</th><th>Título</th><th>Grupo</th><th>Cliente</th><th>Prazo</th><th>Atribuir a</th></tr></thead>
      <tbody>
        {chamados.map((c) => (
          <tr key={c.id}>
            <td><button className={s.link} onClick={() => onAbrir(c.id)}>{c.numero}</button></td>
            <td>{c.titulo}</td><td>{grupos.find((g) => g.id === c.grupo_id)?.nome}</td><td>{usuarios[c.solicitante_id]?.nome}</td>
            <td><BadgePrazo chamado={c} agora={agora} /></td>
            <td><Select ariaLabel={`Atribuir #${c.numero}`} valor={undefined} placeholder="Escolher" opcoes={consultores.filter((k) => k.grupo_id === c.grupo_id).map((k) => ({ valor: k.id, rotulo: k.nome }))}
              onChange={(consultorId) => atribuir.mutate({ chamadoId: c.id, consultorId }, { onError: (e) => notificar({ titulo: 'Não atribuído', descricao: e.message, tipo: 'erro' }) })} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

`src/features/equipe/components/VencendoEmBreve.tsx`:
```tsx
import type { Chamado, Usuario } from '@/shared/types'
import { BadgePrazo } from '@/features/chamados'
import s from '../pages/EquipePage.module.css'

export function VencendoEmBreve({ chamados, usuarios, agora, onAbrir }: { chamados: Chamado[]; usuarios: Record<string, Usuario>; agora: number; onAbrir: (id: string) => void }) {
  if (chamados.length === 0) return <p style={{ color: 'var(--cor-texto-fraco)' }}>Nada vence nas próximas 4 horas.</p>
  return (
    <table className={s.tabela}>
      <thead><tr><th>#</th><th>Título</th><th>Responsável</th><th>Cliente</th><th>Prazo</th></tr></thead>
      <tbody>
        {chamados.map((c) => (
          <tr key={c.id}>
            <td><button className={s.link} onClick={() => onAbrir(c.id)}>{c.numero}</button></td>
            <td>{c.titulo}</td><td>{c.responsavel_id ? usuarios[c.responsavel_id]?.nome : <em>sem dono</em>}</td><td>{usuarios[c.solicitante_id]?.nome}</td><td><BadgePrazo chamado={c} agora={agora} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Página**

`src/features/equipe/pages/EquipePage.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioConsultor, UsuarioGestor } from '@/shared/types'
import { useChamados, useGrupos, useHistorico, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro } from '@/shared/components'
import { FaixaAlerta } from '@/features/chamados'
import { useNow } from '@/shared/hooks/useNow'
import { agregadosPorConsultor } from '@/shared/utils/equipe'
import { ehEncerrado, faixaSla, ordenarEstouraPrimeiro } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { CartaoConsultor } from '../components/CartaoConsultor'
import { FilaSemDono } from '../components/FilaSemDono'
import { Redistribuir } from '../components/Redistribuir'
import { VencendoEmBreve } from '../components/VencendoEmBreve'
import s from './EquipePage.module.css'

export function EquipePage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioGestor
  const nav = useNavigate()
  const chamados = useChamados()
  const historico = useHistorico(true)
  const usuarios = useMapaUsuarios()
  const grupos = useGrupos().data ?? []
  const agora = useNow()
  const [aberto, setAberto] = useState<string | null>(null)

  const consultores = useMemo(() => Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && usuario.grupos_ids.includes(u.grupo_id)), [usuarios, usuario])
  const lista = chamados.data ?? []
  const agregados = useMemo(() => agregadosPorConsultor(consultores, lista, historico.data ?? [], agora), [consultores, lista, historico.data, agora])
  const semDono = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => c.status === 'aberto' && !c.responsavel_id), agora), [lista, agora])
  const vencendo = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => !ehEncerrado(c) && ['critico', 'ultima_hora'].includes(faixaSla(c, agora))), agora), [lista, agora])
  const resumo = useMemo(() => ({ vencidos: lista.filter((c) => faixaSla(c, agora) === 'vencido').length, proximaHora: lista.filter((c) => faixaSla(c, agora) === 'ultima_hora').length }), [lista, agora])

  if (chamados.isPending || historico.isPending) return <Carregando />
  if (chamados.isError) return <Erro erro={chamados.error} tentar={() => chamados.refetch()} />
  const nomeGrupo = (id: string) => grupos.find((g) => g.id === id)?.nome ?? ''
  const consultorAberto = agregados.find((a) => a.consultor.id === aberto)

  return (
    <div className={s.pagina}>
      <FaixaAlerta resumo={resumo} sufixo="da equipe" />
      <section className={s.secao} aria-labelledby="t-equipe">
        <h2 id="t-equipe" className={s.titulo}>Equipe <small style={{ color: 'var(--cor-texto-fraco)' }}>{consultores.length} consultores · ordenado por quem está pior</small></h2>
        <div className={s.cartoes}>{agregados.map((a) => <CartaoConsultor key={a.consultor.id} a={a} grupo={nomeGrupo(a.consultor.grupo_id)} onAbrir={() => setAberto(a.consultor.id)} />)}</div>
        {consultorAberto && (
          <div className={s.secao}>
            <h3 className={s.titulo}>Chamados de {consultorAberto.consultor.nome}</h3>
            <Redistribuir key={consultorAberto.consultor.id} chamados={ordenarEstouraPrimeiro(lista.filter((c) => c.responsavel_id === consultorAberto.consultor.id && !ehEncerrado(c)), agora)}
              consultores={consultores.filter((k) => k.grupo_id === consultorAberto.consultor.grupo_id && k.id !== consultorAberto.consultor.id)} usuarios={usuarios} agora={agora} onFechar={() => setAberto(null)} />
          </div>
        )}
      </section>
      <section className={s.secao} aria-labelledby="t-vencendo">
        <h2 id="t-vencendo" className={s.titulo}>Vencendo nas próximas 4 horas <small style={{ color: 'var(--cor-texto-fraco)' }}>{vencendo.length}</small></h2>
        <VencendoEmBreve chamados={vencendo} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      </section>
      <section className={s.secao} aria-labelledby="t-semdono">
        <h2 id="t-semdono" className={s.titulo}>Fila sem dono <small style={{ color: 'var(--cor-texto-fraco)' }}>{semDono.length}</small></h2>
        <FilaSemDono chamados={semDono} consultores={consultores} grupos={grupos} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      </section>
    </div>
  )
}
```

`src/features/equipe/index.ts`: `export { EquipePage } from './pages/EquipePage'`. Em `src/features/chamados/index.ts`, exportar também `FaixaAlerta` e `BadgePrazo` (uso cruzado passa pelo barrel; se a regra "feature não importa feature" incomodar, mover os dois para `shared/components/`; decidir no momento e registrar em `docs/decisoes.md`).

- [ ] **Step 4: Verificar**

```bash
pnpm test src/features/equipe && pnpm typecheck
```
`pnpm dev` como Ricardo: 12 cartões ordenados por vencidos, quem está sem chamado em destaque amarelo, "ocioso na semana" em cada um. Clicar num cartão abre a tabela com checkboxes; redistribuir 2 chamados; na aba da Marina (se for dela) eles somem da fila na hora.

- [ ] **Step 5: Commit**

```bash
git add src/features/equipe src/features/chamados/index.ts
git commit -m "feat: painel do gestor com carga por consultor, tempo ocioso, redistribuição e fila sem dono"
```

**Fim do Chunk 3.** Os 6 requisitos do enunciado estão na tela.

---

## Chunk 4: Painel do simulador, documentação e verificação final

### Task 23: Painel do simulador e aviso de replay

**Files:**
- Modify: `src/app/layout/PainelSimulador.tsx` (substituir o stub), `src/app/App.tsx`
- Create: `src/app/layout/PainelSimulador.module.css`

Spec §4.4, §4.5, §8. Discreto, no rodapé, em todos os perfis (o avaliador precisa dele em qualquer um).

- [ ] **Step 1: CSS**

`src/app/layout/PainelSimulador.module.css`:
```css
.painel { display: flex; align-items: center; gap: var(--espaco-3); padding: 6px var(--espaco-4); background: #1b1f27; color: #d7dbe2; font-size: 12px; flex-wrap: wrap; }
.painel strong { color: #fff; }
.botao { background: #2b303b; color: #fff; border: 1px solid #3a4150; border-radius: 6px; padding: 2px 8px; }
.botao:hover { background: #363c49; }
.ativo { color: #7ee2a8; } .inativo { color: #9aa3ad; } .aviso { color: #f6c453; }
.velocidades { display: inline-flex; gap: 2px; }
.velocidades .botao[aria-pressed="true"] { background: var(--cor-primaria); border-color: var(--cor-primaria); }
.espaco { flex: 1; }
```

- [ ] **Step 2: Painel**

`src/app/layout/PainelSimulador.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useRealtime } from '../providers/RealtimeProvider'
import { relogio } from '@/shared/utils/relogio'
import { useNow } from '@/shared/hooks/useNow'
import { useSessao } from '@/state/sessao'
import { formatarDataHora } from '@/shared/utils/datas'
import { CHAVE_SIMULADOR } from '@/mock-server/simulator'
import s from './PainelSimulador.module.css'

const VELOCIDADES = [1, 5, 20] as const
const semLocks = typeof navigator === 'undefined' || !('locks' in navigator)

/** Spec §4.4: pausar, velocidade, disparar, resetar, contadores, quem simula. */
export function PainelSimulador() {
  const { servidor } = useRealtime()
  const usuario = useSessao((st) => st.usuario)
  // useNow(1000) também é o que re-renderiza o rótulo "esta aba simula" quando o lock chega (defasagem máxima de 1 s)
  const agora = useNow(1000)
  const [ligado, setLigado] = useState(servidor.simulador.ligado())
  const [recebidos, setRecebidos] = useState(0)
  const [duplicados, setDuplicados] = useState(0)
  const [ultima, setUltima] = useState<string | null>(null)
  const [confirmarReset, setConfirmarReset] = useState(false)
  const velocidade = relogio.velocidade() // fonte única: itsm:relogio (spec §4.5)

  useEffect(() => {
    const vistos = new Set<string>()
    // conta no socket (já filtrado por visibilidade, antes do dedupe do realtime): o que chegou a ESTA aba
    const sair = servidor.socket.assinar((e) => { if (vistos.has(e.id)) setDuplicados((d) => d + 1); else { vistos.add(e.id); setRecebidos((r) => r + 1) } })
    const sairAcao = servidor.simulador.onAcao((a) => setUltima(a.descricao))
    // "ligado" é global (localStorage): pausar numa aba pausa a que detém o lock
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== CHAVE_SIMULADOR) return
      const on = ev.newValue !== 'off'
      if (on) servidor.simulador.ligar(); else servidor.simulador.desligar()
      setLigado(on)
    }
    window.addEventListener('storage', onStorage)
    return () => { sair(); sairAcao(); window.removeEventListener('storage', onStorage) }
  }, [servidor])

  const alternar = () => { if (ligado) servidor.simulador.desligar(); else servidor.simulador.ligar(); setLigado(!ligado) }
  const rotuloAba = !ligado ? 'pausado' : semLocks ? 'sem Web Locks: toda aba simula' : servidor.simulador.ativoNestaAba() ? 'esta aba simula' : 'outra aba simula'
  const classeAba = !ligado ? s.inativo : semLocks ? s.aviso : servidor.simulador.ativoNestaAba() ? s.ativo : s.inativo

  return (
    <footer className={s.painel} aria-label="Simulador de atividade">
      <span>Relógio virtual: <strong>{usuario ? formatarDataHora(new Date(agora).toISOString(), usuario, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(agora).toISOString()}</strong></span>
      <span className={s.velocidades} role="group" aria-label="Velocidade">
        {VELOCIDADES.map((v) => <button key={v} className={s.botao} aria-pressed={velocidade === v} onClick={() => relogio.definirVelocidade(v)}>{v}x</button>)}
      </span>
      <button className={s.botao} onClick={alternar}>{ligado ? 'Pausar simulador' : 'Retomar simulador'}</button>
      <button className={s.botao} onClick={() => void servidor.simulador.dispararAgora()}>Disparar evento</button>
      <span className={classeAba}>{rotuloAba}</span>
      <span>eventos: <strong>{recebidos}</strong> · duplicatas descartadas: <strong>{duplicados}</strong></span>
      {ultima && <span title="última ação simulada">· {ultima}</span>}
      <span className={s.espaco} />
      {confirmarReset
        ? <><span>Apaga tudo que foi feito e volta ao arquivo. Certeza?</span><button className={s.botao} onClick={() => servidor.resetar()}>Sim, resetar</button><button className={s.botao} onClick={() => setConfirmarReset(false)}>Não</button></>
        : <button className={s.botao} onClick={() => setConfirmarReset(true)}>Resetar dados</button>}
    </footer>
  )
}
```

Ajuste em `src/mock-server/simulator.ts` (Task 13): `ligar()` em aba sem lock não deve enfileirar outro `navigator.locks.request` a cada chamada. Acrescentar `let pedindoLock = false`; em `comecar()`, `if (pedindoLock) return; pedindoLock = true` antes do `obterLock`. Rodar `pnpm test src/mock-server/simulator` depois.

- [ ] **Step 3: Aviso de eventos ignorados no replay (spec §8)**

Em `src/app/App.tsx`, dentro de `<ToastProvider>`, antes de `<Rotas />`, renderizar `<AvisosIniciais />`:
```tsx
function AvisosIniciais() {
  const { servidor } = useRealtime()
  const { notificar } = useToast()
  useEffect(() => {
    // id fixo: em StrictMode o efeito roda duas vezes e o ToastProvider deduplica por id
    if (servidor.ignoradosNoReplay > 0) notificar({ id: 'replay-ignorados', tipo: 'alerta', titulo: `${servidor.ignoradosNoReplay} eventos inválidos foram ignorados ao carregar` })
  }, [servidor, notificar])
  return null
}
```
Imports: `useEffect` de `react`, `useRealtime` de `./providers/RealtimeProvider`, `useToast` de `@/shared/components`.

- [ ] **Step 4: Verificar**

`pnpm typecheck && pnpm test`. `pnpm dev`, duas abas (Marina e Helena): o rodapé de uma diz "esta aba simula" e o da outra "outra aba simula". Pausar na segunda pausa a primeira. Fechar a primeira: a segunda assume em poucos segundos. Em 20x, o relógio corre visivelmente, um chamado cruza faixa e a Marina recebe toast. "Resetar dados" pede confirmação e recarrega limpo. Para testar o aviso de replay: no DevTools, `localStorage.setItem('itsm:evt:2026-x:1', '{quebrado')` e recarregar → toast "1 eventos inválidos…" (ajustar plural: "1 evento inválido foi ignorado" quando for 1).

- [ ] **Step 5: Commit**

```bash
git add src/app src/mock-server/simulator.ts
git commit -m "feat: painel do simulador sincronizado entre abas e aviso de replay"
```

---

### Task 24: Erros amigáveis, teclado e largura estreita

**Files:**
- Modify: `src/features/chamados/components/DetalheChamado.tsx`, `src/features/chamados/pages/FilaConsultorPage.tsx`, `src/features/chamados/pages/FilaConsultorPage.module.css`, `src/features/equipe/pages/EquipePage.module.css`, `src/features/equipe/components/Redistribuir.tsx`, `FilaSemDono.tsx`, `VencendoEmBreve.tsx`

- [ ] **Step 1: 404 e 403 no detalhe**

Em `DetalheChamado`, substituir `if (q.isError) return <Erro …/>` por:
```tsx
if (q.isError) {
  const e = q.error
  if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
    return <Vazio texto="Este chamado não existe ou não está no seu alcance." />
  }
  return <Erro erro={e} tentar={() => q.refetch()} />
}
```
Import `ApiError` de `@/api/apiClient` e `Vazio` de `@/shared/components`. Abaixo do texto, um link `<a href={ROTA_INICIAL[usuario.perfil]}>Ir para a minha tela</a>` (importar `ROTA_INICIAL` de `@/app/routes/RotaProtegida`; se preferir não importar de `app/` dentro de `features/`, mover `ROTA_INICIAL` para `src/shared/utils/rotas.ts` e importar dos dois lugares).

- [ ] **Step 2: Verificação de teclado e leitor de tela**

Rodar em `pnpm dev` como Marina. Esperado: tudo passa; se algum item falhar, corrigir no componente apontado antes do commit.
- Tab percorre faixa de alerta → abas → busca → selects → linhas da fila → ações do chamado → caixa de resposta, com foco visível (`:focus-visible` global em `reset.css`).
- Diálogos (Radix `Dialog`) prendem o foco e fecham com Esc.
- Toasts têm botão "Fechar" (`Toast.tsx`).
- Cada linha da fila é um `<button>` cujo texto começa pelo número do chamado (sem `aria-label` redundante). Os checkboxes do gestor têm `aria-label` `Selecionar #N` (`Redistribuir.tsx`).

- [ ] **Step 3: Largura de celular**

Em `FilaConsultorPage.module.css` acrescentar:
```css
.voltar { display: none; }
@media (max-width: 900px) { .voltar { display: inline-flex; margin: 8px 12px; } }
```
Em `FilaConsultorPage.tsx`, dentro de `<section className={s.detalhe}>`, quando `id` existe, antes do `DetalheChamado`:
```tsx
<Button pequeno className={s.voltar} onClick={() => nav('/fila')}>Voltar à fila</Button>
```
(`Button` já aceita `className`, Task 14.)

Em `EquipePage.module.css` acrescentar `.rolagem { overflow-x: auto; }` e, em `Redistribuir.tsx`, `FilaSemDono.tsx` e `VencendoEmBreve.tsx`, envolver cada `<table className={s.tabela}>` em `<div className={s.rolagem}>…</div>`.

Verificar em 390px (DevTools, iPhone 12): fila ocupa a tela; abrir chamado esconde a fila e mostra "Voltar à fila"; painel do gestor empilha os cartões (`auto-fill`) e as tabelas rolam dentro do próprio quadro; a página não rola na horizontal.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test
git add src
git commit -m "feat: erros amigáveis no detalhe, botão voltar no celular e tabelas com rolagem"
```

---

### Task 25: README, decisões, metadados e verificação final

**Files:**
- Create: `README.md`, `docs/decisoes.md`
- Modify: `package.json`

- [ ] **Step 1: Metadados do projeto**

Em `package.json` acrescentar `"engines": { "node": ">=24" }` e `"packageManager": "pnpm@<versão exata de pnpm -v>"`. Conferir que `.gitignore` do template tem `node_modules`, `dist` e `*.local`; acrescentar `.env*`. `public/mockServiceWorker.js` fica versionado (o app não roda sem ele).

- [ ] **Step 2: README**

`README.md`, nesta ordem, em pt-BR, sem travessão, um parágrafo por item, sem copiar a spec:

```markdown
# Área de chamados (ITSM)

Fatia da área de chamados de um ITSM, em React, vista por três perfis, com API e WebSocket simulados no navegador. Resposta ao teste técnico de Frontend.

## Rodar

Node 24 (`.nvmrc`), pnpm 10.

    pnpm install
    pnpm dev        # http://localhost:5173
    pnpm test       # Vitest
    pnpm typecheck
    pnpm build && pnpm preview

## Entrar como cada perfil

O login é fake: e-mail + PIN. O PIN de todos é `123456`.

| Perfil | Quem | E-mail | Tela inicial |
|---|---|---|---|
| Consultora | Marina Almeida | marina.almeida@suporte.example | /fila |
| Gestor | Ricardo Monteiro | ricardo.monteiro@suporte.example | /equipe |
| Cliente | Helena Fernandes | helena.fernandes@lusitania.example | /meus-chamados |

Qualquer outro usuário do `dados.json` também entra com o mesmo PIN. "Quem posso ser?" na tela de login lista os três; clicar num deles preenche o e-mail e o PIN.

A sessão é por aba. Abra duas abas, entre como Marina numa e Helena na outra, e converse entre elas.

## Como ver o tempo real

- Duas abas: ação numa aba aparece na outra sem recarregar.
- Simulador (rodapé): gera atividade de fundo (clientes respondendo, consultores pegando chamado, status mudando). Pausar, 1x/5x/20x, "Disparar evento", "Resetar dados". Roda numa aba só; o rodapé diz qual. Depois de resetar, recarregue as outras abas.
- Relógio virtual: o arquivo diz que "agora" é 03/11/2026 13:00 UTC; o app parte daí e anda em tempo real. Em 20x, um prazo de 2h estoura em 6 minutos. Com o relógio real, 100% dos prazos estariam vencidos.
- Eventos duplicados: cerca de 1 em 10 eventos é entregue duas vezes de propósito; o rodapé conta quantos foram descartados.

## O que cada perfil vê e por quê
(um parágrafo por perfil, a partir da spec §5: fila "estoura primeiro" e alerta de prazo da Marina; carga, vencidos e ocioso por pessoa do Ricardo; linguagem, fuso e sugestão de reabertura da Helena)

## Como a simulação funciona
(um parágrafo a partir da spec §4: MSW, reducer compartilhado, log em localStorage com uma chave por evento, BroadcastChannel, dedupe por id, socket filtrado por visibilidade)

## Decisões
Link para `docs/decisoes.md`. Versões: por que React 19 / Vite 8 / Router 7 / MSW 2 / Vitest 4 / TS 5.9 e não os majors mais novos.

## O que ficou de fora e por quê
(spec §13)

## Estrutura
(árvore resumida da spec §4 e a regra "mock-server só entra em main.tsx")

## Testes
O que cobre (spec §10), como rodar, o que não tem (e2e).
```

- [ ] **Step 3: `docs/decisoes.md`**

Uma entrada por decisão, formato: **Decisão** · Alternativas · Por quê · Onde no código. Cobrir, nesta ordem: stack e versões; CSS Modules sem Tailwind; Radix sem estilo; login com PIN; tempo real (BroadcastChannel + simulador numa aba via Web Locks + ~10% de eventos duplicados de propósito); relógio virtual e velocidade; log por evento em `localStorage`; reducer burro e handler emitindo derivados; sessão por aba; agregados do gestor no cliente; datas com `Intl` e `zoneinfo`, sem biblioteca; escopo (6 obrigatórios + dores das personas); tabela de transições e motivo obrigatório (`400` fora dela); `prazoRelevante` e faixas (só `status` decide "encerrado"); concorrência ao pegar (`409`, último evento vence, janela aceita como limite do fake); reabrir não recria prazo; pausa não estende prazo; prioridade por categoria; similaridade por palavras; tempo ocioso por histórico; sem e2e.

- [ ] **Step 4: Verificação final**

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview   # entrar com os três perfis; o service worker precisa funcionar no build
git status     # nada não rastreado fora do lugar; nenhum .env
git log --format='%an <%ae>' | sort -u          # esperado: uma linha, Romero
git log --format=%B | grep -i 'co-authored'; echo "exit $?"   # esperado: exit 1 (nada)
```
O ambiente do executor injeta um trailer `Co-Authored-By` por padrão; a regra do repositório (cabeçalho deste plano) prevalece. Se algum commit tiver saído com a linha, reescrever antes de qualquer push: `git filter-branch -f --msg-filter 'grep -v "^Co-Authored-By"' main`.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/decisoes.md package.json .gitignore
git commit -m "docs: README com perfis, simulação e decisões"
```

- [ ] **Step 6: Entrega (só com ordem explícita do Romero)**

Não executar sem ele mandar: criar repositório privado no GitHub, `git push`, adicionar `brunopujoniseidor` como colaborador de leitura, avisar o avaliador.

**Fim do plano.**
