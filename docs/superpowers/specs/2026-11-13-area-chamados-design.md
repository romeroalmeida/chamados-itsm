# Área de chamados (ITSM) — design

Data: 2026-11-13, revisado em 2026-11-14. Teste técnico Frontend React.
Enunciado e `dados.json` em `material/` (copiados do pacote recebido em
04/11/2026).

## 1. Objetivo

Construir a área de chamados de um ITSM, em React, vista por três perfis
(consultora, gestor, cliente), com atualização em tempo real. O avaliador quer
ver **o que aparece na tela, quando e para quem**. Identidade visual não conta.

Requisitos obrigatórios do enunciado e onde são atendidos:

| # | Requisito | Seções |
|---|---|---|
| 1 | Abrir um chamado | §5.3, §7 |
| 2 | Encontrar um chamado e ver conversa, status, responsável, prazo | §5.1, §5.4 |
| 3 | Pegar um chamado para atender | §5.1, §6.3 |
| 4 | Trocar mensagens | §4.1, §5.4 |
| 5 | Mudar status com motivo; reabrir fechado | §6.1 |
| 6 | Acompanhar um grupo de consultores | §5.2 |

Tudo em tempo real: ações de outras pessoas aparecem na tela sem recarregar.

## 2. O que os dados dizem

Fatos do `dados.json` que moldam o design:

| Fato | Consequência |
|---|---|
| 620 chamados, 3.381 mensagens, 1.558 itens de histórico | listas virtualizadas; `dados.json` (1,9 MB) fora do bundle inicial |
| 1 chamado com 1.500 mensagens, todos os outros ≤ 11 | conversa virtualizada com altura variável; é o caso de teste de performance |
| 48 usuários: 1 gestor, 12 consultores (6 por grupo), 35 clientes | o gestor gere os dois grupos |
| Marina Almeida tem 42 chamados ativos | bate com o enunciado; é a persona consultora |
| Helena Fernandes: `pt-PT`, `Europe/Lisbon`; par #10612 (fechado) / #10614 (aberto) com mesmo título | datas no fuso e locale do usuário; caso real da similaridade |
| `meta.agora` = 2026-11-03T13:00:00Z | relógio virtual parte daí |
| Em `agora`: 147 vencidos, 43 vencem em 4h, 76 pausados, 196 sem primeira resposta | faixas de SLA e ordenação "estoura primeiro" |
| `sla_pausado` = true exatamente nos 76 `aguardando_cliente` | pausa do SLA é derivada do status |
| 82 pares (solicitante, título) repetidos | base para sugerir reabertura à Helena |
| Histórico: 559 atribuições, cada uma acompanhada de um `aberto → em_atendimento`; 1 reabertura `fechado → em_atendimento` | atribuir emite dois eventos (§4.1); tabela de transições (§6.1) |
| `historico.tipo = "atribuicao"` tem `de`/`para` nulos e `usuario_id` = consultor que **recebeu** | mapeamento do `reducer` (§4.6) |
| Chamados reabertos mantêm `fechado_em`/`resolvido_em` preenchidos (ex.: #10611) | toda derivação usa `status`, nunca essas datas |
| Mensagens: `interna` é `true` em 495 e `false` em 2.886 | tratar ausente/`null` como não interna, por defesa |
| `usuarios`: consultor tem `grupo_id`, gestor tem `grupos_ids`, cliente tem `empresa` | `Usuario` é união discriminada por `perfil` |

Status possíveis: `aberto`, `em_atendimento`, `aguardando_cliente`, `resolvido`,
`fechado`. Prioridades: `baixa`, `media`, `alta`, `critica`. SLA por prioridade
em horas (primeira resposta / resolução): crítica 1/4, alta 2/8, média 8/24,
baixa 24/72.

## 3. Decisões fechadas

| Tema | Decisão | Alternativas descartadas |
|---|---|---|
| Stack | React 19, Vite, TS estrito, TanStack Query v5, Zustand, React Router v7, CSS Modules + custom properties, Radix UI primitives, MSW, Vitest + Testing Library, pnpm | Next.js (sem backend, vira peso); Tailwind + shadcn (volume de estilo pequeno não justifica mais uma ferramenta) |
| Troca de perfil | login fake: e-mail + PIN de 6 dígitos, PIN padrão `123456` para todos; link "quem posso ser?" lista os três e-mails | cards de persona; rota por perfil |
| Tempo real | barramento `BroadcastChannel` entre abas + simulador de fundo em uma aba só; ~1 em 10 eventos reenviado de propósito | só simulador; só multi-aba |
| Relógio | virtual: nasce em `meta.agora`, avança com velocidade ajustável; `useNow()` é a única fonte de "agora" | relógio real com datas deslocadas; relógio real puro (100% vencido) |
| Persistência | `dados.json` + log de eventos em `localStorage`, uma chave por evento; toda aba reconstrói o estado aplicando o log | só memória; estado derivado em IndexedDB |
| Reducer | burro: aplica exatamente o evento recebido, nunca altera `para`; eventos derivados (status automático) são emitidos pelo handler | reducer que infere efeitos colaterais |
| Sessão | Zustand persistido em `sessionStorage`, por aba | `localStorage` (uma aba trocaria o usuário da outra) |
| Agregados do gestor | calculados no cliente a partir do cache de chamados e histórico | endpoint `/equipe` (exigiria invalidação a cada evento) |
| Escopo | 6 obrigatórios + dores das personas (§5) | só os 6 |
| Datas | `Intl.DateTimeFormat` com `locale` e `zoneinfo` do usuário | biblioteca de datas |

Critério para versões: o que tem suporte pelos próximos anos, não o recém-lançado.
Fixar major em `package.json` e registrar no README.

## 4. Arquitetura

Feature-first, conforme a skill `front-architecture`.

```
src/
├── app/
│   ├── routes/            # rotas + guarda por perfil
│   ├── providers/         # QueryProvider, RelogioProvider
│   └── layout/            # casca: topo com usuário, sair, painel do simulador
├── api/
│   ├── apiClient.ts       # fetch tipado; não-2xx vira ApiError
│   ├── realtime.ts        # assina o socket, dedupe por id, setQueryData
│   └── queries/           # TanStack Query: chamados, mensagens, historico, usuarios, lookups
├── features/
│   ├── auth/              # login (e-mail + PIN), "quem posso ser?"
│   ├── chamados/          # fila, detalhe, conversa, abrir, pegar, status, reabrir
│   └── equipe/            # painel do gestor: carga, SLA, redistribuir, ocioso
├── shared/
│   ├── components/        # Button, Badge, Dialog/Select/Tooltip (Radix), ListaVirtual, Toast
│   ├── hooks/             # useNow(), useFusoDoUsuario(), useUltimaVisita()
│   ├── utils/             # reducer.ts, sla.ts, status.ts, datas.ts, similaridade.ts, equipe.ts
│   ├── styles/            # tokens.css, reset.css
│   └── types/             # Chamado, Mensagem, Historico, Usuario (união), Grupo, Evento…
├── state/                 # Zustand: sessão (usuário logado), filtros de UI, simulador
├── mock-server/           # o "backend": importado só em main.tsx
│   ├── db.ts              # dados.json + replay do log → estado atual; assina o bus
│   ├── eventLog.ts        # uma chave por evento em localStorage
│   ├── bus.ts             # BroadcastChannel entre abas (fallback: evento `storage`)
│   ├── handlers.ts        # MSW: rotas REST; validação; emissão de eventos
│   ├── socket.ts          # emissor de eventos para o app
│   └── simulator.ts       # movimento de fundo + duplicatas; roda em uma aba
├── tests/                 # setup do Vitest, fixtures recortadas do dados.json
└── main.tsx
```

Regras:

- `equipe` e `chamados` não se importam. O comum (tipos, queries, SLA, status,
  agregados) vive em `api/queries/` e `shared/`.
- `mock-server/` só entra em `main.tsx`. O app fala com ele por HTTP (MSW) e
  pelo contrato de `socket.ts`. Trocar por backend real: apagar a pasta e
  apontar `apiClient` para a URL.
- `shared/utils/reducer.ts` é puro e sem dependência. `mock-server/db.ts` e
  `api/realtime.ts` usam a mesma função: cliente e servidor concordam por
  construção.
- Path alias `@/`. Barrel `index.ts` por feature.

### 4.1 Contrato HTTP (MSW)

Sessão: `POST /auth/entrar` devolve o `Usuario`; o store Zustand persiste em
`sessionStorage` (chave `itsm:sessao`), **por aba**, para Marina e Helena
conviverem no mesmo navegador. Reload mantém; nova aba pede login. Toda
requisição leva header `X-Usuario-Id`. Sem token: é fake e documentado.

| Método | Rota | Corpo | Resposta | Eventos emitidos |
|---|---|---|---|---|
| POST | `/auth/entrar` | `{ email, pin }` | `Usuario` | — |
| GET | `/usuarios`, `/grupos`, `/categorias`, `/sla` | — | listas | — |
| GET | `/chamados` | — | `Chamado[]` visíveis ao usuário (§7) | — |
| GET | `/chamados/:id` | — | `{ chamado, mensagens, historico }` filtrado por perfil | — |
| GET | `/historico` | — | `Historico[]` dos chamados visíveis (gestor e consultor) | — |
| POST | `/chamados` | `{ titulo, descricao, categoria_id }` | `{ id }` | `chamado.aberto` |
| POST | `/chamados/:id/mensagens` | `{ texto, interna }` | `{ ok }` | `mensagem.adicionada`; **mais** `status.alterado` (`aguardando_cliente → em_atendimento`, motivo "Cliente respondeu") se autor é cliente e status era `aguardando_cliente` |
| POST | `/chamados/:id/atribuir` | `{ consultor_id }` | `{ ok }` | `chamado.atribuido`; **mais** `status.alterado` (`aberto → em_atendimento`, motivo automático) se status era `aberto`. Em `em_atendimento`/`aguardando_cliente` (redistribuição) só o primeiro |
| POST | `/chamados/:id/status` | `{ para, motivo }` | `{ ok }` | `status.alterado` |

Só cliente abre chamado (`403` para os demais); `solicitante_id` é o usuário
da sessão. O servidor preenche em `POST /chamados`: `numero` = maior + 1,
`grupo_id` =
`categoria.grupo_id`, `prioridade` pela regra da §5.3, `status: 'aberto'`,
`aberto_em`/`atualizado_em` do relógio virtual, prazos pela §6.2,
`responsavel_id: null`, `sla_pausado: false`.

`/atribuir` em `resolvido`/`fechado` → `400`. `GET /historico` para cliente →
`403` (a tela dele não usa). Em `GET /chamados/:id`, cliente recebe o histórico
de status **sem `motivo`** e sem entradas de atribuição; equipe recebe tudo.

Motivos automáticos são preenchidos pelo **servidor**: "Assumido para
atendimento" (consultor pega), "Atribuído por {gestor}", "Cliente respondeu",
"Confirmado pelo cliente" (cliente, `resolvido → fechado`: único caso em que
`POST /status` aceita `motivo` vazio). Nas demais transições `motivo` é
obrigatório e vazio dá `400`. `usuario_id` dos `status.alterado` derivados é
o **ator**: quem pegou/atribuiu, ou o cliente que respondeu.

Erros: `400` validação (motivo vazio, transição inválida, campo faltando),
`401` sem sessão ou PIN errado, `403` perfil sem permissão, `404` não existe,
`409` conflito (pegar chamado já com responsável). Corpo `{ codigo, mensagem }`.

### 4.2 Contrato do socket

```ts
type Evento =
  | { id: string; tipo: 'chamado.aberto';      ocorrido_em: string; payload: Chamado }
  | { id: string; tipo: 'chamado.atribuido';   ocorrido_em: string; payload: { chamado_id: string; consultor_id: string } }
  | { id: string; tipo: 'mensagem.adicionada'; ocorrido_em: string; payload: Mensagem }
  | { id: string; tipo: 'status.alterado';     ocorrido_em: string; payload: { chamado_id: string; de: Status; para: Status; motivo: string; usuario_id: string } }

interface Socket {
  assinar(cb: (e: Evento) => void): () => void   // retorna unsubscribe
  estado(): 'conectado' | 'desconectado'
}
```

Formato exatamente igual ao do enunciado, sem campos extras. Um mesmo evento
pode chegar mais de uma vez.

### 4.3 Fluxo de uma ação e sincronização entre abas

1. Tela chama mutation → `POST` → MSW da aba de origem.
2. Handler valida contra o `db` local, cria os eventos com `ocorrido_em` do
   relógio virtual, **grava cada um no `eventLog`** (só a aba de origem grava)
   e publica no `bus`.
3. `bus.publicar` chama os assinantes **locais** diretamente e depois posta no
   `BroadcastChannel` (que não entrega à própria instância). Em cada aba, dois
   assinantes: `db.ts` (aplica no `db` daquela aba, com dedupe por `id`) e
   `socket.ts`, nessa ordem: `visivelPara` em `chamado.aberto` precisa do
   chamado já no `db`. O handler **não** aplica no `db` diretamente: só
   publica; `db.ts` aplica pela assinatura síncrona local. Um caminho só.
4. `socket.ts` é o "servidor" do socket: aplica `visivelPara(usuario, chamado)`
   (a mesma função dos handlers, §7) ao usuário da sessão daquela aba e
   **descarta** evento de chamado invisível e `mensagem.adicionada` interna
   para cliente. Só então repassa ao app.
5. `realtime.ts` ignora `id` já visto, aplica com o `reducer` e projeta nos
   caches (§4.6).

Bootstrap de `db.ts`: assina o `bus` **antes** de reler o log; o dedupe absorve
a sobreposição.

Não há atualização otimista separada; a tela muda quando o evento chega, que é
imediato porque o `bus` entrega localmente. Um caminho só para dado mudar.

`eventLog`: uma chave por evento, `itsm:evt:<ocorrido_em>:<id>`, valor = o
evento. Replay ordena pela chave. Sem read-modify-write, duas abas gravando ao
mesmo tempo não perdem nada. Chave `itsm:relogio` guarda o relógio (§4.5).

Fallback: sem `BroadcastChannel`, o `bus` escuta o evento `storage` do
`localStorage`, que dispara nas outras abas quando uma chave de evento é gravada.

### 4.4 Simulador

Roda em **uma aba só**: a que obtém `navigator.locks.request('itsm:simulador')`.
Se a aba fecha, a próxima que pedir o lock assume. Sem `navigator.locks`
(ambiente antigo), roda em toda aba e o painel avisa.

Ligado por padrão. Painel discreto no rodapé: pausar/retomar, velocidade (1x,
5x, 20x), "disparar evento agora", "resetar dados", contador de eventos
recebidos e de duplicatas descartadas, indicador "esta aba simula / outra aba
simula". Estado (ligado, velocidade) em `localStorage` para valer em todas as
abas; `velocidade` vive só em `itsm:relogio` (§4.5), fonte única.

Duplicação proposital: `bus.publicar` em `bus.ts`, quando o simulador está
ligado, reposta ~10% dos eventos uma segunda vez. Mudanças de status do
simulador usam motivo fixo "Simulador: atualização de rotina".

A cada intervalo (base 8 s em 1x, dividido pela velocidade) escolhe uma ação
plausível e a executa com `fetch` **pelos mesmos handlers HTTP** da §4.1,
mandando `X-Usuario-Id` do ator simulado (passa pela validação da §7), como se
fosse um usuário em outra aba. "Pausar" para os eventos; o relógio virtual
continua (só a velocidade o afeta, §4.5):

- cliente responde em chamado `aguardando_cliente` ou `em_atendimento`;
- consultor pega chamado da fila sem dono do próprio grupo;
- consultor muda status (`em_atendimento → aguardando_cliente | resolvido`);
- cliente abre chamado novo (menos frequente).

~10% dos eventos são publicados duas vezes no `bus`.

### 4.5 Relógio virtual

`itsm:relogio = { inicioVirtual: meta.agora, inicioReal: Date.now(), velocidade }`
gravado na primeira carga. `agora() = inicioVirtual + (Date.now() − inicioReal)
× velocidade`. A velocidade do simulador **acelera também o relógio**: em 20x
um prazo de 2h estoura em 6 min, visível na demo. Mudar a velocidade reancora
(`inicioVirtual = agora()`, `inicioReal = Date.now()`) para não dar salto.
`agora()` lê `itsm:relogio` do `localStorage` a cada chamada, então reancorar
numa aba vale nas outras na hora. `useNow()` reavalia a cada 30 s reais (ou 5 s
em 20x) e ao evento `storage` da chave. O `mock-server` usa a mesma função
para carimbar eventos. "Resetar dados" apaga as chaves `itsm:*` e
recarrega: volta ao `dados.json` puro.

### 4.6 Reducer e estado

```ts
interface Estado {
  chamados: Record<string, Chamado>
  mensagens: Record<string, Mensagem[]>     // por chamado_id, ordem cronológica
  historico: Historico[]
  usuarios: Record<string, Usuario>         // necessário para saber o perfil do autor
  idsAplicados: Set<string>
}
aplicar(estado: Estado, evento: Evento): Estado   // puro; devolve o mesmo objeto se id já aplicado
```

`db.ts` guarda um `Estado` completo. `realtime.ts` guarda um `Estado` espelho
com duas fontes de escrita, em ordem clara:

- **Hidratação**: todo `GET` bem-sucedido **substitui** a fatia correspondente
  do espelho (`GET /chamados` → `chamados` inteiro; `GET /chamados/:id` →
  `chamados[id]`, `mensagens[id]` e as entradas de `historico` desse chamado;
  `GET /historico` → `historico` inteiro; `GET /usuarios`, no login →
  `usuarios`). Vale para a primeira carga e para todo refetch (foco, retry).
- **Eventos**: após cada `aplicar`, **projeta** para os caches do TanStack
  Query: `['chamados']` ← `Object.values(chamados)`; `['chamado', id]` ←
  `{ chamado, mensagens[id], historico filtrado }`, só se esse cache já existe;
  `['historico']` ← `historico`. Uma função por cache em `api/realtime.ts`.

Evento cujo `chamado_id` não existe no espelho (corrida entre assinar o socket
e o `GET` resolver) é no-op, exceto `chamado.aberto`, que insere. O `GET`
seguinte traz o estado completo. `idsAplicados` continua registrando o id, para
o dedupe.

| Evento | Efeito |
|---|---|
| `chamado.aberto` | insere o chamado |
| `chamado.atribuido` | `responsavel_id = consultor_id`, `atualizado_em = ocorrido_em`; **acrescenta** `historico { tipo: 'atribuicao', de: null, para: null, usuario_id: consultor_id, motivo: null }`. Último evento vence (fonte de verdade é o servidor, que barra o conflito com `409`) |
| `mensagem.adicionada` | insere a mensagem; `atualizado_em`; se autor é consultor/gestor, `interna` falsa e `primeira_resposta_em` nulo → preenche com `criada_em` |
| `status.alterado` | `status = para`, `atualizado_em`; `sla_pausado = (para === 'aguardando_cliente')`; `resolvido_em` ao entrar em `resolvido`, `fechado_em` ao entrar em `fechado` (não limpa ao reabrir, como no dado); **acrescenta** `historico { tipo: 'status', de, para, motivo, usuario_id }` |

Entradas de `historico` criadas pelo reducer usam `id = evento.id` (1:1; serve
de key e de dedupe).

Status nunca muda por `chamado.atribuido` nem por `mensagem.adicionada`; o
handler emite o `status.alterado` correspondente (§4.1). O reducer nunca
altera `para`: estado e histórico sempre batem com o payload.

Ordem no replay: `chamado.atribuido` e seu `status.alterado` têm o mesmo
`ocorrido_em` e desempatam pelo `id`. Como o reducer trata cada um de forma
independente, a ordem entre eles não importa. Não impor ordem rígida.

## 5. Telas

### 5.0 Login (`/entrar`)

E-mail, PIN de 6 dígitos, botão entrar. Link "quem posso ser?" abre lista com
Marina, Ricardo e Helena (nome, perfil, e-mail). Após entrar, redireciona para a
rota inicial do perfil e grava "última visita = agora" se não existir. Rotas
protegidas: sem sessão volta ao login; perfil errado recebe "sem acesso" com
link para a tela dele.

### 5.1 Consultora — `/fila` (Marina)

Duas colunas: fila à esquerda, chamado aberto à direita (em telas estreitas, a
fila vira a tela e o chamado abre por cima).

Fila:

- Abas "Meus" e "Do grupo, sem dono", com contadores. "Meus" lista por padrão
  só ativos (`aberto`, `em_atendimento`, `aguardando_cliente`); o filtro de
  status permite incluir `resolvido`/`fechado`.
- Ordenação padrão **estoura primeiro**: menor `prazoRelevante − agora` (§6.2)
  no topo. Vencidos primeiro, depois críticos, atenção, ok; pausados depois;
  resolvidos/fechados por último, mais recente primeiro.
- Linha: número, título, nome do cliente, status, badge de prazo ("vence em
  1h 40", "venceu há 3h", "pausado"), ponto azul se há mensagem nova desde a
  última vez que ela abriu o chamado (`useUltimaVisita`, chave
  `itsm:visita:<usuarioId>:<chamadoId>` em `localStorage`; sem registro = sem
  ponto). A faixa de novidades do cliente usa `itsm:visita:<usuarioId>`.
- Filtro por status; busca por número ou texto do título.
- Ordenações alternativas: mais recente, cliente.

Chamado aberto (componente compartilhado, §5.4) com ações de consultor: pegar
(se sem dono e do grupo dela), responder, nota interna, mudar status.

Mensagem nova **no chamado em que ela está digitando** não rola a conversa nem
mexe no texto: aparece "1 mensagem nova" acima da caixa, clicável, que rola até
lá. Se a caixa está vazia e ela está no fim, rola normalmente.

### 5.2 Gestor — `/equipe` (Ricardo)

Todos os agregados são calculados no cliente, em `shared/utils/equipe.ts`, a
partir de `GET /chamados` e `GET /historico` (o gestor recebe tudo dos grupos
dele). Mudam sozinhos quando o cache muda por evento.

- **Cartões por consultor**, dos grupos que ele gere: ativos (`em_atendimento`
  ou `aguardando_cliente`; `aberto` nunca tem responsável), vencidos,
  vencendo em 4h, e **tempo ocioso nos últimos 7 dias** (§6.5). Ordenado por
  vencidos desc, depois ativos desc. Quem está com zero ativo aparece em
  destaque "sem chamado".
- Clicar no cartão lista os chamados dele com seleção múltipla e botão
  **Redistribuir para…** (select de consultor do mesmo grupo). Um
  `POST /atribuir` por chamado.
- **Fila sem dono** dos grupos dele, com select de consultor na linha.
- **Vencendo nas próximas 4h**, cruzando os dois grupos, ordenada por prazo.
- Clicar num chamado abre o detalhe (§5.4) com ações de gestor: as mesmas do
  consultor mais "Atribuir a…" (select de consultor do grupo do chamado).

### 5.3 Cliente — `/meus-chamados` (Helena)

Linguagem de cliente. Nunca aparecem: categoria interna, grupo, prioridade,
nota interna, nome de consultor fora do contexto "quem está atendendo".

- **Novidades desde sua última visita**: faixa no topo com uma linha por
  chamado com `atualizado_em` posterior à última visita ("Rafael respondeu",
  "Resolvido, confirme"). Ao fechar a faixa, última visita = agora. Primeira
  visita: faixa não aparece.
- Lista: título, situação em linguagem dela (`aberto` → "aguardando
  atendimento"; `em_atendimento` → "em atendimento por Rafael";
  `aguardando_cliente` → "aguardando sua resposta"; `resolvido` → "resolvido,
  aguardando sua confirmação"; `fechado` → "fechado"), e "previsão de resposta
  até terça, 14h" no fuso dela, usando o **prazo relevante da §6.2**; nada
  quando pausado, resolvido ou fechado; "em atraso" se o prazo já passou
  (caso comum em chamado reaberto, que mantém prazos antigos).
- **Abrir chamado** (`/meus-chamados/novo`): "O que parou?" (select com as 8
  categorias em nome amigável), título, descrição. Prioridade: `media` por
  padrão, `alta` se a categoria for Acesso e senhas ou Rede e VPN (regra interna
  simples, documentada). Enquanto digita o título: "Parece com seu chamado
  #10612 (fechado em 06/09). É o mesmo problema?" com **Reabrir** ou **É
  outro**. Reabrir navega para o chamado e abre o diálogo de reabertura (§5.4)
  com o motivo pré-preenchido pela descrição digitada; ao confirmar, primeiro
  `POST /status` (reabre), depois `POST /mensagens` com a descrição. Se o
  segundo falhar: toast, chamado já reaberto, texto fica na caixa. Regra em
  §6.4.
- Detalhe (§5.4) com ações de cliente: responder; "Resolvido? Confirmar"
  (→ `fechado`, motivo automático); "Ainda não resolveu" e "Reabrir" (ambos
  → `em_atendimento`) abrem diálogo com campo "Conte o que aconteceu",
  obrigatório, que vira o `motivo`.

### 5.4 Detalhe de chamado — `/chamados/:id` (compartilhado)

Um componente, três visões. Cabeçalho: número, título, status, responsável,
prazo (badge de SLA para equipe; "previsão" para cliente), cliente e empresa
(equipe), "reaberto em {data}" se há `status.alterado` saindo de
`resolvido`/`fechado` no histórico. Conversa virtualizada (`measureElement`
para altura variável), ordem cronológica, autor e hora no fuso do usuário;
notas internas com fundo distinto e rótulo "só a equipe vê", ocultas para
cliente. Histórico de status com motivos: equipe vê tudo em aba "Histórico";
cliente vê os passos resumidos no topo da conversa. Caixa de resposta com
alternância "Resposta / Nota interna" (equipe) ou só resposta (cliente). Menu
de ações filtrado por §6.1 e §7; toda ação com motivo abre diálogo (Radix)
com campo obrigatório.

## 6. Regras de domínio

### 6.1 Transições de status

| De | Para | Quem | Motivo |
|---|---|---|---|
| aberto | em_atendimento | consultor pega; gestor atribui (via `/atribuir`) | automático pelo servidor |
| em_atendimento | aguardando_cliente | consultor, gestor | obrigatório |
| aguardando_cliente | em_atendimento | automático quando cliente responde; consultor, gestor | automático / obrigatório |
| em_atendimento | resolvido | consultor, gestor | obrigatório |
| resolvido | fechado | cliente confirma; consultor, gestor | automático / obrigatório |
| resolvido, fechado | em_atendimento | qualquer perfil (reabertura) | obrigatório (cliente digita no diálogo) |

Tabela em `shared/utils/status.ts`: `transicoesPermitidas(status, perfil)`.
Fora da tabela, a ação não aparece; se chegar ao servidor, `400`.

Reabrir **não recria prazo**: mantém os originais e o detalhe mostra "reaberto
em {data}". Decisão documentada. `/atribuir` em `resolvido`/`fechado` → `400`.

### 6.2 SLA

- `prazoRelevante`: `prazo_primeira_resposta` enquanto `primeira_resposta_em`
  for nulo; depois `prazo_resolucao`. Vale para badge, ordenação e "previsão".
- Primeira resposta = primeira mensagem não interna de autor consultor/gestor
  (`reducer`, §4.6).
- `aguardando_cliente` ⇒ `sla_pausado = true`; sai do cálculo de vencidos.
  Voltar para `em_atendimento` despausa. Não há extensão de prazo pelo tempo
  pausado (simplificação documentada).
- Faixas em `sla.ts`: `encerrado` se `status ∈ {resolvido, fechado}`;
  `pausado` se `sla_pausado`; senão por `prazoRelevante − agora`: `vencido`
  (< 0), `critico` (≤ 4h), `atencao` (≤ 24h), `ok`. Tokens CSS por faixa.
  Só `status` decide "encerrado"; `resolvido_em`/`fechado_em` nunca.
- Chamado novo: prazos = `aberto_em` + horas do SLA da prioridade.

### 6.3 Pegar chamado e concorrência

Só chamado sem responsável, do grupo do consultor. O handler valida contra o
`db` da aba, que já aplicou os eventos das outras abas (§4.3); se já há
responsável, `409` "Rafael pegou antes de você". No `reducer`, último
`chamado.atribuido` vence; a janela em que duas abas passam na validação ao
mesmo tempo é de milissegundos e aceita como limite do fake (comentada no
código).

### 6.4 Similaridade (Helena)

Candidatos: chamados do mesmo solicitante com status `resolvido` ou `fechado`
e `atualizado_em` nos últimos 90 dias (relógio virtual). Normaliza título
(minúsculas, sem acento, sem stopwords pt). Sugere o mais recente com ≥ 2
palavras em comum ou título idêntico. Uma sugestão só.

### 6.5 Tempo ocioso (Ricardo)

Janela: últimos 7 dias até `agora`. Para cada consultor, reconstrói do
`historico` (atribuições e status, ordenado por `ocorrido_em`) e do estado
atual a linha do tempo "tem pelo menos um chamado ativo" (`em_atendimento` ou
`aguardando_cliente` atribuído a ele). Ocioso = soma dos intervalos sem nenhum
ativo, limitado à janela. Exibido como "3h 20 ocioso na semana". Função
`ociosoNaJanela(consultorId, historico, chamados, agora)` em `equipe.ts`.

## 7. Permissões

| Ação / visão | Cliente | Consultor | Gestor |
|---|---|---|---|
| Ver chamado | só os próprios | do próprio grupo | dos grupos que gere |
| Ver nota interna, categoria, grupo, prioridade, histórico completo | não | sim | sim |
| Abrir chamado | sim | não (fora de escopo, §13) | não |
| Pegar | não | sim, sem dono, do grupo | não |
| Atribuir/redistribuir | não | não | sim |
| Responder | sim | sim | sim (fora da rotina, não bloqueado) |
| Nota interna | não | sim | sim |
| Mudar status | confirmar, "ainda não resolveu", reabrir | conforme §6.1 | conforme §6.1 |

`GET /chamados`, `GET /chamados/:id` e `GET /historico` aplicam o filtro de
visão pelo usuário da sessão (cliente não recebe mensagens internas). Toda
mutation revalida no servidor (`403`). A UI só esconde o que o servidor
bloquearia.

## 8. Erros e estados

- `apiClient`: não-2xx → `ApiError { status, codigo, mensagem }`.
- Toda tela: carregando (skeleton simples), vazio (texto orientando), erro
  ("tentar de novo").
- Mutation falha → toast com `mensagem` do servidor; cache intacto.
- `BroadcastChannel` indisponível → fallback por `storage` (§4.3). Aba
  suspensa → `refetchOnWindowFocus` refaz as queries ao voltar.
- Log inválido em `localStorage` (JSON quebrado, evento desconhecido) →
  descarta só a chave inválida e toast "1 evento ignorado". Relógio inválido →
  reinicia o relógio.
- Rota com id inexistente ou sem acesso → página amigável com link para a
  lista do perfil.

## 9. Performance

- Conversa e filas com `@tanstack/react-virtual`; conversa com `measureElement`.
- Ordenação/filtro das filas e agregados do gestor em `useMemo` sobre o cache.
- `dados.json` via `import()` dinâmico dentro de `mock-server/db.ts`.
- `useNow()` com intervalo próprio; componentes de badge assinam só ele.
- `setQueryData` por evento, sem `invalidateQueries`; projeção do `Estado`
  espelho para os três caches (§4.6). `['chamado', id]` só é atualizado se já
  foi carregado; senão o `GET` traz tudo quando a tela abrir.

## 10. Testes (Vitest + Testing Library)

1. `reducer`: aplica os 4 tipos e acrescenta histórico; ignora `id` repetido;
   não muda status em `chamado.atribuido`; preenche `primeira_resposta_em`
   só com mensagem não interna de equipe.
2. `handlers`: atribuir chamado `aberto` emite dois eventos; cliente responder
   em `aguardando_cliente` emite dois; pegar chamado com dono → `409`;
   motivo vazio em transição manual → `400`; `POST /chamados` preenche
   número, grupo, prazos.
2b. `socket.ts`: cliente não recebe mensagem interna nem chamado de outro
   cliente; consultor não recebe chamado de outro grupo.
3. `sla.ts`: faixas, pausa, vencido, prazo relevante, com relógio fixo.
4. `status.ts`: tabela permite/bloqueia por perfil.
5. `similaridade.ts`: acha #10612 para o título de #10614; não sugere título
   sem palavra em comum; respeita 90 dias.
6. `equipe.ts`: consultor sem nada a semana toda = 7 d ocioso; com um chamado
   ativo o tempo todo = 0.
7. Conversa: mensagem nova com texto na caixa mostra aviso e não rola.
8. Fila da consultora: ordenação "estoura primeiro" com 5 chamados fixos
   (vencido, crítico, ok, pausado, fechado).
9. Login: PIN errado → erro; cada perfil → rota inicial certa.

Fixtures: recorte do `dados.json` em `tests/fixtures/`. Sem e2e nesta entrega;
anotado no README como próximo passo.

## 11. Entrega e documentação

- README: como rodar (`pnpm i`, `pnpm dev`, `pnpm test`), os três e-mails e o
  PIN, como usar o simulador e o multi-aba, decisões resumidas, o que ficou de
  fora e por quê.
- `docs/decisoes.md`: uma entrada por decisão da §3 e das §6, com o porquê.
- Este spec e o plano de implementação em `docs/superpowers/`.
- Repositório privado no GitHub, commits pequenos com histórico preservado,
  colaborador `brunopujoniseidor` em leitura. Push e convite só com ordem
  explícita do Romero, no fim.

## 12. Ordem de implementação (orientação para o plano)

Primeiro o núcleo sem tela: tipos, `reducer`, `db`, `eventLog`, `bus`,
`handlers`, com os testes 1 a 6. É onde as regras se materializam. Depois
login e casca, detalhe compartilhado, fila da consultora, cliente, gestor,
simulador e painel, README.

## 13. Fora de escopo

Autenticação real, backend, anexos, notificações por e-mail, busca full-text,
relatórios além do painel do gestor, internacionalização da interface (textos
em pt-BR; só datas seguem o locale do usuário), e2e, mobile dedicado (layout
responde, mas não é o alvo), extensão de prazo por tempo pausado, consultor
abrir chamado em nome de cliente.
