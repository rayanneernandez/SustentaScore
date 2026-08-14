# SustentaScore — Handoff / Contexto para continuidade

Este arquivo existe para você (ou outra IA, em outro computador/sessão) continuar o desenvolvimento
deste projeto sem perder o contexto do que já foi construído. **Leia este documento inteiro antes de
fazer qualquer alteração.** Ele é atualizado a cada rodada grande de mudanças — a seção 6 (histórico)
está em ordem cronológica, mais recente por último; é a parte mais importante para entender "onde
paramos".

## 1. O que é o projeto

**SustentaScore** é um protótipo de frontend (sem backend) para um sistema de pontuação de
desempenho de sustentabilidade de fornecedores em contratos públicos. Cobre: cadastro de
fornecedores/contratos, **Aspectos de Sustentabilidade** (antes chamados "Macroindicadores") com uma
estrutura de PDLS (Plano de Desenvolvimento Local Sustentável) por trás, registro de ocorrências
(não conformidades) atreladas a Eixos PDLS, cálculo de score, faixas de pagamento por score, um
painel gerencial (dashboard), e um sistema de login com dois papéis (Administrador/Colaborador).

- Stack: **React 18 + TypeScript + Vite**, **React Router DOM v6**, **Recharts** (gráficos),
  **Lucide React** (ícones), **jsPDF + jspdf-autotable** (export de PDF), CSS puro (design system
  próprio em `src/index.css`, sem framework CSS).
- **Não tem backend.** Todos os dados-base ficam em `src/data/mockData.ts` e depois são persistidos
  no `localStorage` do navegador (chave `sustentascore:dados:v1`) via `src/context/DataContext.tsx`.
  Dados cadastrados pelo usuário sobrevivem a recarregar a página, mas só naquele navegador/perfil.
- **Login também é só local/frontend** (ver seção 5, "Autenticação") — protótipo enquanto não existe
  banco de dados de verdade. Não é seguro para produção.
- Rodando em duas pastas locais (mantidas em sincronia manualmente, sem link simbólico):
  - `C:\Users\RAYANNE PC\Desktop\Acesso\1.0 - Frelanceer\1.0 - Projetos\SustentaScore\SustentaScore`
  - `C:\Users\GTIA003\Desktop\Acesso Rapido\Meus\SustentaScore`
  - Também há um repositório GitHub vinculado ao projeto.

## 2. Como rodar o projeto

```bash
cd "caminho/da/pasta/SustentaScore"
npm install       # IMPORTANTE: sempre rodar após puxar arquivos novos (ver seção 3)
npm run dev       # inicia o servidor de desenvolvimento (Vite)
```

Para checar erros de tipo e build de produção antes de considerar algo "pronto":

```bash
npx tsc --noEmit
npm run build
```

Contas de teste para o login (ver seção 5, "Autenticação"):

- Administrador — `admin@sustentascore.gov.br` / `admin123`
- Colaborador — `colaborador@sustentascore.gov.br` / `colab123`

## 3. Dependências — atenção especial

O `package.json` já inclui `jspdf` e `jspdf-autotable` (geração de PDF na tela de Medição e
Pagamento). Se você (ou a próxima IA) receber os arquivos do projeto sem rodar `npm install` de
novo, vai dar erro `Failed to resolve import "jspdf"`. Sempre que o `package.json` mudar, é preciso
rodar `npm install` antes de `npm run dev`.

## 4. Instruções permanentes do usuário (Rayanne) — **sempre seguir**

1. **Nunca colar código como "revisão" no chat.** Editar direto os arquivos reais do projeto.
   O usuário quer receber os arquivos prontos, não trechos de código para copiar/colar.
2. **A aplicação inteira precisa ser responsiva** (funcionar bem em desktop e celular). Qualquer
   componente novo deve ser testado em larguras pequenas (~375px) também.
3. Sempre validar as mudanças antes de entregar: `npx tsc --noEmit`, depois `npm run build`, e
   idealmente um teste funcional automatizado (Playwright) da funcionalidade alterada.
4. Depois de editar, sempre entregar os arquivos alterados de volta — hoje isso é feito por chat
   (arquivo por arquivo) porque a ponte de acesso direto às pastas do usuário está instável nesta
   sessão; se estiver funcionando na sua sessão, prefira gravar direto nas pastas listadas na seção 1.

## 5. Arquitetura — pontos essenciais

### Estado global: `src/context/DataContext.tsx`

Esta é a **fonte única de verdade** da aplicação. Exporta o hook `useData()`, usado por quase todas
as páginas. Contém, entre outras coisas:

- Dados: `fornecedores`, `contratos`, `ocorrencias`, `indicadores` (os Aspectos de
  Sustentabilidade — cada um com `eixoPDLSId`), `eixosPDLS` (os 6 Eixos PDLS fixos, a **única**
  lista de eixos do sistema — ver "Domínio PDLS" abaixo), `indicadoresPDLS` (Indicadores de
  Desempenho do PDLS), `objetosContratuais`, `notificacoes`, `usuarios`, `usuarioAtual`.
- Mutators: `addFornecedor`, `updateFornecedor`, `addContrato`, `updateContrato`, `addOcorrencia`,
  `addIndicador`, `updateIndicador`, `removeIndicador`,
  `updateEixoPDLS`, `addIndicadorPDLS`, `updateIndicadorPDLS`, `removeIndicadorPDLS`,
  `addObjetoContratual`, `removeObjetoContratual`, `addUsuario`, `updateUsuario`,
  `removeUsuario`, `addPerfil`, `updatePerfil`, `removePerfil`, `login`, `logout`,
  `marcarNotificacaoLida`, `marcarTodasNotificacoesLidas`.
- Helpers: `contratosDoFornecedor`, `contratosAtivosDoFornecedor`, `scoreFornecedor`,
  `indicadoresPDLSDe(macroindicadorId, eixoId)`.
- Tudo é persistido automaticamente em `localStorage` via `useEffect` interno — não é preciso
  chamar nada manualmente para salvar. Exceção: `modoVisualizacao` (ver "Autenticação" abaixo), que
  é intencionalmente **não persistido**.
- **Contratos inativos nunca contam no score atual do fornecedor, nos indicadores gerenciais nem no
  dashboard.** Esse filtro (`c.status === 'ativo'`) é repetido em várias páginas — ao adicionar uma
  tela nova que lista contratos para cálculo/indicadores, replicar esse filtro. **Exceção
  importante:** contratos inativos **continuam aparecendo, marcados como histórico**, em `Cálculo do
  Score` e no detalhe do contrato (`Cadastro.tsx`, bloco "Histórico de Score") — é informação
  gerencial para avaliar o fornecedor em futuras contratações, só não entra no cálculo atual.

Todas as páginas (`Dashboard.tsx`, `CalculoScore.tsx`, `Ocorrencias.tsx`, `Cadastro.tsx`,
`Indicadores.tsx`, `MedicaoPagamento.tsx`) já usam `useData()` para os dados que têm gestão via UI.
`mockData.ts` ainda é importado direto só para `medicoes` (histórico mensal de score/pagamento, sem
tela de cadastro própria ainda).

### Domínio PDLS — Aspectos de Sustentabilidade, Eixos e Indicadores de Desempenho

**A tela onde essa estrutura é CADASTRADA (criada/editada/excluída) é `EstruturaSustentabilidade.tsx`
(`/estrutura-sustentabilidade`, "Estrutura de Sustentabilidade" no menu) — não mais `Indicadores.tsx`.** Essa separação foi
pedida pela usuária depois que achou confuso ter o cadastro do Eixo PDLS e do Indicador de
Desempenho escondido dentro do modal de detalhe (só devia ser consulta) de um Aspecto de
Sustentabilidade, em `Indicadores.tsx`. Hoje:

- `Indicadores.tsx` (Aspectos de Sustentabilidade) é **só leitura/seleção**: filtra e lista os
  Aspectos já cadastrados, e o modal de detalhe mostra (sem nenhum botão de editar) os Eixos PDLS e
  Indicadores de Desempenho já ligados a ele, e os contratos vinculados. Tem um botão "Estrutura de
  Sustentabilidade →" no cabeçalho (visível só quem tem `podeVer('cadastroPdls')`) que leva pra tela de cadastro.
- `EstruturaSustentabilidade.tsx` é onde TUDO é criado/editado/excluído, num fluxo em cascata de 4 passos, cada
  um só libera depois que o passo anterior tem uma seleção:

```
Passo 1: Objeto Contratual (objetosContratuais — cadastrado/excluído aqui agora, não mais em Indicadores.tsx)
  Passo 2: Aspecto de Sustentabilidade (Indicador, ex-"Macroindicador") — filtrado pelo Objeto do passo 1
    Passo 3: Eixo PDLS (EixoPDLS — não é mais uma lista fixa de 6, ver abaixo)
      Passo 4: Indicador de Desempenho PDLS (IndicadorPDLS) — nome, meta (ainda a definir com
               precisão pelo órgão), unidade de medida, meios de verificação (cada um comprova o
               cumprimento — ex: anexar um documento já cumpre o requisito), referência
               normativa/Objetivo PDLS. NÃO tem mais campo de "Itens do TR" — removido a pedido da
               usuária ("não precisa"); ainda existe como campo opcional não usado em dados antigos
               (`meiosVerificacao`/`referenciaNormativa` continuam, só `itensTR` saiu do tipo).
```

Cada passo do wizard mostra chips/linhas clicáveis pra selecionar o que já existe, mais um
botão/form pra criar um novo (gated por `podeCriar`/`podeEditar`/`podeExcluir` da tela
`cadastroPdls`) — pencil/lixeira em cada item pra editar/excluir. No passo 3, os Eixos PDLS que já
têm pelo menos um Indicador de Desempenho para o Aspecto selecionado aparecem com uma bolinha
(classe CSS `.eixo-tab--cadastrado`) — os outros ainda estão disponíveis pra começar a usar.

**IMPORTANTE — `Indicador` NÃO tem mais um campo de Eixo PDLS direto.** Isso já mudou de ida e volta
nesta sessão, então vale registrar bem o porquê: numa rodada, a usuária pediu pra unificar "Eixo
Temático" (tag livre: Meio Ambiente/Governança/Social) com "Eixo PDLS", e a solução implementada foi
dar ao `Indicador` um campo escalar `eixoPDLSId` (uma "badge" de Eixo PDLS por Aspecto). Só que o
Aspecto **já tinha**, desde antes, uma estrutura própria pra isso — um Aspecto pode ter Indicadores
de Desempenho em vários Eixos PDLS diferentes, via `IndicadorPDLS` (que carrega `macroindicadorId` +
`eixoId`). Ter as DUAS coisas ao mesmo tempo (a badge única + a estrutura de abas por eixo) foi o
que a usuária relatou como confuso. Solução final: **removido o campo `eixoPDLSId` do `Indicador`**
— os "Eixos PDLS de um Aspecto" são simplesmente os eixos que têm pelo menos um `IndicadorPDLS`
ligado a ele. Não recriar esse campo escalar se pedirem uma "categoria" de novo pro Aspecto — a
estrutura via `IndicadorPDLS` já cobre isso, é só uma questão de exibir bem (ver `eixosDoAspecto()`
em `Indicadores.tsx`, e o passo 3 de `EstruturaSustentabilidade.tsx`).

`indicadoresPDLSDe(macroindicadorId, eixoId)` no `DataContext` é o helper pra buscar os indicadores
de um Aspecto num Eixo específico — usado tanto no modal de leitura de `Indicadores.tsx` quanto no
passo 4 de `EstruturaSustentabilidade.tsx`.

**Nomenclatura:** o termo visível para o usuário é sempre **"Aspecto de Sustentabilidade"** (não
"Macroindicador" — foi renomeado a pedido da Vanessa, revisora do sistema). Os identificadores
internos no código (`Indicador`, `indicadores`, `macroindicadorId`, `indicadoresPDLSDe`, etc.)
continuam com o nome antigo por estabilidade — só o texto visível na tela foi trocado.

**`eixosPDLS` deixou de ser uma lista fixa de exatamente 6 itens.** Os 6 eixos originais (vindos
dos documentos reais do PDLS) continuam existindo, mas a usuária pediu para também poder **criar**
novos eixos (não só renomear os 6) — `DataContext` expõe `addEixoPDLS(nome)` (cria com o próximo
número disponível, ex: Eixo 7 se já houver até o 6) e `removeEixoPDLS(id)` (recusa se o eixo ainda
estiver em uso — em qualquer `Ocorrencia.eixoPDLSId` ou `IndicadorPDLS.eixoId` — ou se for o único
eixo restante; retorna `boolean` pra UI mostrar mensagem de erro quando recusar). Todo esse
CRUD de eixo (criar/renomear/excluir) vive **só** em `EstruturaSustentabilidade.tsx` agora (passo 3) — não existe
mais um botão "Eixos PDLS" em `Indicadores.tsx` nem em `Ocorrencias.tsx` (que tinham isso numa
rodada anterior); `Ocorrencias.tsx` só consome a lista no select do formulário, com uma dica de
texto ("Cadastre em Estrutura de Sustentabilidade") linkando pra lá.

### Ocorrências → Eixo PDLS

Cada `Ocorrencia` continua com `eixoPDLSId` (obrigatório, campo escalar direto — isso não mudou) —
está atrelada a um dos Eixos PDLS existentes (mesma lista `eixosPDLS` do contexto). O filtro e o
gráfico "Distribuição das Ocorrências por Eixo PDLS" (`Dashboard.tsx`) agrupam por esse campo. A
diferença do Aspecto de Sustentabilidade é que uma Ocorrência é sempre de UM eixo só, então o campo
escalar faz sentido ali — não sofreu a mesma reversão.

### `PaginaKey` — a tela nova `cadastroPdls`

Ao adicionar `cadastroPdls` a `PaginaKey` (`types/index.ts`) e a `PAGINAS_SISTEMA` (`mockData.ts`),
todos os `num` das telas foram renumerados pra manter a ordem visível no menu sequencial:
`cadastro`=1, `indicadores`=2, `cadastroPdls`=3, `ocorrencias`=4, `score`=5, `medicao`=6,
`dashboard`=7, `usuarios`=8, `perfis`=9. Se for adicionar mais uma tela no futuro, mesma lógica:
escolher onde ela entra na ordem visual e renumerar o que vier depois dela (em `mockData.ts` **e**
em `Sidebar.tsx`, que tem os números hardcoded nos itens da seção "ADMINISTRAÇÃO" — os da seção
operacional/gerencial já vêm do array `navOperacional`/`navGerencial`, então não precisa tocar ali
tela por tela). `cadastroPdls` também entrou em `PAGINAS_ADMINISTRACAO` (mockData.ts), pra o perfil
Colaborador padrão não ver essa tela por padrão (é tela de configuração/estrutura, não do dia a dia
operacional) — mas qualquer perfil customizado pode ganhar acesso normalmente em Perfis de Acesso.

### Autenticação e permissões — Perfis de Acesso configuráveis (`Usuario`, `Perfil`, `PaginaKey`)

Protótipo de login **só no frontend, sem backend** (ver aviso no tipo `Usuario` em `types/index.ts`
— senha em texto simples comparada no cliente; **não é seguro**, existe só para simular controle de
acesso até a Rayanne conectar um banco de dados de verdade por trás).

**Isto substituiu o modelo antigo de dois papéis fixos (`Papel: 'administrador' | 'colaborador'`).**
Agora existem `Perfil`es de acesso configuráveis: cada `Perfil` tem um nome e uma grade de
permissões (`permissoes: Record<PaginaKey, PermissaoPagina>`) — uma entrada por tela do sistema.
`PermissaoPagina` tem **4 campos independentes**: `ver`, `criar`, `editar`, `excluir` — um perfil
pode, por exemplo, criar e editar ocorrências mas não excluir nenhuma. `PaginaKey` é a lista fixa de
telas (`dashboard`, `cadastro`, `indicadores`, `ocorrencias`, `score`, `medicao`, `usuarios`,
`perfis`) — a fonte única é `PAGINAS_SISTEMA` em `mockData.ts`, usada tanto pela `Sidebar` quanto
pelas rotas protegidas (`App.tsx`) quanto pela grade de permissões em `Perfis.tsx`. Ao adicionar uma
tela nova ao sistema, ela **precisa** entrar em `PaginaKey` e em `PAGINAS_SISTEMA`, senão não aparece
na grade de permissões e não pode ser controlada por perfil.

**"Usuários e Permissões" foi dividida em duas telas separadas** (`Usuarios.tsx` em `/usuarios` e
`Perfis.tsx` em `/perfis`, cada uma com sua própria entrada em `PaginaKey`/`PAGINAS_SISTEMA`,
numeradas 7 e 8 no menu) — porque são públicos diferentes: quem só precisa cadastrar/editar usuários
não necessariamente deveria poder alterar a grade de permissões dos perfis, e vice-versa. Cada uma
tem sua própria permissão `ver`/`criar`/`editar`/`excluir`, igual a qualquer outra tela.

- `Usuario.perfilId` substitui o antigo `papel` — aponta para um `Perfil`. `Usuario.cargo?: string`
  é só informativo (ex: "Fiscal de Contrato"), não afeta permissões.
- Dois perfis padrão sempre existem (`PERFIS_PADRAO` em `mockData.ts`, ids fixos `PERFIL_ADMIN_ID` /
  `PERFIL_COLABORADOR_ID`): **Administrador** (acesso total — os 4 campos `true` em todas as telas,
  `padrao: true`, e suas permissões **nunca** podem ser editadas pela UI — `updatePerfil` no
  `DataContext` força `permissoes` de volta ao total mesmo se alguém tentar mudar, e o carregamento
  inicial dos dados também força isso, ver `garantirPerfisPadrao` — isso existe para garantir que
  sempre haja um caminho de acesso completo ao sistema); e **Colaborador** (vê todas as telas exceto
  `usuarios`/`perfis`, não cria/edita/exclui nada — esse é só o padrão de fábrica, pode ser
  reconfigurado livremente na UI como qualquer outro perfil, já que não é o Administrador). Perfis
  novos são criados/editados na tela `/perfis`, sem limite de quantidade, cada um com sua própria
  combinação de telas/permissões.
- `App.tsx` renderiza `<Login />` no lugar de todas as rotas quando não há `usuarioAtual`.
- `modoVisualizacao` (**não persistido**, só em memória) permite a quem tem o perfil Administrador
  "ver o sistema como" qualquer outro perfil sem deslogar — um `<select>` no rodapé da Sidebar lista
  todos os perfis. `perfilEfetivo` resolve isso: para o Administrador real, é o perfil escolhido em
  `modoVisualizacao` (ou o próprio, se `null`); para quem não é Administrador, é sempre o próprio
  perfil (não pode simular outro).
- `podeVer`, `podeCriar`, `podeEditar`, `podeExcluir` — todos com assinatura `(pagina: PaginaKey) =>
  boolean` — são o que toda a UI usa agora: `podeVer` esconde itens de menu e bloqueia rotas (ver
  `RotaProtegida` em `App.tsx` — redireciona pra primeira tela permitida se alguém digitar uma URL
  sem `ver`); os outros três esclarecem/desabilitam, respectivamente, os botões de criar um registro
  novo, editar um existente, e excluir.
- **Padrão de gating a replicar em telas novas:** nas páginas que têm ações de escrita
  (`Cadastro.tsx`, `Indicadores.tsx`, `Ocorrencias.tsx`, `Usuarios.tsx`, `Perfis.tsx`), o componente
  desestrutura `podeCriar: podeCriarPagina, podeEditar: podeEditarPagina, podeExcluir:
  podeExcluirPagina` do `useData()` (só os que a tela realmente usa) e faz `const podeCriar =
  podeCriarPagina('chave-da-pagina')` (idem para os outros) logo depois — assim todo o resto do
  componente continua usando `podeCriar`/`podeEditar`/`podeExcluir` como booleanos simples, sem
  precisar mudar cada `{podeEditar && (...)}` isoladamente. Ao gatear um botão, pense no verbo: botão
  "Novo X" → `podeCriar`; lápis de editar um registro existente → `podeEditar`; lixeira →
  `podeExcluir`. Quando várias ações aparecem juntas num mesmo bloco condicional (comum em botões
  lado a lado), o bloco externo passa a checar `(podeX || podeY)` e cada botão individual checa sua
  própria permissão — ver exemplos em `Cadastro.tsx` (`FornecedorCard`, onde "Editar" e "+ Contrato"
  foram separados em `podeEditar` e `podeCriar` respectivamente) e `Indicadores.tsx` (lápis/lixeira
  dos cards). `CalculoScore.tsx`, `MedicaoPagamento.tsx` e `Dashboard.tsx` continuam só leitura para
  todo mundo (sem esse gating), mas já são protegidas por `podeVer` no nível de rota.
- Migração automática de dados salvos antes da unificação Eixo Temático/Eixo PDLS (em
  `DataContext.tsx`): `migrarIndicador` converte qualquer `Indicador` salvo com o campo antigo
  `categoria` (sem `eixoPDLSId`) para o Eixo 1, já que não existe um mapeamento exato de categoria
  antiga para eixo PDLS — pode ser reatribuído normalmente depois, editando o aspecto.
  `migrarOcorrencia` faz o mesmo para qualquer `Ocorrencia` salva sem `eixoPDLSId` válido (esse era
  o bug do badge "Eixo —" na listagem — não havia migração nenhuma pra esse campo antes; agora tem).
  **Atenção se for tocar nessas duas funções de novo:** elas recebem a lista atual de `eixosPDLS`
  como parâmetro (`eixosAtuais`) e validam contra ela, **não** contra a lista original de 6 —
  porque agora dá pra criar eixos novos (ver acima), então um `eixoPDLSId` customizado é válido e
  não deve ser tratado como "eixo antigo/quebrado". `carregarDadosIniciais()` resolve `eixosPDLS`
  primeiro (parsed ou o padrão) e só depois usa esse valor pra migrar `ocorrencias`/`indicadores`.
- Migração automática de dados salvos antes das mudanças de permissões (em `DataContext.tsx`): `migrarUsuario`
  converte qualquer `Usuario` salvo com o `papel` antigo para o `perfilId` do perfil padrão
  equivalente; `migrarPermissaoPagina` converte o formato antigo de permissão (só `ver`/`editar`,
  sem `criar`/`excluir` separados) para o atual — quem podia `editar` antes ganha `criar` e `excluir`
  também, já que antes não havia essa distinção; `garantirPerfisPadrao` garante que os dois perfis
  padrão sempre existam, normaliza a permissão de toda tela (inclusive telas novas como `perfis`, que
  entram sem nenhum acesso pra perfis que não são o Administrador) e força as permissões do
  Administrador ao total, nunca confiando no que estiver salvo. Isso é só para não quebrar quem já
  tinha dados no `localStorage` de uma versão anterior — não precisa se preocupar com isso ao criar
  perfis/usuários novos.

### Utilitário compartilhado: `src/utils/anexos.ts`

Funções para lidar com upload de anexos (arquivos) como Data URL, usadas em `Cadastro.tsx` e
`Ocorrencias.tsx`: `TAMANHO_MAX_ANEXO` (4MB), `MAX_ANEXOS_POR_ENVIO` (10), `lerArquivoComoDataUrl`,
`arquivosParaAnexos`.

### Notificações (`src/components/NotificationBell.tsx` + `Layout.tsx`)

- Modelo genérico (`Notificacao`: `id, tipo, titulo, descricao, urgencia, link?, lida`) — hoje só
  gerado a partir de vencimento de contrato (`gerarNotificacoesVigencia` em `DataContext.tsx`), mas
  desenhado para agregar outras origens no futuro (ex: ocorrências novas, quedas de score).
- O painel de notificações é uma **gaveta fixa do lado direito** (`position: fixed`), não um
  dropdown flutuante — o usuário pediu explicitamente para nunca sobrepor conteúdo. Em telas
  ≥901px, abrir a gaveta empurra o conteúdo (`.main-content--notif-open`); em mobile a gaveta ocupa
  quase a tela toda sem empurrar nada.
- **No Dashboard especificamente, a faixa superior (`.topbar`) fica sem padding em telas ≥901px**
  (classe `topbar--dashboard`, aplicada em `Layout.tsx` via `naDashboard`) — porque nela não sobra
  nenhum conteúdo visível (o sino já está dentro do próprio cabeçalho da página, ao lado de "Última
  atualização", e o botão de menu mobile é `display: none` em telas grandes); sem isso, ficava um
  espaço vazio de ~14px acima do título "Monitoramento de Desempenho...", que a usuária pediu pra
  remover ("colada lá em cima"). Em mobile o padding normal continua, porque ali o botão de abrir o
  menu lateral precisa desse espaço. Cuidado ao alterar `.topbar`/`Layout.tsx`: essa classe só deve
  zerar o padding acima de 900px — nunca remover o `@media (max-width: 768px) { .topbar {...} }` já
  existente nem o bloco que mostra `.topbar-menu-btn` no mobile.

### Paleta de cores para gráficos

Segue a metodologia do skill interno de "dataviz": ordem categórica fixa e validada para
distinguibilidade em daltonismo — nunca reordenar/gerar cores aleatórias para séries novas. A
paleta usada está em `Dashboard.tsx` (`CORES_UNIDADE`): `#2a78d6, #eb6834, #1baf7a, #eda100,
#e87ba4, #4a3aa7` (+ `#9CA3AF` cinza-neutro para "Outras unidades" quando excede 6 séries).

### Padrão de filtros em cascata (muito usado — replicar esse padrão em filtros novos)

Vários lugares têm um filtro dependente de outro (ex: "Fornecedor" só lista quem tem contrato na
"Unidade" selecionada). O padrão sempre é:

```ts
const opcoesDependentes = useMemo(
  () => ['Todos', ...new Set(itens.filter(item => unidadeSel === 'Todos' || item.unidade === unidadeSel).map(item => item.campo))],
  [itens, unidadeSel],
);

useEffect(() => {
  if (valorSelecionado !== 'Todos' && !opcoesDependentes.includes(valorSelecionado)) {
    setValorSelecionado('Todos'); // ou o primeiro item válido, se não houver opção "Todos"
  }
}, [opcoesDependentes, valorSelecionado]);
```

Exemplos existentes: `Dashboard.tsx` (Fornecedor↔Unidade), `CalculoScore.tsx` (Contrato↔Unidade),
`MedicaoPagamento.tsx` (Fornecedor↔Unidade↔Contrato↔Mês, o mais completo).

### Score por unidade (mesmo fornecedor, contratos em unidades diferentes)

`FornecedorCard` em `Cadastro.tsx` calcula `scorePorUnidade` (média de score dos contratos ativos
daquele fornecedor, agrupados por `unidade`) e só mostra o bloco "Score por unidade" quando há mais
de uma unidade — evita redundância com o score geral do fornecedor já mostrado no cabeçalho do card.
Cada linha de contrato também mostra o score numérico (`.contract-item-score`), não só a bolinha
colorida de faixa.

## 6. Histórico do que já foi implementado (mais recente por último)

Cada bloco abaixo corresponde a um pedido do usuário já **implementado e validado** (tsc + build +
teste automatizado). A entrega para as pastas reais depende da ponte de acesso ao dispositivo estar
conectada nesta sessão — quando não está, os arquivos são entregues por chat e o usuário copia
manualmente (ver seção 4, item 4).

1. **Notificações generalizadas + lida/não lida.** Modelo `Notificacao` genérico (não só vigência).
   Bolinha colorida de score em cada contrato na tela de Cadastro.
2. **Aspectos de Sustentabilidade (então "Macroindicadores"):** filtros, modal de detalhe com
   contratos vinculados.
3. **Ocorrências:** campo de registrante, tipo de registro "Treinamento" (dedução zero).
4. **Notificações nunca sobrepõem conteúdo** — gaveta fixa à direita.
5. **Dashboard:** tabela de menores scores, alternador Geral/Por unidade, KPI "Unidade mais
   sustentável".
6. **Cálculo do Score:** filtro por Unidade além do de Contrato.
7. **Medição e Pagamento:** migrada para `useData()`; filtros encadeados Fornecedor→Unidade→
   Contrato→Mês; export real de CSV e PDF (`jspdf` + `jspdf-autotable`).
8. **Estrutura PDLS (Eixos, Indicadores de Desempenho):** tipos `EixoPDLS`, `MeioVerificacao`,
   `IndicadorPDLS`; seed de dados reais transcritos das tabelas TR nº 9/2023 (Serviço de Limpeza) e
   TR nº 101/2024 (Apoio Administrativo); nova tela de detalhe do Aspecto com abas por Eixo PDLS,
   renomeável, e CRUD de Indicadores de Desempenho dentro de cada eixo; `objetosContratuais`
   migrado para cadastro via UI (antes era lista fixa duplicada em duas telas). Bug corrigido: reset
   indevido da aba de Eixo ativa ao renomear um eixo (ver seção 5).
9. **Login e permissões (Administrador/Colaborador):** telas `Login.tsx` e `Usuarios.tsx`, modelo
   `Usuario`/`Papel` no `DataContext`, gating de todos os botões de escrita por `podeEditar` em
   `Cadastro.tsx`/`Indicadores.tsx`/`Ocorrencias.tsx`, alternador "Ver como Colaborador" na Sidebar
   para admins pré-visualizarem sem deslogar. Ver seção 5, "Autenticação", para os detalhes e o
   padrão de gating a replicar.
10. **Correções da revisora (Vanessa) — 5 pontos, todos aplicados nesta rodada:**
    - Renomeado "Macroindicador(es)" → "Aspecto(s) de Sustentabilidade" em todo texto visível
      (título, botões, filtros, menu lateral, hints). Identificadores internos no código não foram
      renomeados (ver seção 5).
    - Contrato inativo: continua fora do cálculo de score atual do fornecedor, mas agora tem um
      bloco "Histórico de Score" visível no detalhe do contrato (`Cadastro.tsx`) e aparece
      selecionável, marcado como "(Inativo — histórico)", em `CalculoScore.tsx` — informação
      gerencial para futuras contratações.
    - Removida a opção "Renovação" do Tipo de contrato (era redundante com Prorrogação); botão
      simplificado para só "Prorrogar vigência".
    - Ocorrências passaram a se atrelar a um dos 6 Eixos PDLS (`eixoPDLSId`, obrigatório) em vez do
      antigo campo `categoria` livre; filtro por Eixo PDLS na listagem; gráfico do Dashboard
      "Distribuição das Ocorrências por Eixo PDLS" agrupado por esse campo (e corrigido para ler as
      ocorrências do contexto — antes lia um array estático de `mockData.ts`, que não refletia
      ocorrências novas cadastradas pela UI). O gerenciador de "Eixos temáticos" (tag do Aspecto de
      Sustentabilidade, conceito diferente do Eixo PDLS) foi movido de `Ocorrencias.tsx` para
      `Indicadores.tsx`, onde essa tag é de fato usada.
    - Bloco "Score por unidade" no card do fornecedor (`Cadastro.tsx`) quando ele tem contratos
      ativos em mais de uma unidade; score numérico visível em cada linha de contrato (antes só a
      bolinha de cor).
    - Dados de seed ajustados para dar exemplos reais dessas mudanças: `ct6` (Fornecedor C) marcado
      como inativo com 3 medições de histórico; `ct9`, novo contrato ativo da Construtora Alfa numa
      segunda unidade, para exercitar o "Score por unidade".
11. **Perfis de acesso configuráveis (substituiu o Administrador/Colaborador fixo):** tela
    `/usuarios` redesenhada com duas tabelas profissionais (Usuários e Perfis de Acesso, ambas
    responsivas com rolagem horizontal em telas pequenas) em vez da lista de cards + formulário no
    fim de página de antes. Agora dá pra: criar qualquer número de perfis novos, cada um com nome
    próprio e uma grade de permissões por tela (`ver` / `criar-editar-excluir`, uma linha por tela do
    sistema); atribuir um `cargo` (texto livre, só informativo) a cada usuário, além do perfil;
    editar usuários existentes (não só trocar o perfil por um select, como antes). Administrador
    continua com acesso total e não pode ter suas permissões alteradas (proteção contra lockout).
    Rotas agora são bloqueadas no nível de `App.tsx` (`RotaProtegida`) para quem digitar a URL de uma
    tela sem `ver` — antes só a tela de Usuários tinha essa proteção própria. Ver seção 5,
    "Autenticação e permissões", para o modelo de dados e o padrão a seguir em telas novas.
12. **Refinamentos em cima do item 11, a pedido da usuária:**
    - Permissão de tela deixou de ser um único booleano `editar` e passou a 3 campos independentes:
      `criar`, `editar`, `excluir` (mais o `ver` que já existia) — grade de permissões agora tem 4
      colunas de checkbox por tela em vez de 2. Todo o app foi revisado para gatear cada botão pelo
      verbo certo (botão "Novo X" → `podeCriar`; lápis → `podeEditar`; lixeira → `podeExcluir`) — ver
      seção 5 para o detalhe de onde isso ficou mais delicado (blocos com mais de um botão).
    - "Usuários e Permissões" virou duas telas separadas — `/usuarios` (só a tabela de usuários) e
      `/perfis` (só a tabela de perfis + grade de permissões) — cada uma com sua própria permissão
      controlável por perfil, já que são públicos diferentes.
    - `.page` (regra global em `index.css`) deixou de ter `max-width: 1200px` sem centralização, que
      deixava uma faixa enorme de espaço vazio à direita em monitores grandes (a usuária reportou
      isso mais de uma vez como "não está responsivo", em telas ≥ 1920px de largura). Agora é
      `max-width: 1800px` com `margin: 0 auto` — usa bem mais a largura disponível em monitores
      normais/grandes, só limitando em ultrawide pra não deixar linhas de texto ilegíveis.
    - Migração de dados salvos: quem já tinha perfis salvos no formato antigo (`ver`/`editar` só,
      sem `criar`/`excluir`) tem isso migrado automaticamente ao carregar — ver
      `migrarPermissaoPagina` em `DataContext.tsx`. Isso era importante porque a usuária já tinha
      usado a tela na versão anterior antes desse refinamento chegar, então já tinha dados salvos no
      formato antigo no `localStorage` do navegador dela.
13. **Unificação Eixo Temático ↔ Eixo PDLS, a pedido da usuária.** Ela apontou que o "Eixo
    Temático" (tag livre dos Aspectos de Sustentabilidade: Meio Ambiente/Governança/Social) e o
    "Eixo PDLS" (os 6 eixos fixos das Ocorrências) são o mesmo conceito e devem ter o mesmo nome em
    toda a tela. Mudanças:
    - `Indicador.categoria` (string livre) foi removido; agora `Indicador.eixoPDLSId` aponta pra
      mesma lista fixa `eixosPDLS` usada por `Ocorrencia`.
    - Todo o gerenciador de "Eixos temáticos" (botão + modal em `Indicadores.tsx`, e
      `categorias`/`addCategoria`/`removeCategoria`/`CATEGORIAS_PADRAO` no `DataContext`) foi
      **removido** — não existe mais como cadastrar uma tag livre separada.
    - Filtro e badges de Aspecto de Sustentabilidade (cards, detalhe, formulário de criar/editar)
      agora usam "Eixo PDLS" — mesmo padrão visual e de código já usado em `Ocorrencias.tsx`
      (`select` com "Todos os Eixos PDLS", badge "Eixo N").
    - **Bug incidental corrigido, achado durante essa mudança:** ocorrências cadastradas antes do
      campo `eixoPDLSId` existir apareciam com um badge quebrado "Eixo —" na listagem, porque não
      havia nenhuma migração pra dados antigos de `ocorrencias` (só `usuarios`/`perfis` tinham).
      Agora `migrarOcorrencia` (e a nova `migrarIndicador`, pro mesmo problema do lado dos Aspectos)
      cobrem isso — dados antigos sem eixo caem no Eixo 1 por padrão e podem ser reatribuídos
      normalmente editando o registro. Ver seção 5, "Domínio PDLS" e o bloco de migrações.
14. **Dashboard: cabeçalho colado no topo.** A usuária pediu pra tirar o espaço vazio acima do
    título "Monitoramento de Desempenho de Fornecedores..." em telas de desktop. Era a faixa
    superior (`.topbar`) sobrando vazia ali, porque no Dashboard o sino de notificação já mora
    dentro do próprio cabeçalho da página (mudança de uma rodada anterior). Fix: classe
    `topbar--dashboard`, aplicada só na rota do Dashboard e só em telas ≥901px, zera esse padding.
    Mobile não foi tocado (o botão de abrir o menu lateral continua com o espaço que precisa). Ver
    seção 5, "Notificações".
15. **Gerenciador de Eixos PDLS — criar, renomear e excluir, num lugar fácil de achar.** A usuária
    não estava conseguindo achar onde editar/criar os Eixos PDLS (antes só dava pra renomear um dos
    6 originais, escondido dentro do detalhe de um Aspecto de Sustentabilidade) e pediu para também
    poder criar eixos novos, não só os 6 fixos. Mudanças:
    - `eixosPDLS` deixou de ser travado em exatamente 6 itens — `DataContext` ganhou
      `addEixoPDLS(nome)` (cria com o próximo número disponível) e `removeEixoPDLS(id)` (recusa se
      o eixo estiver em uso em alguma `Ocorrencia`/`Indicador`, ou se for o único restante).
    - Botão "Eixos PDLS" (ícone bússola) nos filtros de `Indicadores.tsx` **e** de
      `Ocorrencias.tsx` (mesmo modal nas duas telas, mesmo estado do `DataContext` — editar em uma
      reflete instantaneamente na outra) abre um gerenciador com lista de badges, cada um com lápis
      (renomear inline) e lixeira (excluir, com mensagem de erro se recusado), e um campo pra
      adicionar um eixo novo no fim.
    - Migração ajustada: `migrarOcorrencia`/`migrarIndicador` agora validam contra a lista **atual**
      de eixos (que pode ter eixos customizados), não contra a lista fixa original de 6 — sem isso,
      um registro apontando pra um eixo criado pelo usuário seria tratado como "eixo inválido" e
      resetado pro Eixo 1 a cada reload. Ver seção 5, bloco de migrações, pro detalhe técnico.
16. **Tela nova "Estrutura de Sustentabilidade" — o cadastro em cascata Objeto → Aspecto → Eixo → Indicador, numa
    tela separada.** A usuária relatou que o cadastro de Eixo PDLS (item 15 acima) dentro do detalhe
    de um Aspecto de Sustentabilidade estava confuso — misturava "ver o Aspecto" com "criar o Eixo" no
    mesmo lugar. Ela descreveu o fluxo que fazia sentido pra ela: selecionar o Objeto Contratual, aí
    aparecem só os Aspectos de Sustentabilidade já cadastrados naquele objeto, aí selecionar o Aspecto
    mostra os Eixos PDLS já cadastrados pra ele, aí selecionar o Eixo mostra os Indicadores de
    Desempenho PDLS cadastrados — e que só perfis com permissão de cadastro deveriam poder criar/editar
    nessa cascata, enquanto um funcionário comum só escolhe entre o que já existe. Perguntei se isso
    devia ficar numa tela nova separada ou dentro da tela de Aspectos de Sustentabilidade — ela
    confirmou tela nova. Mudanças:
    - Nova tela `src/pages/EstruturaSustentabilidade.tsx`, rota `/estrutura-sustentabilidade`, `PaginaKey` nova `cadastroPdls`
      (renumeração completa de `PAGINAS_SISTEMA`: `cadastro`=1, `indicadores`=2, `cadastroPdls`=3,
      `ocorrencias`=4, `score`=5, `medicao`=6, `dashboard`=7, `usuarios`=8, `perfis`=9 — ver seção 5,
      "`PaginaKey` — a tela nova `cadastroPdls`"). Item novo no menu lateral (ícone `Layers`), dentro
      de "Ambiente Operacional".
    - A tela é um wizard de 4 passos, cada um só habilitado depois que o passo anterior tem uma
      seleção: (1) Objeto Contratual, (2) Aspecto de Sustentabilidade (filtrado pelo objeto do passo
      1), (3) Eixo PDLS (mostra todos, com uma marcação visual pros que já têm Indicador cadastrado
      pra esse Aspecto), (4) Indicador de Desempenho PDLS (do Aspecto+Eixo selecionados). Criar, editar
      e excluir em qualquer nível da cascata (inclusive Objetos Contratuais e Eixos PDLS) agora só
      existe aqui — respeitando `podeCriar`/`podeEditar`/`podeExcluir` de `'cadastroPdls'`.
    - `Indicadores.tsx` (tela "Aspectos de Sustentabilidade") virou **somente leitura** — só filtro,
      busca e detalhe pra consulta, sem nenhum botão de criar/editar/excluir. Ganhou um botão
      "Estrutura de Sustentabilidade →" no cabeçalho (visível só pra quem tem permissão de ver a tela nova) e, no
      detalhe de cada Aspecto, um aviso com link pra lá quando não há Eixo PDLS cadastrado ainda.
    - `Ocorrencias.tsx` perdeu o botão/modal de gerenciar Eixos PDLS que tinha sido adicionado no item
      15 — agora só consome a lista de `eixosPDLS` (filtro e formulário de nova ocorrência), com uma
      dica de texto linkando pra "Estrutura de Sustentabilidade" quando falta um eixo.
    - **Decisão de arquitetura, meu julgamento (a usuária pediu "faz o que vc acha melhor" nessa
      parte específica):** o campo `Indicador.eixoPDLSId` — um "badge" de Eixo PDLS único por Aspecto,
      que tinha sido adicionado numa rodada anterior — foi **removido de novo**. Motivo: um Aspecto já
      tem uma estrutura N:N de verdade com Eixos PDLS via `IndicadorPDLS` (`macroindicadorId` +
      `eixoId`), e ter ao mesmo tempo esse campo único E a estrutura interna de abas/indicadores era
      exatamente a mistura confusa que a usuária reportou. Agora só existe um jeito de associar Eixo
      PDLS a um Aspecto: através de `IndicadorPDLS` — os "Eixos PDLS de um Aspecto" são calculados
      (`indicadoresPDLSDe`), não armazenados num campo separado. **Se isso não for o que a usuária
      queria, é só reportar pra ajustar** — ela pode preferir voltar a ter um eixo "principal" visível
      no card do Aspecto, por exemplo.
    - Campo `IndicadorPDLS.itensTR` removido por completo — a usuária disse explicitamente que "os
      itens do TR não precisa".
    - Ver seção 5, "Domínio PDLS" (reescrita) e "`PaginaKey` — a tela nova `cadastroPdls`", pro
      detalhe técnico completo.
17. **"Cadastro PDLS" renomeada pra "Estrutura de Sustentabilidade", tela "Cadastro" renomeada pra
    "Fornecedores", e o cadastro em cascata virou um wizard de verdade (1 passo por tela).** A
    usuária achou a tela do item 16 confusa de novo — não pelo fluxo em si, mas porque (a) o nome
    "Cadastro PDLS" não fazia sentido pra uma tela que também cadastra Objeto Contratual e Aspecto de
    Sustentabilidade, não só coisas de "PDLS"; e (b) os 4 passos ficavam todos empilhados e visíveis
    na mesma tela ao mesmo tempo, o que ela achou poluído. Mudanças:
    - Renomeei o arquivo/rota/label de `CadastroPDLS.tsx` (`/cadastro-pdls`) para
      `EstruturaSustentabilidade.tsx` (`/estrutura-sustentabilidade`, label "Estrutura de
      Sustentabilidade" no menu e no botão em `Indicadores.tsx`) — ela escolheu esse nome entre
      opções que sugeri. A `PaginaKey` interna continua `cadastroPdls` (não precisa bater com o texto
      visível — só o rótulo/arquivo/rota mudaram).
    - Também renomeei a tela `Cadastro` (`Cadastro.tsx`, nav item 1) para **"Fornecedores"** — ela
      pediu isso direto, sem alternativas. Só o label mudou (no `Sidebar.tsx`, no `<h1>` da própria
      página, em `PAGINAS_SISTEMA` e num texto de aviso em `CalculoScore.tsx` que citava "cadastre um
      contrato em Cadastro"); o arquivo continua `Cadastro.tsx`, a rota continua `/cadastro` e a
      `PaginaKey` continua `cadastro` — mesma lógica do ponto acima.
    - A tela `EstruturaSustentabilidade.tsx` agora é um **wizard de verdade**: só um dos 4 passos
      fica em tela por vez (`passo`, estado `1..4`), com botões "Voltar"/"Avançar" no rodapé de cada
      passo (o "Avançar" só habilita quando o passo atual tem uma seleção válida). No lugar da antiga
      trilha/breadcrumb separada, uma barra de passos no topo (`.wizard-steps`) mostra os 4 passos com
      o que já foi selecionado em cada um (nome do objeto, do aspecto, do eixo) e permite saltar
      direto pra qualquer passo já alcançado (`maxPasso`, calculado a partir das seleções atuais).
      Se uma seleção anterior for desfeita (ex: excluiu o objeto selecionado enquanto já tinha
      avançado pro passo 3), um `useEffect` puxa `passo` de volta pro máximo ainda válido — sem isso
      dava pra ficar "preso" num passo que não faz mais sentido. CSS novo em `src/index.css`, seção
      "Estrutura de Sustentabilidade — barra de passos do wizard" (classes `.wizard-steps`,
      `.wizard-step`, `.wizard-nav`), responsivo (esconde o texto da seleção em telas estreitas,
      empilha os passos em 2 colunas e depois 1).
18. **Botão do link "sem sublinhado"; "Aspectos de Sustentabilidade" tentou lista/acordeão e voltou
    pra cards (mais compactos); alternador de perfil (Administrador/Colaborador) trocado de `<select>`
    pra um botão com ícone.** Três ajustes pedidos numa mesma rodada:
    - **Underline no botão-link.** `.btn-primary`/`.btn-secondary` não tinham `text-decoration: none`
      — como o botão "Estrutura de Sustentabilidade →" em `Indicadores.tsx` é um `<Link>` (renderiza
      uma `<a>`), ficava sublinhado por padrão do navegador. Adicionado `text-decoration: none` nas
      duas classes — vale pra qualquer botão que vier a ser um `<Link>`, não só esse.
    - **Aspectos de Sustentabilidade: cards, não lista.** No item 17 a reclamação era os cards do
      grid ficarem todos com a descrição completa expandida ao mesmo tempo; a mudança inicial trocou
      o grid por uma lista em acordeão (`.occurrence-item`, um item aberto por vez, mesmo padrão de
      `Ocorrencias.tsx`) — mas a usuária preferiu manter a aparência de **cards** (grid, como era
      antes), só que sem a descrição sempre visível. Solução final: voltou o grid (`.indicators-grid`
      / `.indicator-card`), cada card mostra só ícone + nome + badges (objeto, quantidade de Eixos
      PDLS) — **sem descrição** — e clicar abre de novo o modal de detalhe (descrição completa, Eixos
      PDLS/Indicadores de Desempenho, contratos vinculados). Não ficou lista em acordeão em lugar
      nenhum desta tela.
    - **Alternador de perfil, na Sidebar.** O `<select>` "Ver como eu mesmo" / "Ver como {perfil}" (só
      aparece pro usuário com perfil Administrador, quando existe mais de um perfil cadastrado) virou
      um botão (`.sidebar-role-toggle`, ícone `Repeat` do lucide-react) que, a cada clique, alterna pro
      próximo perfil da lista (`null` = eu mesmo → cada outro perfil em ordem → volta pro início),
      mostrando só o nome do perfil ativo (ex: "Administrador", "Colaborador") em vez de "Ver como X".
      Como o nome do perfil já aparece escrito nesse botão, a badge colorida que ficava ao lado do nome
      do usuário (`sidebar-user-badge`) só é renderizada quando o botão NÃO aparece (perfil único, ou
      usuário sem permissão de administrador) — pra não repetir a mesma informação duas vezes. Isso já
      funciona pra qualquer quantidade de perfis, não só 2 (Administrador/Colaborador) — cada clique só
      avança um perfil no ciclo.
19. **Passo 5 (opcional) na Estrutura de Sustentabilidade: "Observações" — nota livre + documento
    anexo.** A usuária pediu poder anexar um documento como observação, ou escrever alguma anotação,
    quando fosse necessário — sugeriu que fosse um "tópico 5" na tela do wizard. Mudanças:
    - `IndicadorPDLS` ganhou dois campos novos, os dois opcionais: `observacoes?: string` (texto
      livre) e `anexos?: Anexo[]` (reaproveita o mesmo tipo `Anexo` e o utilitário
      `src/utils/anexos.ts` já usados em `Contrato`/`Ocorrencia` — arquivo convertido pra Data URL,
      guardado no localStorage, limite de 4MB por arquivo e 10 arquivos). Não confundir com
      `metaAnexo` (campo mais antigo, específico do documento de referência da *meta* — continua
      existindo no tipo mas nunca teve UI própria; não é o mesmo campo).
    - Na `EstruturaSustentabilidade.tsx`, o passo 4 (Indicador de Desempenho) agora tem seleção: clicar
      num indicador da lista o marca como selecionado (mesmo padrão visual do passo 2/3 — borda verde),
      o que libera o "Avançar" pro passo 5. Criar um indicador novo já seleciona ele automaticamente
      (mesmo padrão do passo 2 ao criar um Aspecto). Indicadores que já têm observação/anexo mostram um
      ícone de clipe (`Paperclip`) ao lado do nome, na lista do passo 4, pra dar pra notar sem precisar
      abrir.
    - O passo 5 tem uma `textarea` (observação) e um upload de um ou mais arquivos (mesmo componente
      `.file-upload-box` usado em `Ocorrencias.tsx`), com um botão "Salvar observações" explícito (não
      salva a cada tecla). Ao entrar no passo 5 pra um indicador diferente, um `useEffect` recarrega o
      texto/anexos já salvos DESSE indicador — sem isso ficaria mostrando os dados do indicador
      anterior.
    - **Passo 5 é opcional de verdade**: `maxPasso` conta ele quando o indicador está selecionado, mas
      nada trava se o usuário nunca visitar esse passo — o cadastro do Indicador (passo 4) já está
      salvo antes disso.
    - `Indicadores.tsx` (modal de detalhe, só leitura) também passou a mostrar a observação e os
      anexos de cada Indicador de Desempenho, quando existirem, dentro do bloco "Eixos PDLS e
      Indicadores de Desempenho" — pra quem só consulta também conseguir ver.
20. **`Cálculo do Score`: o seletor de contrato não vem mais pré-preenchido com o primeiro
    contrato.** A usuária notou que o seletor de contrato já "puxava" um fornecedor específico
    (o primeiro da lista) assim que a tela abria, em vez de vir descrito o que aquele campo é —
    como o seletor de unidade já faz com "Todas as unidades". Mudanças em `CalculoScore.tsx`:
    - `contratoSel` agora começa vazio (`''`), e o `<select>` ganhou uma opção
      `<option value="">Selecione um contrato</option>` como primeiro item — igual ao padrão do
      seletor de unidade.
    - Sem contrato selecionado, a área de conteúdo (gauge + detalhamento) não renderiza — mostra
      uma mensagem simples "Selecione um contrato acima para ver o score calculado." no lugar.
    - Trocar a unidade só limpa a seleção se o contrato escolhido não pertencer mais à unidade
      filtrada — nunca seleciona um novo contrato automaticamente no lugar (antes, o efeito que
      corrigia isso escolhia o primeiro contrato da lista filtrada; agora só limpa, voltando pro
      placeholder). O caso de "nenhum contrato cadastrado no sistema" (mensagem antiga, sem
      seletores) continua igual — é diferente de "há contratos, mas nenhum foi escolhido ainda".
21. **Dashboard: a faixa branca do cabeçalho não ficava colada nas bordas em monitores muito
    largos.** A usuária reparou que "essa faixa branca" (o `dashboard-header`, com o título
    "Monitoramento..." + botões) tinha margens visíveis dos dois lados e pediu pra ir até o final.
    A causa: o `dashboard-header` era filho do `<div className="page">`, que tem
    `max-width: 1800px; margin: 0 auto` — em monitores largos (~2560px, ~3440px) esse `.page`
    ficava centralizado dentro do `.main-content`, deixando o fundo cinza-claro do
    `.main-content` visível nas duas laterais do cabeçalho branco (confirmado medindo com
    Playwright em 1920/2560/3440px antes de tocar no CSS — em 1920px nem aparecia, o problema só
    fica visível acima de ~2100px de largura de tela). Mudança em `Dashboard.tsx`/`index.css`:
    - O `dashboard-header` deixou de ficar dentro do `<div className="page">` — agora é um irmão
      dele, direto dentro do wrapper externo (o mesmo elemento que é o alvo da API de tela
      inteira). Isso faz o cabeçalho ocupar 100% da largura do `.main-content` sempre, porque
      esse wrapper externo não tem `max-width` nenhum — só o corpo (filtros/KPIs/gráficos/tabelas),
      que continua com a classe `page`, é que fica com a largura máxima de 1800px centralizada
      (ela nunca foi alvo da reclamação, então continua assim).
    - Removidas as margens negativas (`margin: -28px -32px 0` / `-20px -20px 0` no mobile) que o
      `.dashboard-header` usava pra "cancelar" o padding do `.page` quando estava dentro dele —
      não fazem mais sentido agora que ele é um irmão, sem padding de ancestral pra cancelar.
    - Em tela inteira, o corpo (`.page`) ganha a classe extra `dashboard-body--fullscreen`
      (`max-width: none`) pra também aproveitar a largura toda nesse modo — igual já acontecia
      antes (quem cuida do tamanho/scroll do elemento de tela inteira em si continua sendo a
      classe `page--fullscreen`, agora só no wrapper externo).
    - Validado com Playwright medindo `getBoundingClientRect()` do `.dashboard-header` e do
      `.page` em 1920/2560/3440px (desktop), 375/390px (mobile) e em tela inteira — o cabeçalho
      fecha exatamente com o `.main-content` (0px de vão) em todos os casos, e o corpo continua
      centralizado/limitado a 1800px fora da tela inteira (comportamento não afetado, só o
      cabeçalho mudou).
22. **Exportar relatório do Dashboard/Monitoramento — imagem (PNG), CSV e PDF.** A usuária pediu
    para poder tirar um relatório da tela de Monitoramento, tanto como imagem quanto com todas as
    informações organizadas em CSV e em PDF. Antes de implementar, chequei o motivo de o
    `html2canvas` já aparecer como chunk em todo build deste projeto — é uma dependência opcional
    do `jspdf` (usada internamente pelo método `.html()` dele, que este projeto nunca chamou),
    não algo já usado ativamente; e localizei o padrão de exportação já existente em
    `MedicaoPagamento.tsx` (`exportarCSV`/`exportarPDF`, com `jspdf` + `jspdf-autotable`) pra seguir
    a mesma linha em vez de inventar um jeito novo. Mudanças:
    - Um botão "Exportar relatório" novo no cabeçalho do Dashboard, ao lado de "Tela inteira",
      abre um menu simples (`.export-menu`, mesmo padrão de overlay clicável-fora do
      `.notif-overlay`) com 3 opções: "Exportar como imagem (PNG)", "Exportar dados em CSV" e
      "Exportar relatório em PDF".
    - As 3 exportações respeitam os filtros aplicados na tela no momento (Órgão/Contrato/
      Fornecedor/Período) e o modo da "Evolução do score médio" selecionado (Geral ou Por
      unidade) — exportam o que está sendo visto, não um snapshot fixo.
    - CSV e PDF são montados a partir da mesma função (`montarSecoesRelatorio` em
      `Dashboard.tsx`), que organiza tudo em seções: Filtros aplicados, Indicadores gerais (os 6
      cards de KPI), Distribuição por faixa de score, Evolução do score médio, Distribuição das
      ocorrências por Eixo PDLS, Faixas de pagamento e Fornecedores com menor score — essa última
      com a lista COMPLETA (não só os 5 primeiros que aparecem na tela antes de clicar em "Ver
      todos"). Isso garante que os dois formatos sempre saem com o mesmo conteúdo. O CSV segue o
      mesmo padrão do `MedicaoPagamento.tsx` (`;` como separador, BOM UTF-8, aspas duplas
      escapadas); o PDF usa `jspdf` + `jspdf-autotable`, uma tabela por seção, com quebra de
      página automática quando não cabe mais.
    - A imagem usa `html2canvas` (import DINÂMICO — só baixa a biblioteca quando alguém realmente
      clica em exportar imagem, em vez de pesar no carregamento inicial da tela pra todo mundo;
      sem isso o `html2canvas` viraria parte do bundle principal, e é por isso que ele já
      aparecia como chunk separado antes mesmo de eu tocar nisso). Captura o wrapper externo do
      Dashboard inteiro (título, filtros, KPIs, gráficos, tabelas — mesmo conteúdo do CSV/PDF, em
      forma visual), mas ignora os controles interativos que não são "informação" (botões
      "Exportar relatório"/"Tela inteira" e o sino de notificação) através de
      `ignoreElements` + uma classe `dashboard-export-hide` nesses elementos.
    - `html2canvas` foi adicionado como dependência explícita no `package.json` (antes só existia
      de forma implícita, puxado pelo `jspdf`) — sem isso o import direto funcionaria hoje (já
      está resolvido no `node_modules`/`package-lock.json`), mas ficaria arriscado depender de um
      efeito colateral de outra biblioteca.
    - Validado com Playwright: abri o menu, cliquei nas 3 opções e capturei os downloads reais
      (`page.on('download')`) — confirmei o conteúdo do CSV e do PDF (extraindo o texto do PDF)
      seção por seção, e abri o PNG exportado pra confirmar visualmente que os controles ficam de
      fora e o resto aparece certinho. Testado também em mobile (o menu abre e fecha bem numa
      tela de 390px) e com o perfil Colaborador (o botão aparece igual pra quem só tem acesso de
      leitura ao Dashboard — não há uma permissão separada para exportar, é a mesma permissão de
      ver a tela).
23. **A exportação de dados virou Excel (.xlsx) formatado — deixou de ser CSV puro.** A usuária
    testou o CSV do item 22 abrindo no Excel e achou "muito desorganizado" — sem negrito, sem
    cor, sem largura de coluna, tudo colado numa fonte só. Isso é uma limitação do formato CSV em
    si (texto puro, não carrega estilo nenhum) — não tinha como "arrumar" o CSV nesse sentido, então
    troquei a exportação de dados por uma planilha `.xlsx` de verdade, com formatação. Mudanças em
    `Dashboard.tsx`:
    - `exportarCSV` foi substituída por `exportarExcel`, usando a biblioteca `exceljs` (import
      dinâmico, mesmo padrão do `html2canvas` — só baixa quando alguém clica em exportar, e por
      isso vira um chunk separado no build, não engorda o carregamento inicial da tela). O botão
      no menu mudou de "Exportar dados em CSV" para "Exportar dados em Excel (XLSX)"; o arquivo
      sai com extensão `.xlsx`.
    - Continua usando a mesma `montarSecoesRelatorio()` de antes (nenhuma mudança no *conteúdo* —
      só em como ele é apresentado), então PDF e Excel sempre têm exatamente as mesmas
      informações.
    - Formatação aplicada em `exportarExcel` (cores tiradas do `:root` de `index.css`, ver
      constantes `EXCEL_COR_*` no topo do arquivo): título do relatório com fundo verde-escuro
      (`--primary`) e texto branco; uma faixa verde-média (`--accent`) com o nome de cada seção;
      cabeçalho de cada tabela com fundo verde bem clarinho (`--primary-pale`) e negrito; linhas
      de dados zebradas (`--bg` a cada 2ª linha) pra facilitar a leitura; borda fina embaixo de
      cada linha; e valores puramente numéricos (score, contagens) convertidos pra número de
      verdade — não texto — o que já alinha à direita e deixa a planilha somável/filtrável no
      Excel de verdade, em vez de tudo virar texto genérico como no CSV.
    - Validado: gerei o arquivo via Playwright de novo, li a estrutura com `openpyxl` (Python)
      pra confirmar negrito/cor/mesclagem de células, e converti pra PDF com o LibreOffice (modo
      headless) só pra conseguir *ver* visualmente o resultado numa imagem — bateu com o visual
      esperado (faixas coloridas, cabeçalho destacado, zebrado, números à direita). Rodei
      `tsc`/`build` de novo depois da troca — sem erros, e o `exceljs` aparece como chunk
      separado no build (~940kB), confirmando que o import dinâmico funcionou (não foi pro pacote
      principal).
24. **Ao salvar as Observações (passo 5), leva direto pra "Aspectos de Sustentabilidade" com o
    modal já aberto.** A usuária salvou uma observação/anexo no passo 5 da Estrutura de
    Sustentabilidade e pediu pra ser direcionada pra "Aspecto de Sustentabilidade" (a tela
    `Indicadores.tsx`) depois de salvar, pra poder ver o que acabou de registrar — antes,
    `salvarObservacoes` só mostrava um "Salvo." na própria tela do wizard, sem levar a lugar
    nenhum. Mudanças:
    - `EstruturaSustentabilidade.tsx`: depois de chamar `updateIndicadorPDLS`, se o perfil também
      tiver permissão de ver a tela `indicadores` (`podeVer('indicadores')`), navega pra
      `/indicadores` passando o id do Aspecto no `state` da navegação
      (`{ abrirAspectoId: aspectoSelecionado.id }`). Se não tiver essa permissão (caso raro, de
      perfil customizado só com acesso à Estrutura de Sustentabilidade e não a Aspectos de
      Sustentabilidade), mantém o comportamento antigo — fica na própria tela mostrando "Salvo."
    - `Indicadores.tsx`: um `useEffect` novo lê esse `abrirAspectoId` do `location.state` ao
      montar a tela, encontra o Aspecto correspondente na lista e já chama `setDetalhe(...)` —
      abrindo o modal de detalhe direto, com a observação/anexo que acabou de ser salvo já
      visível (dentro do bloco "Eixos PDLS e Indicadores de Desempenho", que já mostra
      observações desde o item 19). Em seguida, chama
      `navigate(location.pathname, { replace: true, state: null })` pra "consumir" esse estado
      uma vez só — sem isso, apertar "Voltar" no navegador depois de fechar o modal reabriria
      ele de novo (testei esse caso especificamente com Playwright pra confirmar que não
      reabre).
    - Vale só pra quem realmente salvou uma observação — navegar direto pra
      `/estrutura-sustentabilidade` (sem passar pelo botão "Salvar observações") continua sem
      redirecionar nada, é comportamento normal do wizard.
    - Validado com Playwright fazendo o fluxo completo (Objeto → Aspecto → Eixo → Indicador →
      Observações → Salvar) e confirmando que a URL final é `/indicadores`, que o modal abre
      certinho no Aspecto certo, e que o texto salvo aparece dentro dele.

## 7. Assunto aberto / não resolvido — atenção

Nenhum problema aberto conhecido no momento desta atualização. Itens antigos relatados (painel de
notificações sobrepondo conteúdo, título da Sidebar em branco em algumas telas) foram investigados a
fundo em rodadas anteriores e não reproduzidos — provavelmente cache do navegador; peça um
hard-refresh (Ctrl+Shift+R) se algo assim for relatado de novo.

## 8. Convenções gerais de código a manter

- Comentários em português, explicando *por que* uma regra existe (ex: por que contratos inativos
  são filtrados, por que um `useEffect` não pode depender de determinado array), não apenas o que o
  código faz.
- Nomes de variáveis/funções em português, consistente com o resto do código (`fornecedorNome`,
  `contratosAtivos`, `opcoesUnidade`, etc.) — identificadores internos ficam em português mesmo
  quando o termo visível na tela já foi traduzido/renomeado (ver seção 5, nomenclatura PDLS).
- Toggles de "modo de visualização" (ex: Geral/Por unidade) usam o padrão CSS já existente
  `.segmented-toggle` / `.segmented-toggle-btn` / `.segmented-toggle-btn--active` (com modificador
  `--sm` para versões compactas) — reaproveitar em vez de criar um novo padrão de toggle.
- Filtros em grupo (rótulo + select) usam `.filters-bar` / `.filter-group` / `.filter-label` /
  `.filter-select-input`, ou `.occurrence-filters` / `.filter-select-plain` nas telas mais recentes
  (ver seção 5, padrão de cascata).
- Todo botão de criar/editar/excluir novo deve ficar atrás de `{podeEditar && (...)}` — ver seção 5,
  "Autenticação".
- Sempre checar responsividade em ~375px de largura antes de considerar uma tela "pronta".
