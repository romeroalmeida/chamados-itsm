# Decisões

Uma entrada por decisão. Formato: decisão, alternativas, por quê, onde no código.

## Stack e versões

**Decisão.** React 19.3, Vite 8.3, TypeScript 5.9 estrito, React Router 7.18, TanStack Query 5, Zustand 5, MSW 2.15, Vitest 4.1 com Testing Library, `@tanstack/react-virtual` 3, pnpm.

**Alternativas.** Next.js. Os majors recém-lançados (Vitest 5, MSW 3, React Router 8, TypeScript 7).

**Por quê.** O enunciado diz que o sistema vai para produção no começo do ano e prefere o que terá suporte ao que acabou de sair. Os majors escolhidos são estáveis, têm ecossistema maduro e suporte pelos próximos anos. Next.js não se justifica sem backend: tudo roda no navegador.

**Onde no código.** `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.app.json`.

## CSS Modules sem Tailwind

**Decisão.** CSS Modules com custom properties (tokens) para cor, espaço e faixas de SLA.

**Alternativas.** Tailwind com shadcn/ui.

**Por quê.** O teste não avalia identidade visual e o volume de estilo é pequeno. Mais uma ferramenta de build e um vocabulário de classes não pagam o custo. Os tokens deixam as cores de SLA num lugar só.

**Onde no código.** `src/shared/styles/tokens.css`, `src/shared/styles/reset.css`, arquivos `*.module.css` ao lado de cada componente.

## Radix sem estilo

**Decisão.** Primitivos Radix (Dialog, Select, Tabs, Toast), embrulhados em componentes próprios com CSS Modules.

**Alternativas.** Escrever diálogo, select e toast à mão. Uma biblioteca com estilo pronto.

**Por quê.** Foco, teclado e ARIA de diálogo e select são fáceis de errar. O Radix resolve isso sem impor visual.

**Onde no código.** `src/shared/components/Dialog.tsx`, `Select.tsx`, `Tabs.tsx`, `Toast.tsx`.

## Login com e-mail e código

**Decisão.** Login fake em dois passos, no padrão do escalanova. Primeiro o e-mail (`POST /auth/codigo`, que responde igual exista ou não o usuário). Depois a tela "Confira o seu e-mail" pede o código de 6 números, em duas metades de 3. Nenhum e-mail é enviado: o código de todos é `123456`. "Quem posso ser?" lista Marina, Ricardo e Helena e leva direto ao passo do código.

**Alternativas.** Cartões de persona sem login. Uma rota por perfil.

**Por quê.** O avaliador precisa trocar de perfil sem ler código. Um login de verdade, mesmo fake, exercita sessão, guarda de rota e o cabeçalho `X-Usuario-Id` que o servidor usa para permissão. Qualquer usuário do arquivo entra.

**Onde no código.** `src/features/auth/pages/LoginPage/LoginPage.tsx`, `src/features/auth/components/CampoCodigo/CampoCodigo.tsx`, `src/features/auth/services/entrar.ts`, `src/mock-server/handlers.ts` (`CODIGO_DEMO`), `src/app/routes/RotaProtegida.tsx`.

## Tempo real

**Decisão.** Três fontes de evento juntas. `BroadcastChannel` entre abas, para uma ação numa aba aparecer na outra. Um simulador de fundo que roda numa aba só, a que obtém o Web Lock `itsm:simulador`. Com o simulador ligado, cerca de 10% dos eventos são publicados duas vezes de propósito.

**Alternativas.** Só simulador. Só multi-aba.

**Por quê.** Só multi-aba deixa a tela parada quando o avaliador abre uma aba. Só simulador não mostra a conversa entre duas pessoas. O lock evita que cada aba aberta multiplique a atividade. A duplicação existe porque o enunciado diz que um evento pode chegar mais de uma vez, e o dedupe precisa ser visto funcionando. Sem `BroadcastChannel`, o bus escuta o evento `storage`. Sem Web Locks, toda aba simula e o rodapé avisa.

**Onde no código.** `src/mock-server/bus.ts`, `src/mock-server/simulator.ts`, `src/mock-server/index.ts` (`deveDuplicar`), `src/app/layout/PainelSimulador.tsx`.

## Relógio virtual e velocidade

**Decisão.** O relógio nasce em `meta.agora` (2026-11-03T13:00:00Z) e anda em tempo real multiplicado pela velocidade do simulador (1x, 5x, 20x). Mudar a velocidade reancora o relógio para não dar salto. `useNow()` é a única fonte de "agora" na tela.

**Alternativas.** Relógio real com as datas do arquivo deslocadas. Relógio real puro.

**Por quê.** Com o relógio real, todos os prazos do arquivo já estariam vencidos e a ordenação por prazo perderia sentido. Deslocar 620 chamados, mensagens e histórico é frágil. Acelerar permite ver um prazo estourar na demo: em 20x, 2h viram 6 minutos. O relógio fica em `localStorage` e é lido a cada chamada, então todas as abas concordam.

**Onde no código.** `src/shared/utils/relogio.ts`, `src/shared/hooks/useNow.ts`.

## Log por evento em `localStorage`

**Decisão.** Cada evento é gravado numa chave própria, `itsm:evt:<ocorrido_em>:<id>`. Ao abrir, a aba carrega o `dados.json` e reaplica o log em ordem de chave. "Resetar dados" apaga as chaves `itsm:*`.

**Alternativas.** Só memória. Estado derivado em IndexedDB. Um array único no `localStorage`.

**Por quê.** Só memória perde tudo ao recarregar e não deixa uma aba nova ver o que outra fez. Um array único exige ler, alterar e gravar, e duas abas gravando ao mesmo tempo perdem evento. Uma chave por evento não tem esse problema. Chave inválida é descartada sozinha, sem derrubar o replay.

**Onde no código.** `src/mock-server/eventLog.ts`, `src/mock-server/db.ts`.

## Reducer burro, handler emite derivados

**Decisão.** O reducer aplica exatamente o evento recebido e nunca infere outra mudança. Quando uma ação tem efeito colateral, o handler emite um segundo evento. Pegar chamado `aberto` emite `chamado.atribuido` e `status.alterado`. Cliente respondendo em `aguardando_cliente` emite `mensagem.adicionada` e `status.alterado`.

**Alternativas.** Reducer que deduz o status a partir da atribuição ou da mensagem.

**Por quê.** É o que o histórico do arquivo mostra: cada atribuição vem acompanhada de um `aberto → em_atendimento`. Um reducer que infere efeitos geraria estado diferente do que chega pelo socket. O mesmo reducer roda no "servidor" e no cliente, então os dois concordam por construção.

**Onde no código.** `src/shared/utils/reducer.ts`, `src/mock-server/handlers.ts`, `src/api/realtime.ts`.

## Sessão por aba

**Decisão.** Sessão num store Zustand gravado em `sessionStorage` (chave `itsm:sessao`).

**Alternativas.** `localStorage`.

**Por quê.** Com `localStorage`, entrar como Helena numa aba trocaria o usuário da aba da Marina. Por aba, as duas conversam no mesmo navegador. Recarregar mantém a sessão. Aba nova pede login.

**Onde no código.** `src/state/sessao.ts`.

## Agregados do gestor no cliente

**Decisão.** Carga, vencidos, vencendo em 4h e tempo ocioso são calculados no navegador a partir dos caches de chamados e histórico.

**Alternativas.** Um endpoint `/equipe` com os números prontos.

**Por quê.** Um endpoint agregado precisaria ser invalidado a cada evento. Calculando no cliente, os números mudam sozinhos quando o cache recebe um evento. O volume (620 chamados) cabe em `useMemo`.

**Onde no código.** `src/shared/utils/equipe.ts`, `src/features/equipe/pages/EquipePage.tsx`.

## Datas com `Intl` e `zoneinfo`

**Decisão.** Datas formatadas com `Intl.DateTimeFormat`, usando o `locale` e o `zoneinfo` de cada usuário do arquivo.

**Alternativas.** date-fns, Day.js ou Luxon.

**Por quê.** O navegador já tem fuso e locale. A Helena está em `Europe/Lisbon` com `pt-PT` e vê a previsão no horário dela. Uma biblioteca acrescentaria peso sem resolver nada a mais aqui.

**Onde no código.** `src/shared/utils/datas.ts`.

## Escopo

**Decisão.** Os seis requisitos do enunciado mais as dores descritas em cada persona.

**Alternativas.** Só os seis requisitos.

**Por quê.** O enunciado diz que avalia o que aparece na tela, quando e para quem. As dores das personas são onde essa decisão aparece: o alerta de prazo da Marina, o painel enxuto do Ricardo, a linguagem e a sugestão de reabertura da Helena. O que ficou de fora está listado no README.

**Onde no código.** `src/features/chamados/`, `src/features/equipe/`.

## Tabela de transições e motivo obrigatório

**Decisão.** As transições de status permitidas vivem numa tabela, por perfil. Fora da tabela, a ação não aparece na tela, e se chegar ao servidor dá `400`. Motivo vazio em transição manual também dá `400`. Motivos automáticos são preenchidos pelo servidor ("Assumido para atendimento", "Atribuído por {gestor}", "Cliente respondeu", "Confirmado pelo cliente").

**Alternativas.** Regras espalhadas pelos componentes. Validação só na tela.

**Por quê.** Uma tabela só é lida pela tela e pelo servidor, então os dois não divergem. A tela esconde o que o servidor bloquearia, mas quem decide é o servidor. `aberto → em_atendimento` não está na tabela: só acontece ao pegar ou atribuir.

**Onde no código.** `src/shared/utils/status.ts`, `src/mock-server/handlers.ts`, `src/features/chamados/components/AcoesStatus.tsx`.

## `prazoRelevante` e faixas

**Decisão.** O prazo relevante é o de primeira resposta enquanto `primeira_resposta_em` é nulo, e o de resolução depois. As faixas são `encerrado`, `pausado`, `vencido`, `ultima_hora` (até 1h), `critico` (até 4h), `atencao` (até 24h) e `ok`. Só o `status` decide "encerrado".

**Alternativas.** Usar sempre o prazo de resolução. Decidir "encerrado" por `resolvido_em` ou `fechado_em`.

**Por quê.** Um chamado sem primeira resposta está atrasado pelo prazo de primeira resposta, não pelo de resolução. Chamados reabertos no arquivo mantêm `resolvido_em` e `fechado_em` preenchidos, então essas datas mentiriam. O toast só dispara quando a faixa piora para crítico, última hora ou vencido.

**Onde no código.** `src/shared/utils/sla.ts`, `src/features/chamados/hooks/useAlertaSla.ts`.

## Concorrência ao pegar

**Decisão.** Pegar chamado que já tem responsável dá `409` com o nome de quem pegou. No reducer, o último `chamado.atribuido` vence.

**Alternativas.** Lock distribuído entre abas. Atualização otimista com rollback.

**Por quê.** O handler valida contra o estado da aba, que já recebeu os eventos das outras pelo bus. Sobra uma janela de milissegundos em que duas abas passam na validação ao mesmo tempo. É aceita como limite do fake e está comentada no código. Num backend real, o banco resolve.

**Onde no código.** `src/mock-server/handlers.ts` (rota `/atribuir`), `src/shared/utils/reducer.ts`.

## Reabrir não recria prazo

**Decisão.** Reabrir (`resolvido` ou `fechado` → `em_atendimento`) mantém os prazos originais. O detalhe mostra "reaberto em {data}" e a previsão da cliente mostra "em atraso" se o prazo passou.

**Alternativas.** Calcular prazos novos a partir da reabertura.

**Por quê.** O arquivo faz assim: o chamado reaberto mantém os prazos e as datas antigas. Recriar prazo seria uma regra de negócio inventada.

**Onde no código.** `src/shared/utils/reducer.ts` (`status.alterado` não toca prazos), `src/features/chamados/components/CabecalhoChamado.tsx`.

## Pausa não estende prazo

**Decisão.** Em `aguardando_cliente`, `sla_pausado` é verdadeiro e o chamado sai da conta de vencidos. Ao voltar para `em_atendimento`, o prazo é o mesmo de antes.

**Alternativas.** Somar ao prazo o tempo que o chamado ficou pausado.

**Por quê.** No arquivo, `sla_pausado` é verdadeiro exatamente nos 76 chamados em `aguardando_cliente`, então a pausa é derivada do status. Estender o prazo exigiria guardar o início de cada pausa, um dado que o arquivo não traz. Fica como simplificação documentada.

**Onde no código.** `src/shared/utils/reducer.ts`, `src/shared/utils/sla.ts`.

## Prioridade por categoria

**Decisão.** Chamado novo nasce com prioridade `media`. Se a categoria for "Acesso e senhas" ou "Rede e VPN", nasce `alta`.

**Alternativas.** Pedir a prioridade à cliente.

**Por quê.** A Helena não sabe o que é prioridade interna e não deveria precisar saber. Sem acesso e sem rede a pessoa fica parada, então essas duas sobem. A regra é simples e fácil de trocar.

**Onde no código.** `src/mock-server/handlers.ts` (`prioridadePara`).

## Similaridade por palavras

**Decisão.** Candidatos são chamados da mesma solicitante, `resolvido` ou `fechado`, com `atualizado_em` nos últimos 90 dias do relógio virtual. O título é normalizado (minúsculas, sem acento, sem stopwords). Sugere o mais recente com 2 ou mais palavras em comum, ou título idêntico. Uma sugestão só.

**Alternativas.** Busca full-text ou distância de edição. Não sugerir nada.

**Por quê.** O enunciado diz que a Helena às vezes abre chamado repetido. O arquivo tem o caso: #10614 "VPN não liga a partir de casa (outra vez)", com #10612 fechado. Palavras em comum acham esse caso e são fáceis de explicar. Uma sugestão só não vira ruído.

**Onde no código.** `src/shared/utils/similaridade.ts`, `src/features/chamados/pages/NovoChamadoPage.tsx`.

## Tempo ocioso por histórico

**Decisão.** Para cada consultor, a linha do tempo dos últimos 7 dias é reconstruída do histórico de atribuições e status. Ocioso é a soma dos intervalos sem nenhum chamado ativo (`em_atendimento` ou `aguardando_cliente`) atribuído a ele.

**Alternativas.** Contar só os chamados ativos agora. Guardar um contador de ociosidade.

**Por quê.** O Ricardo olha no fim da semana quanto tempo cada um ficou sem chamado. O dado está no histórico. Um contador separado precisaria de outra fonte de verdade.

**Onde no código.** `src/shared/utils/equipe.ts` (`ociosoNaJanela`).

## Sem e2e

**Decisão.** Testes de unidade e de componente com Vitest e Testing Library. Nenhum teste e2e.

**Alternativas.** Playwright com duas abas.

**Por quê.** As regras que mais quebram (reducer, handlers, SLA, transições, visibilidade, ocioso) são funções puras e foram testadas sem tela. O e2e com duas abas é o próximo passo, anotado no README.

**Onde no código.** Arquivos `*.test.ts` e `*.test.tsx` ao lado do código, `src/tests/`.

## Fila agrupada por urgência, sem virtualização

**Decisão.** A fila da consultora é agrupada em Vencidos, Próxima hora (até 1h), Hoje (mais de 1h e prazo relevante até 23:59 do dia no fuso do consultor), Depois, Pausados e Encerrados, com cabeçalho fixo por grupo. A ordem dentro de cada grupo é a do filtro escolhido. A lista não é mais virtualizada.

**Alternativas.** Manter a lista plana com a faixa de alerta no topo. Agrupar dentro da lista virtualizada.

**Por quê.** A dor da Marina é perder tempo procurando o que vai estourar; o grupo diz em que trecho da fila ela está mesmo depois de rolar, e os contadores do topo levam ao grupo. A fila de um consultor tem dezenas de chamados (42 da Marina, 35 sem dono no grupo), o que o navegador renderiza sem esforço, e cabeçalho fixo dentro de lista virtualizada é frágil. A conversa de 1.500 mensagens continua virtualizada. O limite de "Hoje" usa o fim do dia no fuso do usuário; o cálculo ignora troca de horário de verão, que não existe em America/Sao_Paulo desde 2019.

**Onde no código.** `src/features/chamados/utils/fila.ts` (`agruparPorUrgencia`, `fimDoDia`), `src/features/chamados/components/ListaChamados/ListaChamados.tsx`.

## Selo "respondeu" com GET /mensagens/ultimas

**Decisão.** `GET /mensagens/ultimas` devolve, para cada chamado visível, autor e data da última mensagem que o cliente vê (não interna). A fila marca "respondeu" quando esse autor é o próprio cliente. Cada `mensagem.adicionada` não interna atualiza esse cache no `realtime.ts`.

**Alternativas.** Buscar o detalhe de cada chamado da fila. Deduzir de `atualizado_em`.

**Por quê.** `GET /chamados` não traz mensagens, e um GET por chamado seria uma requisição por linha. `atualizado_em` muda também com status e atribuição, então não diz quem falou por último. O resumo é pequeno e segue a mesma regra de visibilidade das outras rotas.

**Onde no código.** `src/mock-server/handlers.ts`, `src/api/queries/chamados.ts` (`useUltimasMensagens`), `src/api/realtime.ts` (`projetarUltima`), `src/features/chamados/utils/fila.ts` (`clienteRespondeu`).

## Próximo passo e novidades da cliente a partir do detalhe

**Decisão.** A tela "Meus chamados" carrega o detalhe de cada chamado da cliente (um GET por chamado, no mesmo cache do detalhe) e deriva dele o próximo passo de cada cartão e as frases de "Desde a sua última visita". A última visita é a que já fica gravada em `localStorage`.

**Alternativas.** Um endpoint agregado para a cliente. Frases derivadas só do status.

**Por quê.** A cliente tem poucos chamados, então poucas requisições. O detalhe já chega filtrado para ela (sem nota interna, histórico sem motivo) e recebe os eventos em tempo real. Só do status não dá para dizer "Juliana pediu mais informações em 01/11" nem "você já respondeu depois disso".

**Onde no código.** `src/features/chamados/utils/cliente.ts`, `src/api/queries/chamados.ts` (`useDetalhes`), `src/features/chamados/pages/MeusChamadosPage/MeusChamadosPage.tsx`.

## Sugestão de redistribuição

**Decisão.** No cartão de quem tem 15 vencidos ou mais, o painel sugere um destino: mesmo grupo, menos chamados ativos, desempate por mais tempo ocioso na semana, e só quem tem menos ativos que a origem. É uma sugestão escrita no cartão; nada é pré-selecionado nem atribuído.

**Alternativas.** Redistribuição automática. Nenhuma sugestão.

**Por quê.** O gestor decide; a sugestão poupa a comparação manual entre cartões. Os critérios usam só números que o cartão já mostra.

**Onde no código.** `src/shared/utils/equipe.ts` (`sugerirDestino`, `LIMITE_SOBRECARGA`), `src/features/equipe/components/CartaoConsultor.tsx`.
