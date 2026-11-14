# Área de chamados (ITSM) — design

Data: 2026-11-13. Teste técnico Frontend React. Enunciado e `dados.json` em
`material/` (copiados do pacote recebido em 04/11/2026).

## 1. Objetivo

Construir a área de chamados de um ITSM, em React, vista por três perfis
(consultora, gestor, cliente), com atualização em tempo real. O avaliador quer
ver **o que aparece na tela, quando e para quem**. Identidade visual não conta.

Requisitos obrigatórios do enunciado:

1. Abrir um chamado.
2. Encontrar um chamado e ver conversa, status, responsável e prazo.
3. Pegar um chamado para atender.
4. Trocar mensagens no chamado.
5. Mudar status registrando motivo. Chamado fechado pode ser reaberto.
6. Acompanhar a situação de um grupo de consultores.

Tudo em tempo real: ações de outras pessoas aparecem na tela sem recarregar.

## 2. O que os dados dizem

Fatos do `dados.json` que moldam o design:

| Fato | Consequência |
|---|---|
| 620 chamados, 3.381 mensagens, 1.558 itens de histórico | listas virtualizadas; `dados.json` (1,9 MB) fora do bundle inicial |
| 1 chamado com 1.500 mensagens, todos os outros ≤ 11 | conversa virtualizada; é o caso de teste de performance |
| 48 usuários: 1 gestor, 12 consultores (6 por grupo), 35 clientes | o gestor gere os dois grupos |
| Marina Almeida tem 42 chamados abertos | bate com o enunciado; é a persona consultora |
| Helena Fernandes: `pt-PT`, `Europe/Lisbon` | datas no fuso e locale do usuário logado |
| `meta.agora` = 2026-11-03T13:00:00Z | relógio virtual parte daí |
| Em `agora`: 147 vencidos, 43 vencem em 4h, 76 pausados, 196 sem primeira resposta | faixas de SLA e ordenação "estoura primeiro" |
| `sla_pausado` = true exatamente nos 76 `aguardando_cliente` | pausa do SLA é derivada do status |
| 82 pares (solicitante, título) repetidos | base para sugerir reabertura à Helena |
| Histórico: 559 atribuições, 999 mudanças de status, 1 reabertura `fechado → em_atendimento` | tabela de transições (§6) |
| Mensagens: `interna` é `true` em 495 e `null` nas demais | tratar `null` como não interna |

Status possíveis: `aberto`, `em_atendimento`, `aguardando_cliente`, `resolvido`,
`fechado`. Prioridades: `baixa`, `media`, `alta`, `critica`. SLA por prioridade
em horas (primeira resposta / resolução): crítica 1/4, alta 2/8, média 8/24,
baixa 24/72.

## 3. Decisões fechadas

| Tema | Decisão | Alternativas descartadas |
|---|---|---|
| Stack | React 19, Vite, TS estrito, TanStack Query v5, Zustand, React Router v7, CSS Modules + custom properties, Radix UI primitives, MSW, Vitest + Testing Library, pnpm | Next.js (sem backend, vira peso); Tailwind + shadcn (volume de estilo pequeno não justifica mais uma ferramenta) |
| Troca de perfil | login fake: e-mail + PIN de 6 dígitos, PIN padrão `123456` para todos; link "quem posso ser?" lista os três e-mails | cards de persona; rota por perfil |
| Tempo real | barramento `BroadcastChannel` compartilhado entre abas + simulador de fundo; ~1 em 10 eventos reenviado de propósito | só simulador; só multi-aba |
| Relógio | virtual: nasce em `meta.agora`, avança em tempo real; `useNow()` é a única fonte de "agora" | relógio real com datas deslocadas; relógio real puro (100% vencido) |
| Persistência | `dados.json` + log append-only de eventos em `localStorage`; toda aba reconstrói o estado aplicando o log; botão "resetar dados" | só memória; estado derivado em IndexedDB |
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
│   ├── providers/         # QueryProvider, RelogioProvider, SessaoProvider
│   └── layout/            # casca: topo com usuário, sair, painel do simulador
├── api/
│   ├── apiClient.ts       # fetch tipado; não-2xx vira ApiError
│   ├── realtime.ts        # assina o socket, dedupe por id, setQueryData
│   └── queries/           # TanStack Query: chamados, mensagens, usuarios, equipe
├── features/
│   ├── auth/              # login (e-mail + PIN), "quem posso ser?"
│   ├── chamados/          # fila, detalhe, conversa, abrir, pegar, status, reabrir
│   └── equipe/            # painel do gestor: carga, SLA, redistribuir, ocioso
├── shared/
│   ├── components/        # Button, Badge, Dialog/Select/Tooltip (Radix), ListaVirtual
│   ├── hooks/             # useNow(), useFusoDoUsuario()
│   ├── utils/             # sla.ts, status.ts, datas.ts, similaridade.ts
│   ├── styles/            # tokens.css, reset.css
│   └── types/             # Chamado, Mensagem, Usuario, Grupo, Evento…
├── state/                 # Zustand: sessão (usuário logado), filtros de UI
├── mock-server/           # o "backend": importado só em main.tsx
│   ├── db.ts              # dados.json + replay do log → estado atual
│   ├── reducer.ts         # aplica um Evento ao estado (compartilhado com o app)
│   ├── eventLog.ts        # append-only em localStorage
│   ├── bus.ts             # BroadcastChannel entre abas
│   ├── handlers.ts        # MSW: rotas REST
│   ├── socket.ts          # emissor de eventos para o app
│   └── simulator.ts       # movimento de fundo + duplicatas propositais
├── tests/                 # setup do Vitest, fixtures recortadas do dados.json
└── main.tsx
```

Regras:

- `equipe` e `chamados` não se importam. O comum (tipos, queries, SLA, status)
  vive em `api/queries/` e `shared/`.
- `mock-server/` só entra em `main.tsx`. O app fala com ele por HTTP (MSW) e
  pelo contrato de `socket.ts`. Trocar por backend real: apagar a pasta e
  apontar `apiClient` para a URL.
- `reducer.ts` fica em `mock-server/` mas é puro e sem dependência; o app o
  importa via `shared/utils/` re-export para aplicar eventos no cache. Mesma
  função nos dois lados: cliente e servidor concordam por construção.
- Path alias `@/`. Barrel `index.ts` por feature.

### 4.1 Contrato HTTP (MSW)

| Método | Rota | Corpo | Evento gerado |
|---|---|---|---|
| POST | `/auth/entrar` | `{ email, pin }` | — (retorna `Usuario`) |
| GET | `/me` | — | — |
| GET | `/usuarios`, `/grupos`, `/categorias`, `/sla` | — | — |
| GET | `/chamados?perfil=…` | — | — (filtra pelo usuário da sessão; §7) |
| GET | `/chamados/:id` | — | — (inclui mensagens e histórico) |
| POST | `/chamados` | `{ titulo, descricao, categoria_id }` | `chamado.aberto` |
| POST | `/chamados/:id/mensagens` | `{ texto, interna }` | `mensagem.adicionada` (+ `status.alterado` automático se cliente responde em `aguardando_cliente`) |
| POST | `/chamados/:id/atribuir` | `{ consultor_id }` | `chamado.atribuido` |
| POST | `/chamados/:id/status` | `{ para, motivo }` | `status.alterado` |
| GET | `/equipe` | — | — (agregados por consultor; §5.2) |

Sessão: `POST /auth/entrar` devolve o usuário; o id vai para o store de sessão e
segue em header `X-Usuario-Id`. Sem token: é fake e documentado.

Erros: `400` validação (motivo vazio, transição inválida), `403` perfil sem
permissão, `404` não existe, `409` conflito (pegar chamado já pego). Corpo
`{ codigo, mensagem }`.

### 4.2 Contrato do socket

```ts
type Evento =
  | { id: string; tipo: 'chamado.aberto';     ocorrido_em: string; payload: Chamado }
  | { id: string; tipo: 'chamado.atribuido';  ocorrido_em: string; payload: { chamado_id: string; consultor_id: string } }
  | { id: string; tipo: 'mensagem.adicionada';ocorrido_em: string; payload: Mensagem }
  | { id: string; tipo: 'status.alterado';    ocorrido_em: string; payload: { chamado_id: string; de: Status; para: Status; motivo: string; usuario_id: string } }

interface Socket {
  assinar(cb: (e: Evento) => void): () => void   // retorna unsubscribe
  estado(): 'conectado' | 'desconectado'
}
```

Formato igual ao do enunciado. Um mesmo evento pode chegar mais de uma vez.

### 4.3 Fluxo de uma ação

1. Tela chama mutation → `POST` → MSW.
2. Handler valida com o estado atual do `db`, cria o evento com `ocorrido_em`
   do relógio virtual, grava em `eventLog`, aplica em `db` via `reducer`,
   publica no `bus`.
3. `bus` entrega a todas as abas, inclusive a origem. `socket.ts` repassa.
4. `realtime.ts` ignora `id` já visto (Set em memória), aplica o evento no cache
   do TanStack Query com `setQueryData` usando o mesmo `reducer`.

Não há atualização otimista separada: a resposta do POST é só `{ ok }`; a tela
muda quando o evento chega, que é imediato porque o `bus` entrega localmente.
Um caminho só para dado mudar.

### 4.4 Simulador

Ligado por padrão. Painel discreto no rodapé: pausar/retomar, velocidade
(1x, 5x, 20x), "disparar evento agora", "resetar dados", contador de eventos
recebidos e de duplicatas descartadas.

A cada intervalo (base 8 s em 1x) escolhe uma ação plausível:

- cliente responde em chamado `aguardando_cliente` ou `em_atendimento`;
- consultor pega chamado da fila sem dono do próprio grupo;
- consultor muda status (`em_atendimento → aguardando_cliente | resolvido`);
- cliente abre chamado novo (menos frequente).

Passa pelo mesmo caminho da §4.3, como se fosse outra aba. ~10% dos eventos são
publicados duas vezes.

### 4.5 Relógio virtual

`RelogioProvider` guarda `inicioVirtual = meta.agora` e `inicioReal =
Date.now()` na primeira carga (persistido no `localStorage` junto do log, para
sobreviver a reload e a abas). `agora() = inicioVirtual + (Date.now() −
inicioReal)`. `useNow()` reavalia a cada 30 s. O `mock-server` usa a mesma
função para carimbar eventos. "Resetar dados" zera também o relógio.

## 5. Telas

### 5.0 Login (`/entrar`)

E-mail, PIN de 6 dígitos, botão entrar. Link "quem posso ser?" abre lista com
Marina, Ricardo e Helena (nome, perfil, e-mail). Após entrar, redireciona para a
rota inicial do perfil. Rotas protegidas: sem sessão volta ao login; perfil
errado para a rota recebe "sem acesso" com link para a tela dele.

### 5.1 Consultora — `/fila` (Marina)

Duas colunas: fila à esquerda, chamado aberto à direita (em telas estreitas, a
fila vira a tela e o chamado abre por cima).

Fila:

- Abas "Meus" e "Do grupo, sem dono", com contadores.
- Ordenação padrão **estoura primeiro**: menor `prazo − agora` no topo,
  considerando o prazo relevante (primeira resposta se ainda não houve, senão
  resolução). Vencidos primeiro, depois críticos. Pausados vão para o fim.
- Linha: número, título, nome do cliente, status, badge de prazo ("vence em
  1h 40", "venceu há 3h", "pausado"), ponto azul se há mensagem nova desde a
  última vez que ela abriu o chamado (gravado por chamado no `localStorage`).
- Filtro por status; busca por número ou texto do título.
- Ordenações alternativas: mais recente, cliente.

Chamado aberto (componente compartilhado, §5.4) com ações de consultor: pegar
(se sem dono e do grupo dela), responder, nota interna, mudar status.

Mensagem nova **no chamado em que ela está digitando** não rola a conversa nem
mexe no texto: aparece "1 mensagem nova" acima da caixa, clicável, que rola até
lá. Se a caixa está vazia e ela está no fim, rola normalmente.

### 5.2 Gestor — `/equipe` (Ricardo)

- **Cartões por consultor**, dos grupos que ele gere: abertos, vencidos,
  vencendo em 4h, e **tempo ocioso nos últimos 7 dias** (soma dos intervalos em
  que o consultor não tinha nenhum chamado em `em_atendimento` ou
  `aguardando_cliente`, reconstruído do histórico de atribuição e de status).
  Ordenado por vencidos desc, depois abertos desc. Quem está com zero aparece em
  destaque "sem chamado".
- Clicar no cartão lista os chamados dele com seleção múltipla e botão
  **Redistribuir para…** (select de consultor do mesmo grupo). Um
  `chamado.atribuido` por chamado.
- **Fila sem dono** dos grupos dele, com select de consultor na linha.
- **Vencendo nas próximas 4h**, cruzando os dois grupos, ordenada por prazo.
- Clicar num chamado abre o detalhe (§5.4) com ações de gestor.

`GET /equipe` devolve os agregados já calculados; o cálculo vive em
`shared/utils/` para o teste cobrir.

### 5.3 Cliente — `/meus-chamados` (Helena)

Linguagem de cliente. Nunca aparecem: categoria interna, grupo, prioridade,
nota interna, nome de consultor fora do contexto "quem está atendendo".

- **Novidades desde sua última visita**: faixa no topo com uma linha por
  chamado que mudou ("Rafael respondeu", "Resolvido, confirme"). Última visita
  por usuário no `localStorage`; ao fechar a faixa, atualiza.
- Lista: título, situação em linguagem dela (`aberto` → "aguardando
  atendimento"; `em_atendimento` → "em atendimento por Rafael";
  `aguardando_cliente` → "aguardando sua resposta"; `resolvido` → "resolvido,
  aguardando sua confirmação"; `fechado` → "fechado"), e "previsão de resposta
  até terça, 14h" no fuso dela, só enquanto faz sentido (aberto sem primeira
  resposta → prazo de primeira resposta; em atendimento → prazo de resolução;
  pausado/resolvido/fechado → nada).
- **Abrir chamado** (`/meus-chamados/novo`): "O que parou?" (select com as 8
  categorias em nome amigável), título, descrição. Prioridade: `media` por
  padrão, `alta` se a categoria for Acesso e senhas ou Rede e VPN (regra interna
  simples, documentada). Enquanto digita o título: "Parece com seu chamado
  #10231 (fechado em 12/10). É o mesmo problema?" com **Reabrir** (vai para o
  chamado e dispara reabertura com motivo "Cliente reabriu: problema voltou") ou
  **É outro** (segue). Regra em §6.4.
- Detalhe (§5.4) com ações de cliente: responder, "Resolvido? Confirmar"
  (→ `fechado`), "Ainda não resolveu" (→ reabre), reabrir chamado fechado.

### 5.4 Detalhe de chamado — `/chamados/:id` (compartilhado)

Um componente, três visões. Cabeçalho: número, título, status, responsável,
prazo (badge de SLA para equipe; "previsão" para cliente), cliente e empresa
(equipe). Conversa virtualizada, ordem cronológica, autor e hora no fuso do
usuário; notas internas com fundo distinto e rótulo "só a equipe vê", ocultas
para cliente. Histórico de status com motivos: equipe vê tudo em aba
"Histórico"; cliente vê os passos resumidos no topo da conversa. Caixa de
resposta com alternância "Resposta / Nota interna" (equipe) ou só resposta
(cliente). Menu de ações filtrado por §6.1 e §7.

## 6. Regras de domínio

### 6.1 Transições de status

| De | Para | Quem | Motivo |
|---|---|---|---|
| aberto | em_atendimento | consultor pega; gestor atribui | automático: "Assumido para atendimento" / "Atribuído por {gestor}" |
| em_atendimento | aguardando_cliente | consultor | obrigatório |
| aguardando_cliente | em_atendimento | automático quando cliente responde; consultor | automático: "Cliente respondeu" / obrigatório |
| em_atendimento | resolvido | consultor | obrigatório |
| resolvido | fechado | cliente confirma; consultor | automático: "Confirmado pelo cliente" / obrigatório |
| resolvido, fechado | em_atendimento | qualquer perfil (reabertura) | obrigatório |

Tabela em `shared/utils/status.ts`: `transicoesPermitidas(status, perfil)`.
Fora da tabela, a ação não aparece; se chegar ao servidor, `400`.

Reabertura de chamado sem responsável atual (consultor saiu) volta para
`aberto` em vez de `em_atendimento`. Reabrir **não recria prazo**: mantém os
originais e o detalhe mostra "reaberto em {data}". Decisão documentada.

### 6.2 SLA

- Prazo relevante: `prazo_primeira_resposta` enquanto `primeira_resposta_em`
  for nulo; depois `prazo_resolucao`.
- Primeira resposta = primeira mensagem não interna de autor consultor/gestor.
  O servidor preenche `primeira_resposta_em` ao aplicar `mensagem.adicionada`.
- `aguardando_cliente` ⇒ `sla_pausado = true`; sai do cálculo de vencidos.
  Voltar para `em_atendimento` despausa. Não há extensão de prazo pelo tempo
  pausado (simplificação documentada).
- Faixas em `sla.ts`: `vencido` (< 0), `critico` (≤ 4h), `atencao` (≤ 24h),
  `ok`, `pausado`, `encerrado` (resolvido/fechado). Tokens CSS por faixa.
- Chamado novo: prazos = `aberto_em` + horas do SLA da prioridade.

### 6.3 Pegar chamado e concorrência

Só chamado sem responsável, do grupo do consultor. `reducer` ignora
`chamado.atribuido` quando o chamado já tem responsável **e** o evento não é de
gestor (payload carrega `atribuido_por` opcional para distinguir). O servidor
responde `409` "Rafael pegou antes de você". Como o `db` é um por aba e as abas
disputam pelo `bus`, a regra no `reducer` garante o mesmo resultado em todas.

### 6.4 Similaridade (Helena)

Candidatos: chamados do mesmo solicitante com status `resolvido` ou `fechado`
nos últimos 90 dias (relógio virtual). Normaliza título (minúsculas, sem
acento, sem stopwords pt). Sugere o mais recente com ≥ 2 palavras em comum ou
título idêntico. Uma sugestão só.

### 6.5 Tempo ocioso (Ricardo)

Janela: últimos 7 dias até `agora`. Para cada consultor, constrói a linha do
tempo de "tem pelo menos um chamado ativo" (`em_atendimento` ou
`aguardando_cliente` atribuído a ele) a partir de `historico` (atribuições e
status) e do estado atual. Ocioso = soma dos intervalos sem nenhum ativo,
limitado à janela. Exibido como "3h 20 ocioso na semana".

## 7. Permissões

| Ação / visão | Cliente | Consultor | Gestor |
|---|---|---|---|
| Ver chamado | só os próprios | do próprio grupo | dos grupos que gere |
| Ver nota interna, categoria, grupo, prioridade | não | sim | sim |
| Abrir chamado | sim | sim (em nome de cliente: select de solicitante) | não |
| Pegar | não | sim, sem dono, do grupo | não |
| Atribuir/redistribuir | não | não | sim |
| Responder | sim | sim | sim (fora da rotina, não bloqueado) |
| Nota interna | não | sim | sim |
| Mudar status | só confirmar/reabrir | conforme §6.1 | conforme §6.1 |

`GET /chamados` aplica o filtro de visão pelo usuário da sessão. Toda
mutation revalida no servidor (`403`). A UI só esconde o que o servidor
bloquearia.

## 8. Erros e estados

- `apiClient`: não-2xx → `ApiError { status, codigo, mensagem }`.
- Toda tela: carregando (skeleton simples), vazio (texto orientando), erro
  ("tentar de novo").
- Mutation falha → toast com `mensagem` do servidor; cache intacto.
- `BroadcastChannel` indisponível ou aba suspensa → faixa "sem atualização em
  tempo real"; refetch de tudo ao voltar o foco (`refetchOnWindowFocus`).
- Log inválido em `localStorage` (JSON quebrado, evento desconhecido) →
  descarta o log, zera relógio, toast "dados reiniciados".
- Rota com id inexistente → 404 amigável com link para a lista do perfil.

## 9. Performance

- Conversa e filas com `@tanstack/react-virtual`.
- Ordenação/filtro das filas em `useMemo` sobre o cache; nada recalculado a
  cada evento fora do que o `reducer` mudou.
- `dados.json` via `import()` dinâmico dentro de `mock-server/db.ts`.
- `useNow()` a cada 30 s; componentes de badge assinam só ele.
- `setQueryData` por evento, sem `invalidateQueries` em cascata. `GET /equipe`
  é a exceção: invalida ao receber `chamado.atribuido` ou `status.alterado`.

## 10. Testes (Vitest + Testing Library)

1. `reducer`: aplica os 4 tipos; ignora `id` repetido; ignora atribuição
   concorrente; cliente respondendo em `aguardando_cliente` gera status
   automático.
2. `sla.ts`: faixas, pausa, vencido, prazo relevante, com relógio fixo.
3. `status.ts`: tabela permite/bloqueia por perfil; reabertura sem responsável
   vai para `aberto`.
4. `similaridade.ts`: acha par real do `dados.json`; não sugere título sem
   palavra em comum; respeita 90 dias.
5. `ocioso.ts`: consultor sem nada a semana toda = 7 d; com um chamado ativo o
   tempo todo = 0.
6. Conversa: mensagem nova com texto na caixa mostra aviso e não rola.
7. Fila da consultora: ordenação "estoura primeiro" com 4 chamados fixos.
8. Login: PIN errado → erro; cada perfil → rota inicial certa.

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

## 12. Fora de escopo

Autenticação real, backend, anexos, notificações por e-mail, busca full-text,
relatórios além do painel do gestor, internacionalização da interface (textos
em pt-BR; só datas seguem o locale do usuário), e2e, mobile dedicado (layout
responde, mas não é o alvo).
