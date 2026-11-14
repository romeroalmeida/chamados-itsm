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
- Simulador (rodapé): gera atividade de fundo. Clientes respondem, consultores pegam chamados da fila, status mudam, de vez em quando um cliente abre chamado novo. Começa ligado. O rodapé tem pausar e retomar, velocidade 1x, 5x e 20x, "Disparar evento" e "Resetar dados". Só uma aba simula por vez, e o rodapé diz se é esta ou outra.
- "Resetar dados" apaga tudo que foi feito e volta ao `dados.json` puro. A aba que resetou recarrega sozinha. As outras abas abertas precisam ser recarregadas à mão.
- Relógio virtual: o arquivo diz que "agora" é 03/11/2026 13:00 UTC (`meta.agora`). O app parte daí e anda em tempo real, ou mais rápido conforme a velocidade. Em 20x, um prazo de 2h estoura em 6 minutos. Com o relógio real, todos os prazos do arquivo já estariam vencidos (o último é de 06/11/2026).
- Eventos duplicados: com o simulador ligado, cerca de 1 em 10 eventos é entregue duas vezes de propósito, porque o enunciado avisa que isso acontece. O rodapé conta quantos duplicados chegaram e foram descartados.

## O que cada perfil vê e por quê

**Marina, consultora.** A dor dela é perder tempo procurando o chamado que vai estourar. A fila tem duas abas, "Meus" e "Do grupo, sem dono", e a ordem padrão é "estoura primeiro": vencidos no topo, depois pelo tempo que falta até o prazo relevante, pausados depois, encerrados por último. O prazo relevante é o de primeira resposta enquanto ninguém respondeu, e o de resolução depois. O alerta não depende só de cor. Uma faixa no topo diz quantos chamados dela vencem na próxima hora e quantos já venceram, e clicar filtra a fila. Quando um chamado cruza para menos de 4h, menos de 1h ou vencido, aparece um toast uma única vez por faixa. O título da aba do navegador mostra o total de vencidos, para quando ela está em outra aba. Se chega mensagem no chamado em que ela está digitando, a conversa não rola nem mexe no texto: aparece "1 mensagem nova" acima da caixa. Notas internas têm fundo próprio e o rótulo "só a equipe vê".

**Ricardo, gestor.** Ele diz que o sistema antigo mostra tudo e por isso não mostra nada. O painel mostra só o que ele usa para decidir. Um cartão por consultor dos dois grupos, com ativos, vencidos, vencendo em 4h e tempo ocioso nos últimos 7 dias, ordenado por vencidos e depois por ativos. Quem está com zero ativo aparece em destaque. Abaixo, a fila sem dono com um select de consultor na linha e a lista do que vence nas próximas 4h. Clicar num cartão lista os chamados daquele consultor, com seleção múltipla e "Redistribuir para…". A conversa existe, mas fica a um clique, porque ele raramente a abre.

**Helena, cliente.** Ela não sabe o que é categoria, grupo ou prioridade, e não vê nenhum deles. A situação aparece na linguagem dela: "aguardando atendimento", "em atendimento por Rafael", "aguardando sua resposta", "resolvido, aguardando sua confirmação". A previsão de resposta usa o fuso e o locale dela (`Europe/Lisbon`, `pt-PT`) e diz "em atraso" quando o prazo passou. Ao voltar, uma faixa "Novidades desde sua última visita" resume o que mudou, para ela não ter que reler tudo. Ao abrir chamado, ela escolhe "O que parou?" por nomes amigáveis. Se o título lembra um chamado dela encerrado nos últimos 90 dias, o app pergunta se é o mesmo problema e oferece reabrir. O caso real do arquivo é o #10614, que repete o título do #10612, já fechado.

## Como a simulação funciona

O "backend" vive em `src/mock-server/` e roda em cada aba. O MSW intercepta as chamadas HTTP e os handlers validam perfil, permissão e transição, como um servidor faria. Toda mudança vira um evento no formato do enunciado. A aba de origem grava o evento no `localStorage`, uma chave por evento, e publica num `BroadcastChannel`. Cada aba aplica o evento no seu estado com o mesmo reducer puro que o app usa no cliente, então servidor e tela concordam por construção. Ao abrir, a aba carrega o `dados.json` e reaplica o log, ignorando eventos com `id` repetido. O "socket" de cada aba filtra pelo usuário logado ali antes de entregar ao app: cliente não recebe nota interna nem chamado de outro cliente, consultor não recebe chamado de outro grupo. O app aplica o evento nos caches do TanStack Query, com dedupe por `id`. O simulador roda em uma aba só, a que obtém o Web Lock `itsm:simulador`, e faz requisições pelos mesmos handlers, com o usuário simulado no cabeçalho.

## Decisões

Cada decisão, com alternativas e o porquê, está em [`docs/decisoes.md`](docs/decisoes.md). A spec e o plano de implementação estão em `docs/superpowers/`.

Versões: React 19.3, Vite 8.3, TypeScript 5.9, React Router 7.18, TanStack Query 5, MSW 2.15, Vitest 4.1, Zustand 5, primitivos Radix e CSS Modules. O enunciado pede o que terá suporte nos próximos anos, não o recém-lançado. Por isso ficaram os majors estáveis, com tempo de mercado e suporte longo, e não os que acabaram de sair (Vitest 5, MSW 3, React Router 8, TypeScript 7). Os majors estão fixados no `package.json`.

## O que ficou de fora e por quê

- Autenticação real e backend: o teste pede só front e diz que não há backend. O login com e-mail e código serve para trocar de perfil.
- Anexos e notificações por e-mail: não estão entre os seis requisitos e não mudam a decisão de o que mostrar na tela.
- Busca full-text: a fila busca por número, título ou nome do cliente, o que basta para os volumes do arquivo.
- Relatórios além do painel do gestor: o enunciado pede acompanhar o grupo, não relatórios.
- Internacionalização da interface: os textos são em pt-BR. Só as datas seguem o locale e o fuso de cada usuário, porque é isso que importa para a Helena.
- Testes e2e: ver a seção Testes.
- Layout mobile dedicado: o layout se adapta a telas estreitas, mas o alvo é desktop.
- Extensão do prazo pelo tempo pausado: o chamado pausado sai da conta de vencidos, mas o prazo não é empurrado.
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

São 116 testes em 26 arquivos, com Vitest e Testing Library. Cobrem o reducer (os quatro eventos, dedupe, primeira resposta), os handlers (eventos derivados, `409` ao pegar chamado com dono, `400` sem motivo ou fora da tabela, permissões por perfil, preenchimento de número, grupo e prazos), o socket filtrando por perfil, o bus, o log e o relógio virtual. Cobrem também as regras puras: faixas de SLA e ordenação "estoura primeiro", tabela de transições, similaridade com o par #10612/#10614 e tempo ocioso. Na tela, testam o login dos três perfis, o alerta de prazo que dispara uma vez por faixa, a conversa que não rola enquanto se digita, a sugestão de reabertura e a redistribuição. Não há testes e2e nesta entrega. É o próximo passo: um fluxo com duas abas em Playwright.
