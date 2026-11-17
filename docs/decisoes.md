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

**Por quê.** Com o relógio real, todos os prazos do arquivo já estariam estourados e a ordenação por prazo perderia sentido. Deslocar 620 chamados, mensagens e histórico é frágil. Acelerar permite ver um prazo estourar na demo: em 20x, 2h viram 6 minutos. O relógio fica em `localStorage` e é lido a cada chamada, então todas as abas concordam.

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

**Decisão.** Em atendimento, aguardando cliente, prazo estourado, estoura em até 4 h e tempo sem chamado atribuído são calculados no navegador a partir dos caches de chamados e histórico.

**Alternativas.** Um endpoint `/equipe` com os números prontos.

**Por quê.** Um endpoint agregado precisaria ser invalidado a cada evento. Calculando no cliente, os números mudam sozinhos quando o cache recebe um evento. O volume (620 chamados) cabe em `useMemo`.

**Onde no código.** `src/shared/utils/equipe.ts`, `src/features/equipe/pages/EquipePage.tsx`.

## Datas com `Intl` e `zoneinfo`

**Decisão.** Datas formatadas com `Intl.DateTimeFormat`, usando o `locale` e o `zoneinfo` de cada usuário do arquivo.

**Alternativas.** date-fns, Day.js ou Luxon.

**Por quê.** O navegador já tem fuso e locale. A Helena está em `Europe/Lisbon` com `pt-PT` e vê o prazo no horário dela. Uma biblioteca acrescentaria peso sem resolver nada a mais aqui.

**Onde no código.** `src/shared/utils/datas.ts`.

## Escopo

**Decisão.** Os seis requisitos do enunciado mais as dores descritas em cada persona.

**Alternativas.** Só os seis requisitos.

**Por quê.** O enunciado diz que avalia o que aparece na tela, quando e para quem. As dores das personas são onde essa decisão aparece: o alerta de prazo da Marina, o painel enxuto do Ricardo, a linguagem e a sugestão de reabertura da Helena. O que ficou de fora está listado no README.

**Onde no código.** `src/features/chamados/`, `src/features/equipe/`.

## Tabela de transições e motivo obrigatório

**Decisão.** As transições de status permitidas vivem numa tabela, por perfil. Fora da tabela, a ação não aparece na tela, e se chegar ao servidor dá `400`. Motivo vazio em transição manual também dá `400`. Motivos automáticos são preenchidos pelo servidor ("Assumido para atendimento", "Atribuído por {gestor}", "Cliente respondeu", "Confirmado pelo cliente").

Para a equipe (consultor e gestor), o diálogo de "Mudar status" não pede motivo em texto livre: oferece numa lista suspensa as strings de motivo que já aparecem em `historico.motivo` para aquela transição em `dados.json`, mais a opção "Outro motivo" com campo de texto. Com uma única sugestão, ela já vem pré-selecionada (um clique no "Marcar como resolvido" e já pode confirmar). Sem nenhuma sugestão (`aguardando_cliente → em_atendimento`), só existe "Outro motivo". O motivo continua obrigatório: "Confirmar" só habilita com uma opção escolhida (e texto não vazio, se for "Outro"). Para a cliente (Helena), o campo continua texto livre ("Conte o que aconteceu").

**Alternativas.** Regras espalhadas pelos componentes. Validação só na tela. Texto livre também para a equipe.

**Por quê.** Uma tabela só é lida pela tela e pelo servidor, então os dois não divergem. A tela esconde o que o servidor bloquearia, mas quem decide é o servidor. `aberto → em_atendimento` não está na tabela: só acontece ao pegar ou atribuir. Os motivos digitados pela equipe no arquivo original já seguem um vocabulário fixo por transição; a lista evita variações de redação do mesmo motivo e tornam o registro mais rápido, sem abrir mão do texto livre para o caso que o arquivo não cobre.

**Onde no código.** `src/shared/utils/status.ts` (`MOTIVOS_SUGERIDOS`, `motivosSugeridos`), `src/mock-server/handlers.ts`, `src/features/chamados/components/DetalheChamado/AcoesStatus.tsx`.

## `prazoRelevante` e faixas

**Decisão.** O prazo relevante é o de primeira resposta enquanto `primeira_resposta_em` é nulo, e o de resolução depois. As faixas são `encerrado`, `pausado`, `vencido`, `ultima_hora` (até 1h), `critico` (até 4h), `atencao` (até 24h) e `ok`. Só o `status` decide "encerrado".

**Alternativas.** Usar sempre o prazo de resolução. Decidir "encerrado" por `resolvido_em` ou `fechado_em`.

**Por quê.** Um chamado sem primeira resposta está atrasado pelo prazo de primeira resposta, não pelo de resolução. Chamados reabertos no arquivo mantêm `resolvido_em` e `fechado_em` preenchidos, então essas datas mentiriam. O toast só dispara quando a faixa piora para crítico, última hora ou vencido (na tela: "está prestes a estourar o prazo" e "estourou o prazo"). Os nomes das faixas são do código; a tela usa o vocabulário da seção "Vocabulário da tela".

**Onde no código.** `src/shared/utils/sla.ts`, `src/features/chamados/hooks/useAlertaSla.ts`.

## Concorrência ao pegar

**Decisão.** Pegar chamado que já tem responsável dá `409` com o nome de quem pegou. No reducer, o último `chamado.atribuido` vence.

**Alternativas.** Lock distribuído entre abas. Atualização otimista com rollback.

**Por quê.** O handler valida contra o estado da aba, que já recebeu os eventos das outras pelo bus. Sobra uma janela de milissegundos em que duas abas passam na validação ao mesmo tempo. É aceita como limite do fake e está comentada no código. Num backend real, o banco resolve.

**Onde no código.** `src/mock-server/handlers.ts` (rota `/atribuir`), `src/shared/utils/reducer.ts`.

## Reabrir não recria prazo

**Decisão.** Reabrir (`resolvido` ou `fechado` → `em_atendimento`) mantém os prazos originais. O detalhe mostra "reaberto em {data}" e o próximo passo da cliente diz "passou do prazo" se o prazo estourou.

**Alternativas.** Calcular prazos novos a partir da reabertura.

**Por quê.** O arquivo faz assim: o chamado reaberto mantém os prazos e as datas antigas. Recriar prazo seria uma regra de negócio inventada.

**Onde no código.** `src/shared/utils/reducer.ts` (`status.alterado` não toca prazos), `src/features/chamados/components/CabecalhoChamado.tsx`.

## Pausa não estende prazo

**Decisão.** Em `aguardando_cliente`, `sla_pausado` é verdadeiro e o chamado sai da conta de prazo estourado. Ao voltar para `em_atendimento`, o prazo é o mesmo de antes.

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

## Tempo sem chamado atribuído, por histórico

**Decisão.** Para cada consultor, a linha do tempo dos últimos 7 dias é reconstruída do histórico de atribuições e status. O tempo sem chamado atribuído (o "quanto tempo cada consultor ficou sem chamado atribuído" do enunciado) é a soma dos intervalos sem nenhum chamado `em_atendimento` ou `aguardando_cliente` atribuído a ele.

**Alternativas.** Contar só os chamados em atendimento agora. Guardar um contador.

**Por quê.** O Ricardo olha no fim da semana quanto tempo cada um ficou sem chamado. O dado está no histórico. Um contador separado precisaria de outra fonte de verdade.

**Onde no código.** `src/shared/utils/equipe.ts` (`ociosoNaJanela`).

## Testes de ponta a ponta com Playwright

**Decisão.** Além dos testes de unidade e de componente com Vitest e Testing Library, há 9 testes de ponta a ponta com Playwright, um por requisito do enunciado e um de tempo real com duas abas.

**Alternativas.** Só Vitest, deixando o e2e como próximo passo.

**Por quê.** As regras que mais quebram (reducer, handlers, SLA, transições, visibilidade) são funções puras e estão cobertas no Vitest. O e2e prova que os seis requisitos funcionam na tela, como o avaliador vai usar, e que a mensagem de uma aba aparece na outra sem recarregar.

**Onde no código.** `e2e/`, `playwright.config.ts` (servidor próprio na porta 5180), script `pnpm test:e2e`.

## Fila agrupada pelo prazo, sem virtualização

**Decisão.** A fila da consultora é agrupada em "Prazo estourado", "Estoura na próxima hora" (até 1h), "Estoura hoje" (mais de 1h e prazo relevante até 23:59 do dia no fuso do consultor), "Estoura depois de hoje", "SLA pausado" e "Resolvido ou fechado", com cabeçalho fixo por grupo. A ordem dentro de cada grupo é a do filtro escolhido. A lista não é mais virtualizada.

**Alternativas.** Manter a lista plana com a faixa de alerta no topo. Agrupar dentro da lista virtualizada.

**Por quê.** A dor da Marina é perder tempo procurando o que vai estourar; o grupo diz em que trecho da fila ela está mesmo depois de rolar, e os contadores do topo levam ao grupo. A fila de um consultor tem dezenas de chamados (42 da Marina, 35 na fila do grupo), o que o navegador renderiza sem esforço, e cabeçalho fixo dentro de lista virtualizada é frágil. A conversa de 1.500 mensagens continua virtualizada. O limite de "Estoura hoje" usa o fim do dia no fuso do usuário; o cálculo ignora troca de horário de verão, que não existe em America/Sao_Paulo desde 2019.

**Onde no código.** `src/features/chamados/utils/fila.ts` (`agruparPorUrgencia`, `fimDoDia`), `src/features/chamados/components/ListaChamados/ListaChamados.tsx`.

## Selo "mensagem do cliente" com GET /mensagens/ultimas

**Decisão.** `GET /mensagens/ultimas` devolve, para cada chamado visível, autor e data da última mensagem que o cliente vê (não interna). A fila marca "mensagem do cliente" quando esse autor é o solicitante (`solicitante_id`). Cada `mensagem.adicionada` não interna atualiza esse cache no `realtime.ts`.

**Alternativas.** Buscar o detalhe de cada chamado da fila. Deduzir de `atualizado_em`.

**Por quê.** `GET /chamados` não traz mensagens, e um GET por chamado seria uma requisição por linha. `atualizado_em` muda também com status e atribuição, então não diz quem falou por último. O resumo é pequeno e segue a mesma regra de visibilidade das outras rotas.

**Onde no código.** `src/mock-server/handlers.ts`, `src/api/queries/chamados.ts` (`useUltimasMensagens`), `src/api/realtime.ts` (`projetarUltima`), `src/features/chamados/utils/fila.ts` (`clienteRespondeu`).

## Próximo passo e novidades da cliente a partir do detalhe

**Decisão.** A tela "Meus chamados" carrega o detalhe de cada chamado da cliente (um GET por chamado, no mesmo cache do detalhe) e deriva dele o próximo passo de cada cartão e as frases de "Desde a sua última visita". A última visita é a que já fica gravada em `localStorage`.

**Alternativas.** Um endpoint agregado para a cliente. Frases derivadas só do status.

**Por quê.** A cliente tem poucos chamados, então poucas requisições. O detalhe já chega filtrado para ela (sem nota interna, histórico sem motivo) e recebe os eventos em tempo real. Só do status não dá para dizer "Juliana pediu mais informações em 01/11" nem "você já respondeu depois disso".

**Onde no código.** `src/features/chamados/utils/cliente.ts`, `src/api/queries/chamados.ts` (`useDetalhes`), `src/features/chamados/pages/MeusChamadosPage/MeusChamadosPage.tsx`.

## Sugestão de redistribuição

**Decisão.** No cartão de quem tem 15 chamados com prazo estourado ou mais, o painel sugere um destino: mesmo grupo, menos chamados em atendimento e aguardando cliente, desempate por mais tempo sem chamado atribuído na semana, e só quem tem menos chamados que a origem. É uma sugestão escrita no cartão; nada é pré-selecionado nem atribuído.

**Alternativas.** Redistribuição automática. Nenhuma sugestão.

**Por quê.** O gestor decide; a sugestão poupa a comparação manual entre cartões. Os critérios usam só números que o cartão já mostra.

**Onde no código.** `src/shared/utils/equipe.ts` (`sugerirDestino`, `LIMITE_SOBRECARGA`), `src/features/equipe/components/CartaoConsultor.tsx`.

## Vocabulário da tela

**Decisão.** Todo rótulo visível (título, contador, selo, cabeçalho de grupo, dica, texto de vazio e `aria-label`) sai de um campo, valor ou entidade do `dados.json`, escrito em pt-BR legível, ou de palavras do enunciado. Verbos e navegação genéricos (Entrar, Sair, Enviar, Buscar, Cancelar, Voltar, Abrir chamado, Ver todos) ficam de fora da tabela. Para a cliente, o enunciado pede linguagem sem jargão ("Helena não sabe o que é categoria... e não deveria precisar saber"), então os textos dela são outro nome para um status do arquivo, um para um, e estão listados abaixo.

**Alternativas.** Termos próprios de ITSM ("ativos", "livre", "ocioso", "vencidos"), mais curtos, mas que não existem no arquivo nem no enunciado e obrigam o avaliador a traduzir.

**Por quê.** O avaliador lê a tela com o `dados.json` e o enunciado ao lado. Se um rótulo não aparece em nenhum dos dois, ele precisa adivinhar o que conta. "Ativos", por exemplo, somava `em_atendimento` e `aguardando_cliente`; agora a tela mostra os dois números separados, com os nomes dos status.

**Onde no código.** `src/shared/utils/status.ts` (`ROTULO_STATUS`, `ROTULO_PRIORIDADE`, `ROTULO_ACAO`), `src/shared/utils/sla.ts` (`TIPO_PRAZO`), `src/features/chamados/utils/fila.ts` (`GRUPOS_URGENCIA`), `src/features/chamados/components/DetalheChamado/Passos.tsx`, `src/features/equipe/components/CartaoConsultor.tsx`.

### Status, prioridade e campos

| Rótulo na tela | Antes | Origem |
|---|---|---|
| Aberto, Em atendimento, Aguardando cliente, Resolvido, Fechado (stepper da equipe, filtro de status, linha do tempo) | igual | `meta.status_possiveis`: `aberto`, `em_atendimento`, `aguardando_cliente`, `resolvido`, `fechado` |
| Exceto resolvido e fechado (filtro padrão da fila) | Ativos | valores `resolvido` e `fechado` de `status` |
| Prioridade Baixa, Média, Alta, Crítica | prioridade `media` (valor cru) | `meta.prioridades`: `baixa`, `media`, `alta`, `critica` |
| Crítica (na linha da fila e na tabela do gestor) | crítica | `prioridade: critica` |
| Cliente (meta do chamado, coluna, ordenação) | igual | `solicitante_id` (usuário com `perfil: cliente`); enunciado: "responde ao cliente" |
| Responsável | igual | `responsavel_id` |
| sem responsável | sem dono | `responsavel_id: null` |
| Aberto em | igual | `aberto_em` |
| Atualizado por último (ordenação) | Mais recente | `atualizado_em` |
| Grupo (coluna da tabela do gestor) | igual | `grupo_id`, entidade `grupos` |
| Número, título ou cliente (busca) | igual | `numero`, `titulo`, `solicitante_id` |
| Motivo (diálogo de status) | igual | `historico.motivo`; enunciado: "mudar o status registrando o motivo" |
| Aguardando retorno do cliente, Aguardando validação, Solicitadas informações adicionais (opções de "Em atendimento → Aguardando cliente") | igual | `historico.motivo` do `dados.json` |
| Correção aplicada, Problema não reproduzido, Resolvido com workaround (opções de "Em atendimento → Resolvido") | igual | `historico.motivo` do `dados.json` |
| Fechado após confirmação do cliente (chip de "Resolvido → Fechado", pela equipe) | igual | `historico.motivo` do `dados.json` |
| Reaberto a pedido do cliente (chip de "Resolvido/Fechado → Em atendimento") | igual | `historico.motivo` do `dados.json` |
| Outro motivo (chip do diálogo de status, equipe) | — | sem equivalente no arquivo; cobre transição sem motivo registrado e qualquer motivo fora da lista |
| Nota interna, Nota interna · só a equipe vê, Salvar nota | igual | `mensagens.interna`; enunciado: "anotações internas para colegas" |
| Resposta ao cliente | igual | `mensagens.interna: false` |
| X ficou responsável (linha do tempo) | igual | `historico.tipo: atribuicao` |
| X mudou para em atendimento (linha do tempo) | igual | `historico.tipo: status`, `para` |
| reaberto, Reabrir, Reabrir chamado | igual | enunciado: "Um chamado fechado pode ser reaberto" |
| Pegar para atender | igual | enunciado: "Pegar um chamado para atender" |
| Atribuir, Reatribuir, Atribuir a… | igual | `historico.tipo: atribuicao`; evento `chamado.atribuido` |
| Redistribuir, Redistribuir para… | igual | enunciado: "Redistribui chamados quando alguém falta" |
| Mudar status | igual | enunciado: "Mudar o status de um chamado" |
| Aguardar cliente, Retomar atendimento, Marcar como resolvido, Fechar | igual | transições para `aguardando_cliente`, `em_atendimento`, `resolvido`, `fechado` |
| Status (rótulo acessível do stepper) | Situação | campo `status` |

### Prazo e SLA

| Rótulo na tela | Antes | Origem |
|---|---|---|
| Prazo estourado (grupo da fila, contador, cartão do consultor) | Vencidos | enunciado: "prestes a estourar o prazo"; `prazo_primeira_resposta` / `prazo_resolucao` no passado |
| Estoura na próxima hora | Próxima hora | enunciado: "estourar o prazo"; prazo relevante em até 1 h |
| Estoura hoje (até 23:59) | Hoje | enunciado: "estourar o prazo"; prazo relevante até o fim do dia no `zoneinfo` do usuário |
| Estoura depois de hoje | Depois | enunciado: "estourar o prazo" |
| SLA pausado (grupo, linha, selo, faixa do chamado) | Pausados, pausado, Prazo pausado enquanto aguarda o cliente | `sla_pausado` |
| aguardando cliente (dica do grupo SLA pausado) | aguardando o cliente | `status: aguardando_cliente` |
| Resolvido ou fechado (grupo da fila) | Encerrados | `status: resolvido` e `status: fechado` |
| Resolvido / Fechado (selo de prazo de chamado encerrado) | encerrado | `status` |
| Estoura primeiro (ordenação) | igual | enunciado: "o chamado que está prestes a estourar o prazo" |
| em 2h / há 3h, com estourou · 1ª resposta ou resolução (linha da fila) | venceu · 1ª resposta | `prazo_primeira_resposta`, `prazo_resolucao`; enunciado: "estourar o prazo" |
| Prazo de primeira resposta / Prazo de resolução estoura em X, estourou há X (faixa do chamado) | Primeira resposta vence em X, venceu há X | `prazo_primeira_resposta`, `prazo_resolucao`; enunciado: "estourar o prazo" |
| primeira resposta em {data}, depois do prazo | 1ª resposta também saiu atrasada | `primeira_resposta_em` depois de `prazo_primeira_resposta` |
| estoura em X, estourou há X (selo na redistribuição, toast) | vence em X, venceu há X | enunciado: "estourar o prazo" |
| #N está prestes a estourar o prazo, #N estourou o prazo (toast) | vence em breve, venceu | enunciado: "prestes a estourar o prazo" |
| Estouram o SLA nas próximas 4 horas (tabela do gestor) | Vencendo nas próximas 4 horas | enunciado: "quais chamados vão estourar o SLA nas próximas horas" |
| Nenhum chamado estoura o SLA nas próximas 4 horas. | Nada vence nas próximas 4 horas. | idem |
| Estoura em (coluna) | Restam | enunciado: "estourar o prazo" |
| Prazo (coluna) | igual | `prazo_primeira_resposta` / `prazo_resolucao`; enunciado: "o prazo" |
| com prazo estourado, estouram na próxima hora (contadores do gestor) | vencidos, vencem na próxima hora | enunciado: "estourar o prazo/SLA" |

### Fila e equipe

| Rótulo na tela | Antes | Origem |
|---|---|---|
| Minha fila, Fila (navegação) | igual | enunciado: "a fila do grupo dela", "olhando a fila de todos" |
| Meus (aba) | igual | enunciado: "40 chamados atribuídos a ela" |
| Fila do grupo (aba) | Do grupo, sem dono | enunciado: "a fila do grupo dela, que ninguém pegou ainda" |
| Pode estar na fila do grupo, que ninguém pegou ainda. (busca vazia) | Pode estar na fila do grupo, sem dono. | idem |
| Fila do grupo que ninguém pegou (tabela do gestor) | Fila sem dono | idem |
| Nenhum chamado na fila do grupo. | Nenhum chamado esperando dono. | idem |
| na fila, ninguém pegou (contador do gestor) | sem dono | idem |
| mensagem do cliente (selo na linha; dica: "Última mensagem do chamado é do cliente") | respondeu | última `mensagens` com `interna: false` tem `autor_id` igual a `solicitante_id` |
| Última mensagem do cliente: "…" (cabeçalho do chamado) | Helena respondeu por último: "…" | idem |
| Equipe, Consultores | igual | enunciado: "Tem 12 consultores na equipe" |
| Em atendimento (número no cartão) | ativos (somava os dois status) | `status: em_atendimento` com `responsavel_id` do consultor |
| Aguardando cliente (número no cartão) | ativos (somava os dois status) | `status: aguardando_cliente` com `responsavel_id` do consultor |
| Prazo estourado (número no cartão) | vencidos | enunciado: "estourar o prazo" |
| Estoura em até 4 h (número no cartão) | em 4 h | enunciado: "vão estourar o SLA nas próximas horas" |
| barra = em atendimento e aguardando cliente, na escala do consultor com mais chamados | barra = chamados ativos na escala do mais carregado | `status` |
| Sobrecarregado | igual | enunciado: "quem está sobrecarregado" |
| Sem chamado atribuído (selo) | Livre | enunciado: "quem está sem nada", "sem chamado atribuído" |
| Sem chamado atribuído na semana X | Ocioso na semana X | enunciado: "quanto tempo cada consultor ficou sem chamado atribuído" |
| Sugestão: passar para X · N em atendimento, M aguardando cliente, T sem chamado atribuído na semana | Sugestão: passar para X · N ativos, T ocioso | `status`; enunciado: "sem chamado atribuído" |
| Ordenada por quem está pior: mais chamados com prazo estourado, depois mais em atendimento e aguardando cliente. | …mais vencidos, depois mais ativos. | idem |
| Consultora, Gestor, Cliente (perfil no cabeçalho e no login) | igual | `usuarios.perfil`; enunciado: "Marina, consultora" |
| Quem está sobrecarregado, quem está sem nada e o que vai estourar o SLA nas próximas horas. (login) | …quem está livre e o que vence nas próximas horas. | enunciado, na mesma ordem |
| Fila ordenada pelo prazo e aviso antes de estourar. (login) | …antes de vencer. | enunciado: "estourar o prazo" |

### Tela da cliente (um texto por status)

| Rótulo na tela | Antes | Origem |
|---|---|---|
| Aguardando atendimento (selo) | igual | `status: aberto` |
| Em atendimento, com {responsável} (selo) | igual | `status: em_atendimento`, `responsavel_id` |
| Aguardando sua resposta (selo) | Aguardando a sua resposta | `status: aguardando_cliente` |
| Resolvido, aguardando sua confirmação (selo) | Resolvido, confirme | `status: resolvido` |
| Fechado (selo, cartão) | igual | `status: fechado` |
| Stepper: Aberto, Em atendimento, Aguardando você, Resolvido, Fechado | Recebido, Em atendimento (juntava aguardando), Resolvido, Encerrado | um passo por valor de `status` |
| Fechados (seção da lista) | Encerrados | `status: fechado` |
| Chamado fechado em {data}, atendido por X | Chamado encerrado em {data} | `fechado_em`, `responsavel_id` |
| X fechou o chamado, O chamado foi fechado | X encerrou o chamado, O chamado foi encerrado | `historico.para: fechado` |
| X pegou o seu chamado, X pediu mais informações, X marcou como resolvido, X retomou o atendimento | igual | `historico.para`: `em_atendimento` (de `aberto`), `aguardando_cliente`, `resolvido`, `em_atendimento` |
| Prazo estourado / Aguardando você / Com a equipe (de quem é o próximo passo) | Atrasado / Aguardando você / Com a equipe | enunciado: "estourar o prazo"; `aguardando_cliente`; enunciado: "equipe" |
| Prazo de primeira resposta até {data}, Prazo de resolução até {data} | Previsão de resposta até {data}, Previsão de resolução até {data} | `prazo_primeira_resposta`, `prazo_resolucao`; enunciado: "quando terá uma resposta" |
| Ninguém pegou ainda e já passou do prazo de primeira resposta ({data}). | …já passou da previsão ({data}). Está em atraso… | `prazo_primeira_resposta`; enunciado: "se alguém pegou o chamado dela" |
| Continua sem resposta e passou do prazo, Passou do prazo e ainda está em atendimento | …passou do previsto | `prazo_*`, `status` |
| Novidades desde a sua última visita | Desde a sua última visita | enunciado: "recebe aviso de que há novidade" |
| O que aconteceu até agora | igual | enunciado: "entender o que aconteceu sem ter que ler tudo de novo" |
| O que parou? (opções com nome amigável, uma por categoria) | igual | entidade `categorias` (cada opção aponta para um `categoria_id`); enunciado: "Não sabe o que é categoria" |
| Ainda não resolveu, Resolvido? Confirmar | igual | transições `resolvido` para `em_atendimento` e para `fechado` |
