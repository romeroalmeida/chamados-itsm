# Área de chamados (ITSM)

Fatia da área de chamados de um ITSM, em React, vista por três perfis, com API e WebSocket simulados no navegador. Resposta ao teste técnico de Frontend.

## Rodar

Node 24 (`.nvmrc`), pnpm 10.

    pnpm install
    pnpm dev        # http://localhost:5173
    pnpm test       # Vitest
    pnpm typecheck
    pnpm build && pnpm preview

Não há backend nem variável de ambiente. A API roda dentro do navegador, num service worker do MSW (`public/mockServiceWorker.js`, versionado de propósito).

## Entrar como cada perfil

O login é fake e tem dois passos: o e-mail, depois um código de 6 números. Nenhum e-mail é enviado. O código de todos é `123456`.

| Perfil | Quem | E-mail | Tela inicial |
|---|---|---|---|
| Consultora | Marina Almeida | marina.almeida@suporte.example | /fila |
| Gestor | Ricardo Monteiro | ricardo.monteiro@suporte.example | /equipe |
| Cliente | Helena Fernandes | helena.fernandes@lusitania.example | /meus-chamados |

Qualquer outro usuário do `dados.json` também entra com o mesmo código. "Quem posso ser?" na tela de login lista os três. Clicar num deles preenche o e-mail e já leva para o passo do código. O código entra sozinho no sexto número.

A sessão é por aba. Abra duas abas, entre como Marina numa e Helena na outra, e converse entre elas.

## Como ver o tempo real

- Duas abas: uma ação numa aba aparece na outra sem recarregar.
- Simulador (rodapé): gera atividade de fundo. Clientes respondem, consultores pegam chamados da fila, status mudam, de vez em quando um cliente abre chamado novo. Começa pausado, para a tela abrir exatamente com o `dados.json`; "Retomar simulador" no rodapé liga. O rodapé tem pausar e retomar, velocidade 1x, 5x e 20x, "Disparar evento" e "Resetar dados". Só uma aba simula por vez, e o rodapé diz se é esta ou outra.
- "Resetar dados" apaga tudo que foi feito e volta ao `dados.json` puro. A aba que resetou recarrega sozinha. As outras abas abertas precisam ser recarregadas à mão.
- Relógio virtual: o arquivo diz que "agora" é 03/11/2026 13:00 UTC (`meta.agora`). O app parte daí e anda em tempo real, ou mais rápido conforme a velocidade. Em 20x, um prazo de 2h estoura em 6 minutos. Com o relógio real, todos os prazos do arquivo já estariam estourados (o último é de 06/11/2026).
- Eventos duplicados: com o simulador ligado, cerca de 1 em 10 eventos é entregue duas vezes de propósito, porque o enunciado avisa que isso acontece. O rodapé conta quantos duplicados chegaram e foram descartados.

## O que cada perfil vê e por quê

**Marina, consultora.** A dor dela é perder tempo procurando o chamado que está prestes a estourar o prazo. A fila tem duas abas, "Meus" e "Fila do grupo" (a fila do grupo dela que ninguém pegou ainda), e a ordem padrão é "Estoura primeiro": prazo estourado no topo, depois pelo tempo que falta até o prazo relevante, SLA pausado depois, resolvido e fechado por último. O prazo relevante é o `prazo_primeira_resposta` enquanto `primeira_resposta_em` está vazio, e o `prazo_resolucao` depois. A fila é agrupada pelo prazo, com cabeçalho fixo: "Prazo estourado", "Estoura na próxima hora", "Estoura hoje" (prazo até 23:59 no fuso dela), "Estoura depois de hoje", "SLA pausado" (aguardando cliente) e "Resolvido ou fechado". O alerta não depende só de cor. Quatro contadores no topo, com os mesmos nomes, dizem quantos há em cada grupo com prazo correndo, e clicar leva ao grupo. Na linha, o tempo até o prazo é o elemento principal, com uma barra do prazo consumido e o tipo de prazo (1ª resposta ou resolução). O selo "mensagem do cliente" marca os chamados em que a última mensagem não interna é do solicitante. Quando um chamado fica a menos de 4h do prazo, a menos de 1h ou estoura, aparece um toast uma única vez por faixa. O título da aba do navegador mostra quantos estão com prazo estourado, para quando ela está em outra aba. Se chega mensagem no chamado em que ela está digitando, a conversa não rola nem mexe no texto: aparece "1 mensagem nova" acima da caixa. No chamado, um stepper mostra os cinco status do `dados.json` (com a marca de reaberto), uma faixa mostra o prazo ("Prazo de resolução estoura em 2h", "SLA pausado: aguardando cliente"), e mensagens e mudanças de status ficam numa linha do tempo só. Notas internas têm fundo próprio e o rótulo "só a equipe vê"; na caixa de resposta, o modo nota interna deixa a caixa âmbar e o botão vira "Salvar nota".

**Ricardo, gestor.** Ele diz que o sistema antigo mostra tudo e por isso não mostra nada. O painel mostra só o que ele usa para decidir. No topo, três números clicáveis: com prazo estourado, estouram na próxima hora e na fila, ninguém pegou. Um cartão por consultor dos dois grupos, com quatro números: "Em atendimento" e "Aguardando cliente" (os dois status do `dados.json`, separados), "Prazo estourado" e "Estoura em até 4 h", mais quanto tempo ele ficou sem chamado atribuído nos últimos 7 dias. Os cartões são ordenados por prazo estourado e depois pelo total em atendimento e aguardando cliente. A barra empilha prazo estourado, estoura em até 4 h, aguardando cliente (SLA pausado) e o resto em atendimento, na escala do consultor com mais chamados. Quem tem 15 chamados com prazo estourado ou mais aparece como "Sobrecarregado", com o atalho "Redistribuir" e uma sugestão de destino (mesmo grupo, menos chamados, mais tempo sem chamado atribuído); a sugestão só informa, quem escolhe é ele. Quem não tem nenhum chamado aparece como "Sem chamado atribuído". Abaixo, lado a lado, os chamados que estouram o SLA nas próximas 4 horas e a fila do grupo que ninguém pegou, com atribuir ou reatribuir na linha. Clicar no nome do consultor lista os chamados dele, com seleção múltipla e "Redistribuir para…". A conversa existe, mas fica a um clique, porque ele raramente a abre.

**Helena, cliente.** Ela não sabe o que é categoria, grupo ou prioridade, e não vê nenhum deles. A situação aparece na linguagem dela, um texto por status do `dados.json`: "Aguardando atendimento" (aberto), "Em atendimento" (em_atendimento), "Aguardando sua resposta" (aguardando_cliente), "Resolvido, aguardando sua confirmação" (resolvido), "Fechado" (fechado). O prazo de resposta usa o fuso e o locale dela (`Europe/Lisbon`, `pt-PT`) e diz "passou do prazo" quando estourou. Ao voltar, "Novidades desde a sua última visita" conta em frases o que mudou ("Juliana Pereira pegou o seu chamado"), no horário dela, para ela não ter que reler tudo. Cada cartão diz o próximo passo e de quem ele é: prazo estourado, aguardando você ou com a equipe. Os fechados ficam separados, embaixo. No chamado, ela vê um stepper com um passo por status, quem está cuidando e "O que aconteceu até agora" em frases, sem o prazo interno de SLA. Ao abrir chamado, ela escolhe "O que parou?" entre opções visíveis, com nomes amigáveis para cada categoria. Se o título lembra um chamado dela resolvido ou fechado nos últimos 90 dias, o app pergunta se é o mesmo problema e oferece reabrir. O caso real do arquivo é o #10614, que repete o título do #10612, já fechado.

O vocabulário de cada rótulo da tela, com a origem no `dados.json` ou no enunciado, está em [`docs/decisoes.md`](docs/decisoes.md#vocabulário-da-tela).

## Como a simulação funciona

O "backend" vive em `src/mock-server/` e roda em cada aba. O MSW intercepta as chamadas HTTP e os handlers validam perfil, permissão e transição, como um servidor faria. Toda mudança vira um evento no formato do enunciado. A aba de origem grava o evento no `localStorage`, uma chave por evento, e publica num `BroadcastChannel`. Cada aba aplica o evento no seu estado com o mesmo reducer puro que o app usa no cliente, então servidor e tela concordam por construção. Ao abrir, a aba carrega o `dados.json` e reaplica o log, ignorando eventos com `id` repetido. O "socket" de cada aba filtra pelo usuário logado ali antes de entregar ao app: cliente não recebe nota interna nem chamado de outro cliente, consultor não recebe chamado de outro grupo, exceto os que estão no nome dele (o `dados.json` tem um caso assim, o #10608 da Marina, que é do grupo Aplicações). O app aplica o evento nos caches do TanStack Query, com dedupe por `id`. O simulador roda em uma aba só, a que obtém o Web Lock `itsm:simulador`, e faz requisições pelos mesmos handlers, com o usuário simulado no cabeçalho.

## Decisões

Cada decisão, com alternativas e o porquê, está em [`docs/decisoes.md`](docs/decisoes.md). A spec e o plano de implementação estão em `docs/superpowers/`.

Versões: React 19.3, Vite 8.3, TypeScript 5.9, React Router 7.18, TanStack Query 5, MSW 2.15, Vitest 4.1, Zustand 5, primitivos Radix e CSS Modules. O enunciado pede o que terá suporte nos próximos anos, não o recém-lançado. Por isso ficaram os majors estáveis, com tempo de mercado e suporte longo, e não os que acabaram de sair (Vitest 5, MSW 3, React Router 8, TypeScript 7). Os majors estão fixados no `package.json`.

## O que ficou de fora e por quê

- Autenticação real e backend: o teste pede só front e diz que não há backend. O login com e-mail e código serve para trocar de perfil.
- Anexos e notificações por e-mail: não estão entre os seis requisitos e não mudam a decisão de o que mostrar na tela.
- Busca full-text: a fila busca por número, título ou nome do cliente, o que basta para os volumes do arquivo.
- Relatórios além do painel do gestor: o enunciado pede acompanhar o grupo, não relatórios.
- Internacionalização da interface: os textos são em pt-BR. Só as datas seguem o locale e o fuso de cada usuário, porque é isso que importa para a Helena.
- Layout mobile dedicado: o layout se adapta a telas estreitas, mas o alvo é desktop.
- Extensão do prazo pelo tempo pausado: o chamado com SLA pausado sai da conta de prazo estourado, mas o prazo não é empurrado.
- Consultor abrir chamado em nome de cliente: só o cliente abre.

## Estrutura

```
src/
├── app/           # rotas com guarda por perfil, providers, casca e painel do simulador
├── api/           # apiClient, realtime (socket, dedupe, caches) e queries do TanStack Query
├── features/
│   ├── auth/      # login e "quem posso ser?"
│   ├── chamados/  # fila da consultora, detalhe, conversa, abrir, pegar, status
│   └── equipe/    # painel do gestor
├── shared/        # componentes, hooks (useNow, useUltimaVisita), regras puras, tipos, estilos
├── state/         # sessão (Zustand)
├── mock-server/   # o "backend": dados, log, bus, handlers MSW, socket, simulador
├── tests/         # setup do Vitest e fixtures
└── main.tsx
```

`mock-server/` só é importado em `main.tsx`. O app fala com ele por HTTP e pelo contrato do socket. Para usar um backend real, basta apagar a pasta e apontar o `apiClient` para a URL. As regras de domínio (SLA, transições, visibilidade, agregados, reducer) ficam em `shared/utils/`, puras e testadas sem tela. `chamados` e `equipe` não se importam entre si.

## Testes

    pnpm test

São 148 testes em 28 arquivos, com Vitest e Testing Library. Cobrem o reducer (os quatro eventos, dedupe, primeira resposta), os handlers (eventos derivados, `409` ao pegar chamado com dono, `400` sem motivo ou fora da tabela, permissões por perfil, preenchimento de número, grupo e prazos), o socket filtrando por perfil, o bus, o log e o relógio virtual. Cobrem também as regras puras: faixas de SLA e ordenação "Estoura primeiro", tabela de transições, similaridade com o par #10612/#10614 e tempo sem chamado atribuído. Na tela, testam o login dos três perfis, o alerta de prazo que dispara uma vez por faixa, a conversa que não rola enquanto se digita, a sugestão de reabertura e a redistribuição.

### E2E (Playwright)

    pnpm exec playwright install chromium   # uma vez
    pnpm test:e2e

Sobe o app numa porta própria (5180, `playwright.config.ts`) para não colidir com um `pnpm dev` já rodando em 5173, e roda no Chromium. Cada teste começa com um contexto limpo (localStorage e sessionStorage zerados), então reaplica o `dados.json` puro.

Cobre os seis requisitos do enunciado, um por arquivo em `e2e/`, mais o tempo real entre abas:

1. `01-abrir-chamado.spec.ts` – Helena abre um chamado, cai no detalhe, ele aparece em "Meus chamados"; e digitar o título do #10614 sugere reabrir o #10612.
2. `02-encontrar-e-ver.spec.ts` – Marina busca por número na fila, abre o chamado e vê conversa, status, responsável e prazo; a trilha volta em `/chamados/:id`.
3. `03-pegar-chamado.spec.ts` – Marina pega um chamado da aba "Fila do grupo" e ele passa para "Meus", em atendimento.
4. `04-trocar-mensagens.spec.ts` – Marina responde e deixa uma nota interna; a nota tem o rótulo "só a equipe vê" para Marina e não aparece para a cliente, logada em outra aba.
5. `05-status-motivo-reabrir.spec.ts` – Marina marca um chamado como resolvido (o diálogo exige motivo); Helena reabre um chamado fechado contando o que aconteceu.
6. `06-equipe.spec.ts` – Ricardo vê os 12 cartões de consultor, "Estouram o SLA nas próximas 4 horas" e "Fila do grupo que ninguém pegou", e redistribui um chamado entre consultores.
7. `07-tempo-real.spec.ts` – duas abas do mesmo contexto (mesmo localStorage, sessionStorage separado): mensagem enviada por Helena aparece na tela da Marina sem recarregar.
