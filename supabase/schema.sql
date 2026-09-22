-- ============================================================================
-- SustentaScore — esquema do banco de dados (Supabase / Postgres)
-- ============================================================================
-- Substitui os dados mockados (src/data/mockData.ts, agora renomeado para
-- src/config/sistema.ts, que só guarda estrutura fixa do sistema) por tabelas
-- reais. Cole este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new) e clique em "Run".
--
-- O script é seguro para rodar mais de uma vez (usa "IF NOT EXISTS" e
-- "ON CONFLICT DO NOTHING" no seed) — se algo falhar no meio, pode rodar tudo
-- de novo sem duplicar nada.
--
-- Estrutura do arquivo:
--   1) Tabelas (nesta ordem, por causa das dependências entre elas)
--   2) RLS (Row Level Security) com política aberta — ver aviso importante abaixo
--   3) Dados iniciais (seed) — SÓ estrutura fixa e dados reais (2 perfis de
--      acesso, 2 logins de teste, os 3 objetos contratuais e toda a estrutura
--      PDLS — Eixos/Aspectos/Indicadores de Desempenho — das 3 tabelas que
--      você mandou). NENHUM fornecedor, contrato, ocorrência ou medição de
--      exemplo é criado — você cadastra os seus reais pela própria tela.
--
-- ⚠️ SOBRE SEGURANÇA: este app é uma SPA (React) sem servidor próprio — ele
-- fala direto com o Supabase usando a "anon key" (chave pública, é normal ela
-- ir para o navegador). Para os dados não ficarem totalmente bloqueados, este
-- script libera leitura/escrita para essa chave em todas as tabelas — ou
-- seja, HOJE A SEGURANÇA CONTINUA SENDO SÓ NA TELA (quem pode ver/criar/
-- editar/excluir cada tela), exatamente como já era antes com o localStorage.
-- Isso é adequado para um protótipo/uso interno, mas não é seguro se o app for
-- publicado abertamente na internet para qualquer pessoa. Quando fizer
-- sentido, o próximo passo é trocar o login local por Supabase Auth e
-- restringir as políticas de RLS por usuário autenticado — posso te ajudar
-- com isso quando quiser.
-- ============================================================================

-- ── 1) TABELAS ──────────────────────────────────────────────────────────────

create table if not exists perfis (
  id text primary key,
  nome text not null,
  padrao boolean not null default false,
  permissoes jsonb not null default '{}'::jsonb
);

create table if not exists usuarios (
  id text primary key,
  nome text not null,
  email text not null unique,
  senha text not null,
  cargo text,
  perfil_id text not null references perfis(id)
);

create table if not exists objetos_contratuais (
  nome text primary key
);

create table if not exists fornecedores (
  id text primary key,
  nome text not null,
  cnpj text not null,
  contratos integer not null default 0,
  score integer not null default 0,
  faixa text not null default 'verde',
  endereco text,
  telefone text,
  preposto text,
  observacao text
);

create table if not exists contratos (
  id text primary key,
  fornecedor_id text not null references fornecedores(id) on delete cascade,
  fornecedor_nome text not null,
  numero text not null,
  ano text,
  objeto text,
  unidade text,
  vigencia text,
  vigencia_inicio text,
  vigencia_fim text,
  tipo text,
  fiscal_tecnico text,
  fiscal_administrativo text,
  fiscal_substituto text,
  gestor text,
  gestor_substituto text,
  observacao text,
  score integer not null default 500,
  faixa text not null default 'verde',
  pagamento integer not null default 100,
  status text not null default 'ativo',
  anexos jsonb default '[]'::jsonb,
  alerta_dias_antes integer default 60,
  historico jsonb default '[]'::jsonb
);

create table if not exists eixos_pdls (
  id text primary key,
  numero integer not null,
  nome text not null
);

-- "Indicador" no código = Aspecto de Sustentabilidade (nome mudou na tela, o
-- tipo TypeScript manteve o nome antigo — ver comentário em src/types/index.ts).
create table if not exists indicadores (
  id text primary key,
  nome text not null,
  descricao text,
  tipo text,
  contratos_vinculados integer not null default 0,
  icone text not null default 'leaf'
);

-- eixo_id é opcional: algumas exigências contratuais/legais (Tabela 3 da
-- usuária — Saúde e Segurança do Trabalho, Combate ao Trabalho Infantil, etc.)
-- não têm vinculação com nenhum dos 6 Eixos PDLS, o próprio documento de
-- origem já as marca assim ("Não possui vinculação direta ao PDLS"). Ver
-- comentário em `IndicadorPDLS`, types/index.ts.
create table if not exists indicadores_pdls (
  id text primary key,
  macroindicador_id text not null references indicadores(id) on delete cascade,
  eixo_id text references eixos_pdls(id),
  nome text not null,
  meta text,
  meta_anexo jsonb,
  unidade_medida text not null default 'percentual',
  meios_verificacao jsonb not null default '[]'::jsonb,
  referencia_normativa text,
  observacoes text,
  anexos jsonb default '[]'::jsonb
);
-- Se a tabela já existia de uma versão anterior deste script (com eixo_id
-- not null), este ALTER a destrava — seguro rodar de novo, é um no-op se já
-- estiver nullable.
alter table if exists indicadores_pdls alter column eixo_id drop not null;

create table if not exists ocorrencias (
  id text primary key,
  fornecedor_id text not null references fornecedores(id) on delete cascade,
  fornecedor_nome text not null,
  contrato_id text not null references contratos(id) on delete cascade,
  indicador_id text references indicadores(id),
  indicador_nome text,
  eixo_pdls_id text not null references eixos_pdls(id),
  descricao text not null,
  data text not null,
  deducao integer not null default 0,
  tipo_registro text not null default 'ocorrencia',
  registrado_por text,
  link text,
  anexos jsonb default '[]'::jsonb
);

create table if not exists medicoes (
  id text primary key,
  contrato_id text not null references contratos(id) on delete cascade,
  periodo text not null,
  score integer not null,
  ocorrencias integer not null default 0,
  pagamento integer not null,
  valor numeric not null default 0,
  status text not null default 'pendente'
);

-- Curva-base usada só para desenhar o formato do gráfico "Evolução do score
-- médio" do Painel Gerencial (o Dashboard desloca essa curva pela diferença
-- entre a média real de cada contexto e a média global — ver Dashboard.tsx).
create table if not exists score_historico (
  mes text primary key,
  score integer not null,
  ordem integer not null
);

-- Ids de notificações (geradas dinamicamente a partir da vigência dos
-- contratos) que o usuário já marcou como lida.
create table if not exists notificacoes_lidas (
  id text primary key,
  lida_em timestamptz not null default now()
);

-- ── 2) RLS — política aberta (ver aviso de segurança no topo do arquivo) ───

alter table perfis enable row level security;
alter table usuarios enable row level security;
alter table objetos_contratuais enable row level security;
alter table fornecedores enable row level security;
alter table contratos enable row level security;
alter table eixos_pdls enable row level security;
alter table indicadores enable row level security;
alter table indicadores_pdls enable row level security;
alter table ocorrencias enable row level security;
alter table medicoes enable row level security;
alter table score_historico enable row level security;
alter table notificacoes_lidas enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'perfis','usuarios','objetos_contratuais','fornecedores','contratos',
    'eixos_pdls','indicadores','indicadores_pdls','ocorrencias','medicoes',
    'score_historico','notificacoes_lidas'
  ]
  loop
    execute format('drop policy if exists "acesso_total_anon" on %I;', tabela);
    execute format(
      'create policy "acesso_total_anon" on %I for all to anon, authenticated using (true) with check (true);',
      tabela
    );
  end loop;
end $$;

-- ── 3) DADOS INICIAIS (seed) ────────────────────────────────────────────────
-- Estrutura fixa (perfis de acesso, logins de teste) e a estrutura PDLS real
-- das suas 3 tabelas — nada de fornecedor/contrato/ocorrência/medição de
-- exemplo. Pode editar/excluir qualquer coisa daqui depois direto pelas telas
-- do sistema.

insert into perfis (id, nome, padrao, permissoes) values
  ('perfil-administrador', 'Administrador', true, '{
    "cadastro": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "indicadores": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "cadastroPdls": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "ocorrencias": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "score": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "medicao": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "dashboard": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "usuarios": {"ver": true, "criar": true, "editar": true, "excluir": true},
    "perfis": {"ver": true, "criar": true, "editar": true, "excluir": true}
  }'::jsonb),
  ('perfil-colaborador', 'Colaborador', true, '{
    "cadastro": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "indicadores": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "cadastroPdls": {"ver": false, "criar": false, "editar": false, "excluir": false},
    "ocorrencias": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "score": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "medicao": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "dashboard": {"ver": true, "criar": false, "editar": false, "excluir": false},
    "usuarios": {"ver": false, "criar": false, "editar": false, "excluir": false},
    "perfis": {"ver": false, "criar": false, "editar": false, "excluir": false}
  }'::jsonb)
on conflict (id) do nothing;

insert into usuarios (id, nome, email, senha, cargo, perfil_id) values
  ('u1', 'Administrador SustentaScore', 'admin@sustentascore.gov.br', 'admin123', 'Administrador do Sistema', 'perfil-administrador'),
  ('u2', 'Fiscal Colaborador', 'colaborador@sustentascore.gov.br', 'colab123', 'Fiscal de Contrato', 'perfil-colaborador')
on conflict (id) do nothing;

-- Só os 3 objetos contratuais que aparecem nas suas 3 tabelas. Você pode
-- cadastrar outros pela própria tela (Estrutura de Sustentabilidade, passo 1)
-- quando precisar — isto aqui é só o ponto de partida.
insert into objetos_contratuais (nome) values
  ('Serviço de limpeza'), ('Locação de veículos'), ('Apoio Administrativo')
on conflict (nome) do nothing;

-- Nenhum fornecedor, contrato, ocorrência ou medição de exemplo é inserido —
-- você cadastra os seus pela própria tela. Se uma versão anterior deste
-- script já tinha inserido os de exemplo (f1–f8, ct1–ct9, o1–o5, m1–m8) no seu
-- Supabase, isto limpa: apagar os fornecedores já apaga em cascata os
-- contratos, ocorrências e medições ligados a eles (`on delete cascade`).
delete from fornecedores where id in ('f1','f2','f3','f4','f5','f6','f7','f8');
delete from objetos_contratuais where nome in ('Vigilância orgânica', 'Serviços administrativos', 'Construção', 'Geral');

-- Eixos 1, 3 e 6 usam o nome oficial das tabelas de sustentabilidade da usuária
-- (ver "Tabela Rayanne 1.docx" — Serviço de Limpeza / Locação de Veículo / Apoio
-- Administrativo). Eixos 2, 4 e 5 continuam "a definir" — não apareceram em
-- nenhuma linha das 3 tabelas recebidas. Não existe um "Eixo 7" nem nenhum
-- outro eixo inventado: os Aspectos que o documento marca como "Não possui
-- vinculação direta ao PDLS" (Tabela 3) ficam com `eixo_id` NULL em
-- indicadores_pdls, em vez de apontar pra um eixo que o documento não afirma
-- (ver comentário acima, na criação da tabela `indicadores_pdls`).
insert into eixos_pdls (id, numero, nome) values
  ('eixo1', 1, 'Racionalização do Consumo Consciente de Bens e Serviços'),
  ('eixo2', 2, 'Eixo 2 (nome a definir)'),
  ('eixo3', 3, 'Identificação dos Objetos de Menor Impacto Ambiental'),
  ('eixo4', 4, 'Eixo 4 (nome a definir)'),
  ('eixo5', 5, 'Eixo 5 (nome a definir)'),
  ('eixo6', 6, 'Divulgação, Conscientização e Capacitação acerca da Logística Sustentável')
on conflict (id) do update set nome = excluded.nome, numero = excluded.numero;
-- Se a versão anterior deste script já tinha criado um Eixo 7 inventado no seu
-- banco, isto remove — sem isso a exclusão ficaria só na próxima execução do
-- script, nunca de fato no seu Supabase.
delete from indicadores_pdls where eixo_id = 'eixo7';
delete from eixos_pdls where id = 'eixo7';

-- Se a versão anterior deste script já tinha inserido i1–i6 (Aspectos de
-- exemplo genéricos, sem relação com as 3 tabelas da usuária) no seu Supabase,
-- isto limpa: desvincula as ocorrências de exemplo deles (mesmo valor que o
-- insert de `ocorrencias` mais abaixo já usa) e remove os 6 Aspectos.
update ocorrencias set indicador_id = null, indicador_nome = null where indicador_id in ('i1','i2','i3','i4','i5','i6');
delete from indicadores where id in ('i1','i2','i3','i4','i5','i6');

-- Aspectos de Sustentabilidade (`Indicador`, nome do tipo TS — ver comentário em
-- types/index.ts) — só o que está nas 3 tabelas que a usuária mandou
-- ("Tabela Rayanne 1.docx"), um Aspecto por linha. i7–i12 já vinham certos de
-- uma rodada anterior (conferi contra o documento — o texto bate). i13–i27 são
-- novos nesta rodada, cobrindo TODAS as linhas que faltavam das 3 tabelas.
insert into indicadores (id, nome, descricao, tipo, contratos_vinculados, icone) values
  -- Tabela 1 — Serviço de limpeza
  ('i7', 'Gestão de Resíduos e Coleta Seletiva', 'Destinação adequada de resíduos e manutenção de coleta seletiva pela contratada.', 'Serviço de limpeza', 0, 'recycle'),
  ('i8', 'Uso Sustentável da Água', 'Redução do consumo de água em relação ao ano anterior.', 'Serviço de limpeza', 0, 'droplets'),
  ('i13', 'Produtos de Menor Impacto Ambiental', 'Ampliação do uso de produtos e serviços de menor impacto ambiental no portfólio da contratada.', 'Serviço de limpeza', 0, 'leaf'),
  ('i14', 'Eficiência dos Equipamentos Utilizados', 'Uso de equipamentos com maior eficiência energética, hídrica e acústica.', 'Serviço de limpeza', 0, 'zap'),
  ('i15', 'Capacitação e Conscientização Ambiental', 'Capacitação das equipes sobre produtos e serviços mais sustentáveis.', 'Serviço de limpeza', 0, 'users'),
  -- Tabela 2 — Locação de veículos
  ('i16', 'Redução das Emissões e Consumo de Combustíveis da Frota', 'Redução da emissão de CO₂ e do consumo de combustíveis da frota.', 'Locação de veículos', 0, 'wind'),
  ('i17', 'Eficiência Energética e Ambiental da Frota', 'Uso mais eficiente de energia e combustível pela frota veicular.', 'Locação de veículos', 0, 'zap'),
  ('i11', 'Gestão Ambiental de Resíduos Automotivos', 'Destinação adequada de resíduos gerados pela frota de veículos.', 'Locação de veículos', 0, 'recycle'),
  ('i12', 'Consumo Consciente de Água e Lavagem Sustentável', 'Redução do consumo de água em processos de lavagem de veículos.', 'Locação de veículos', 0, 'droplets'),
  ('i18', 'Conformidade Socioambiental da Rede Credenciada e da Execução Contratual', 'Conformidade socioambiental da rede credenciada e da execução do contrato.', 'Locação de veículos', 0, 'leaf'),
  ('i19', 'Capacitação e Eco-Condução', 'Capacitação dos motoristas em práticas de eco-condução.', 'Locação de veículos', 0, 'users'),
  ('i20', 'Monitoramento da Performance e Segurança Operacional', 'Monitoramento contínuo da performance e da segurança operacional da frota.', 'Locação de veículos', 0, 'wind'),
  -- Tabela 3 — Apoio Administrativo
  ('i9', 'Uso Racional de Materiais', 'Redução da aquisição de materiais de consumo administrativo.', 'Apoio Administrativo', 0, 'leaf'),
  ('i10', 'Redução do Consumo de Água e Energia', 'Redução do consumo de energia elétrica e água nas instalações.', 'Apoio Administrativo', 0, 'zap'),
  ('i21', 'Gestão de Resíduos e Coleta Seletiva', 'Destinação adequada de resíduos e manutenção de coleta seletiva no apoio administrativo.', 'Apoio Administrativo', 0, 'recycle'),
  ('i22', 'Capacitação e Conscientização em Sustentabilidade', 'Capacitação das equipes sobre produtos e serviços mais sustentáveis.', 'Apoio Administrativo', 0, 'users'),
  ('i23', 'Saúde e Segurança do Trabalho', 'Cumprimento das exigências de saúde e segurança do trabalho.', 'Apoio Administrativo', 0, 'users'),
  ('i24', 'Inclusão Social e Diversidade', 'Cumprimento das ações de inclusão social e diversidade previstas em decreto.', 'Apoio Administrativo', 0, 'users'),
  ('i25', 'Combate ao Trabalho Infantil e Análogo à Escravidão', 'Prevenção e combate ao trabalho infantil e a condições análogas à escravidão.', 'Apoio Administrativo', 0, 'leaf'),
  ('i26', 'Conformidade Legal e Ambiental', 'Cumprimento integral dos requisitos legais e ambientais aplicáveis ao contrato.', 'Apoio Administrativo', 0, 'leaf'),
  ('i27', 'Inclusão Feminina e Equidade de Gênero', 'Cumprimento do percentual mínimo de inclusão feminina previsto em decreto.', 'Apoio Administrativo', 0, 'users')
on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao, tipo = excluded.tipo, icone = excluded.icone;

-- Indicadores de Desempenho PDLS — um por linha das 3 tabelas (meta, meio de
-- verificação e referência normativa/objetivo PDLS exatamente como no
-- documento). pdls1–pdls6 já vinham certos; pdls7–pdls21 são novos.
insert into indicadores_pdls (id, macroindicador_id, eixo_id, nome, meta, unidade_medida, meios_verificacao, referencia_normativa) values
  -- Tabela 1 — Serviço de limpeza
  ('pdls1', 'i7', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id":"mv1","descricao":"Certificados de destinação final"},{"id":"mv2","descricao":"Comprovantes de coleta seletiva"},{"id":"mv3","descricao":"Logística reversa e registros da fiscalização"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('pdls2', 'i8', 'eixo1', 'Percentual de água consumida (m³) em relação ao ano anterior', 'Redução de 5%', 'percentual', '[{"id":"mv4","descricao":"Relatórios de consumo"},{"id":"mv5","descricao":"Registros operacionais e evidências das ações de economia de água"}]'::jsonb, 'OB03 – Promover o consumo consciente de água'),
  ('pdls7', 'i13', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id":"mv14","descricao":"Relação de insumos utilizados"},{"id":"mv15","descricao":"Fichas técnicas"},{"id":"mv16","descricao":"Registros da ANVISA"},{"id":"mv17","descricao":"Documentação dos produtos fornecidos"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('pdls8', 'i14', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id":"mv18","descricao":"Inventário dos equipamentos"},{"id":"mv19","descricao":"Fichas técnicas"},{"id":"mv20","descricao":"Comprovação das características de eficiência energética, hídrica e acústica"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('pdls9', 'i15', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id":"mv21","descricao":"Certificados"},{"id":"mv22","descricao":"Listas de presença"},{"id":"mv23","descricao":"Registros de treinamento"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  -- Tabela 2 — Locação de veículos
  ('pdls10', 'i16', 'eixo1', 'Percentual de redução da emissão de CO₂', 'Redução de 10%', 'percentual', '[{"id":"mv24","descricao":"Relatórios de abastecimento"},{"id":"mv25","descricao":"Relatórios de emissão"},{"id":"mv26","descricao":"Controle de rotas"}]'::jsonb, 'OB01 – Reduzir a emissão de CO₂'),
  ('pdls11', 'i17', 'eixo1', 'Percentual de energia elétrica consumida (kWh)', 'Redução de 5%', 'percentual', '[{"id":"mv27","descricao":"ENCE dos veículos e pneus"},{"id":"mv28","descricao":"CRLV"},{"id":"mv29","descricao":"Fichas técnicas"},{"id":"mv30","descricao":"Inventário da frota"}]'::jsonb, 'OB02 – Promover o consumo consciente de energia'),
  ('pdls5', 'i11', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id":"mv10","descricao":"Certificados de destinação final, notas fiscais e comprovantes de recolhimento"},{"id":"mv11","descricao":"Fichas técnicas e inventário da frota"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('pdls6', 'i12', 'eixo1', 'Percentual de água consumida (m³)', 'Redução de 5%', 'percentual', '[{"id":"mv12","descricao":"Relatórios operacionais"},{"id":"mv13","descricao":"Declaração da empresa de lavagem"}]'::jsonb, 'OB03 – Promover o consumo consciente de água'),
  ('pdls12', 'i18', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id":"mv31","descricao":"Checklist da fiscalização"},{"id":"mv32","descricao":"Relatórios operacionais"},{"id":"mv33","descricao":"Documentação comprobatória"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('pdls13', 'i19', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id":"mv34","descricao":"Certificados"},{"id":"mv35","descricao":"Listas de presença"},{"id":"mv36","descricao":"Registros dos treinamentos"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  ('pdls14', 'i20', 'eixo1', 'Percentual de redução da emissão de CO₂', 'Redução de 10%', 'percentual', '[{"id":"mv37","descricao":"Sistema de monitoramento da frota"},{"id":"mv38","descricao":"Relatórios gerenciais"},{"id":"mv39","descricao":"Registros de ocorrências"}]'::jsonb, 'OB01 – Reduzir a emissão de CO₂'),
  -- Tabela 3 — Apoio Administrativo
  ('pdls3', 'i9', 'eixo1', 'Percentual de redução de aquisição de materiais de consumo', 'Redução de 5%', 'percentual', '[{"id":"mv6","descricao":"Relatórios da contratada"},{"id":"mv7","descricao":"Registros de consumo e acompanhamento da fiscalização"}]'::jsonb, 'OB06 – Promover o uso consciente do material de consumo'),
  ('pdls4', 'i10', 'eixo1', 'Percentual de energia elétrica consumida (kWh) e percentual de água consumida (m³)', 'Redução de 5%', 'percentual', '[{"id":"mv8","descricao":"Relatórios de consumo"},{"id":"mv9","descricao":"Registros operacionais e ações de conscientização"}]'::jsonb, 'OB02 – Promover o consumo consciente de energia elétrica; OB03 – Promover o consumo consciente de água'),
  ('pdls15', 'i21', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id":"mv40","descricao":"Registros da coleta seletiva"},{"id":"mv41","descricao":"Comprovantes de destinação"},{"id":"mv42","descricao":"Fiscalização contratual"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('pdls16', 'i22', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id":"mv43","descricao":"Certificados"},{"id":"mv44","descricao":"Listas de presença"},{"id":"mv45","descricao":"Registros de treinamento"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  ('pdls17', 'i23', null, 'Cumprimento das exigências de SST', '100% de atendimento', 'conformidade', '[{"id":"mv46","descricao":"Comprovantes de treinamentos"},{"id":"mv47","descricao":"EPIs"},{"id":"mv48","descricao":"Documentação trabalhista"}]'::jsonb, 'Requisito contratual do TR'),
  ('pdls18', 'i24', null, 'Cumprimento das ações de inclusão previstas no Decreto nº 11.430/2023', '100% de atendimento', 'conformidade', '[{"id":"mv49","descricao":"Declarações semestrais"},{"id":"mv50","descricao":"Documentação comprobatória"}]'::jsonb, 'Decreto nº 11.430/2023'),
  ('pdls19', 'i25', null, 'Quantidade de ocorrências de descumprimento', 'Zero ocorrência', 'quantidade', '[{"id":"mv51","descricao":"Declarações da contratada"},{"id":"mv52","descricao":"Fiscalização contratual"}]'::jsonb, 'Lei nº 14.133/2021'),
  ('pdls20', 'i26', null, 'Percentual de requisitos legais atendidos', '100% de conformidade', 'percentual', '[{"id":"mv53","descricao":"Certidões"},{"id":"mv54","descricao":"Declarações"},{"id":"mv55","descricao":"Documentação trabalhista e ambiental"}]'::jsonb, 'Lei nº 14.133/2021'),
  ('pdls21', 'i27', null, 'Apresentação da Declaração de Cumprimento do Percentual Mínimo previsto no Decreto nº 11.430/2023', '100% de atendimento', 'conformidade', '[{"id":"mv56","descricao":"Declaração semestral emitida pela Secretaria da Mulher"}]'::jsonb, 'Decreto nº 11.430/2023')
on conflict (id) do update set
  macroindicador_id = excluded.macroindicador_id,
  eixo_id = excluded.eixo_id,
  nome = excluded.nome,
  meta = excluded.meta,
  unidade_medida = excluded.unidade_medida,
  meios_verificacao = excluded.meios_verificacao,
  referencia_normativa = excluded.referencia_normativa;

-- Nenhuma ocorrência, medição ou ponto de "evolução do score" de exemplo é
-- inserido — mesmo raciocínio de fornecedores/contratos acima. O gráfico
-- "Evolução do score médio" do Painel Gerencial fica vazio até você ter
-- medições reais; `score_historico` é só a curva-base que dá o formato desse
-- gráfico (ver comentário na criação da tabela) — pode ser adicionada depois,
-- pela própria tela ou voltando a preencher este arquivo, se/quando fizer
-- sentido pra você.
