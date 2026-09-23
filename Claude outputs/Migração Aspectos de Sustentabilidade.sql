-- ════════════════════════════════════════════════════════════════════════
-- Substitui TODOS os Aspectos de Sustentabilidade atuais pelos 21 da
-- "Tabela Rayanne 2.docx" (Serviço de limpeza, Locação de veículos, Apoio
-- Administrativo). Gerado a partir do próprio arquivo — nenhuma linha,
-- meta, meio de verificação ou referência foi inventada.
--
-- COMO RODAR: Supabase → seu projeto → SQL Editor → cole tudo → Run.
-- Pode rodar mais de uma vez sem duplicar nada (os UPSERTs de eixo/objeto
-- são "on conflict", e a parte de aspectos apaga tudo antes de inserir).
-- ════════════════════════════════════════════════════════════════════════

-- 1) Garante que os 6 Eixos PDLS e os 3 tipos de objeto contratual existem
--    (não mexe nos nomes se já existirem — só cria o que faltar).
insert into eixos_pdls (id, numero, nome) values
  ('eixo1', 1, 'Racionalização do Consumo Consciente de Bens e Serviços'),
  ('eixo2', 2, 'Eixo 2 (nome a definir)'),
  ('eixo3', 3, 'Identificação dos Objetos de Menor Impacto Ambiental'),
  ('eixo4', 4, 'Eixo 4 (nome a definir)'),
  ('eixo5', 5, 'Eixo 5 (nome a definir)'),
  ('eixo6', 6, 'Divulgação, Conscientização e Capacitação acerca da Logística Sustentável')
on conflict (id) do nothing;

insert into objetos_contratuais (nome) values
  ('Serviço de limpeza'), ('Locação de veículos'), ('Apoio Administrativo')
on conflict (nome) do nothing;

-- 2) Desvincula qualquer Ocorrência de um Aspecto (os antigos vão ser
--    apagados no passo 3 — sem isto, a exclusão falharia se alguma
--    Ocorrência ainda apontar pra um Aspecto antigo).
update ocorrencias set indicador_id = null, indicador_nome = null where indicador_id is not null;

-- 3) Apaga TODOS os Aspectos de Sustentabilidade e Indicadores de
--    Desempenho PDLS atuais (indicadores_pdls primeiro, por causa da FK).
delete from indicadores_pdls;
delete from indicadores;

-- 4) Insere os 21 Aspectos de Sustentabilidade (um por linha das 3 tabelas).
insert into indicadores (id, nome, descricao, tipo, contratos_vinculados, icone) values
  ('asp1', 'Gestão de Resíduos e Coleta Seletiva', 'Destinação adequada de resíduos e manutenção de coleta seletiva pela contratada.', 'Serviço de limpeza', 0, 'recycle'),
  ('asp2', 'Uso Sustentável da Água', 'Redução do consumo de água em relação ao ano anterior.', 'Serviço de limpeza', 0, 'droplets'),
  ('asp3', 'Produtos de Menor Impacto Ambiental', 'Ampliação do uso de produtos e serviços de menor impacto ambiental no portfólio da contratada.', 'Serviço de limpeza', 0, 'leaf'),
  ('asp4', 'Eficiência dos Equipamentos Utilizados', 'Uso de equipamentos com maior eficiência energética, hídrica e acústica.', 'Serviço de limpeza', 0, 'zap'),
  ('asp5', 'Capacitação e Conscientização Ambiental', 'Capacitação das equipes sobre produtos e serviços mais sustentáveis.', 'Serviço de limpeza', 0, 'users'),
  ('asp6', 'Redução das Emissões e Consumo de Combustíveis da Frota', 'Redução da emissão de CO₂ e do consumo de combustíveis da frota.', 'Locação de veículos', 0, 'wind'),
  ('asp7', 'Eficiência Energética e Ambiental da Frota', 'Uso mais eficiente de energia e combustível pela frota veicular.', 'Locação de veículos', 0, 'zap'),
  ('asp8', 'Gestão Ambiental de Resíduos Automotivos', 'Destinação adequada de resíduos gerados pela frota de veículos.', 'Locação de veículos', 0, 'recycle'),
  ('asp9', 'Consumo Consciente de Água e Lavagem Sustentável', 'Redução do consumo de água em processos de lavagem de veículos.', 'Locação de veículos', 0, 'droplets'),
  ('asp10', 'Conformidade Socioambiental da Rede Credenciada e da Execução Contratual', 'Conformidade socioambiental da rede credenciada e da execução do contrato.', 'Locação de veículos', 0, 'leaf'),
  ('asp11', 'Capacitação e Eco-Condução', 'Capacitação dos motoristas em práticas de eco-condução.', 'Locação de veículos', 0, 'users'),
  ('asp12', 'Monitoramento da Performance e Segurança Operacional', 'Monitoramento contínuo da performance e da segurança operacional da frota.', 'Locação de veículos', 0, 'wind'),
  ('asp13', 'Uso Racional de Materiais', 'Redução da aquisição de materiais de consumo administrativo.', 'Apoio Administrativo', 0, 'leaf'),
  ('asp14', 'Redução do Consumo de Água e Energia', 'Redução do consumo de energia elétrica e água nas instalações.', 'Apoio Administrativo', 0, 'zap'),
  ('asp15', 'Gestão de Resíduos e Coleta Seletiva', 'Destinação adequada de resíduos e manutenção de coleta seletiva no apoio administrativo.', 'Apoio Administrativo', 0, 'recycle'),
  ('asp16', 'Capacitação e Conscientização em Sustentabilidade', 'Capacitação das equipes sobre produtos e serviços mais sustentáveis.', 'Apoio Administrativo', 0, 'users'),
  ('asp17', 'Saúde e Segurança do Trabalho', 'Cumprimento das exigências de saúde e segurança do trabalho.', 'Apoio Administrativo', 0, 'users'),
  ('asp18', 'Inclusão Social e Diversidade', 'Cumprimento das ações de inclusão social e diversidade previstas em decreto.', 'Apoio Administrativo', 0, 'users'),
  ('asp19', 'Combate ao Trabalho Infantil e Análogo à Escravidão', 'Prevenção e combate ao trabalho infantil e a condições análogas à escravidão.', 'Apoio Administrativo', 0, 'leaf'),
  ('asp20', 'Conformidade Legal e Ambiental', 'Cumprimento integral dos requisitos legais e ambientais aplicáveis ao contrato.', 'Apoio Administrativo', 0, 'leaf'),
  ('asp21', 'Inclusão Feminina e Equidade de Gênero', 'Cumprimento do percentual mínimo de inclusão feminina previsto em decreto.', 'Apoio Administrativo', 0, 'users');

-- 5) Insere os 21 Indicadores de Desempenho PDLS (meta, meios de
--    verificação e referência normativa/objetivo PDLS, exatamente como no
--    documento).
insert into indicadores_pdls (id, macroindicador_id, eixo_id, nome, meta, unidade_medida, meios_verificacao, referencia_normativa) values
  ('ipd1', 'asp1', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id": "mv1", "descricao": "Certificados de destinação final"}, {"id": "mv2", "descricao": "Comprovantes de coleta seletiva"}, {"id": "mv3", "descricao": "Logística reversa"}, {"id": "mv4", "descricao": "Registros da fiscalização"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('ipd2', 'asp2', 'eixo1', 'Percentual de água consumida (m³) em relação ao ano anterior', 'Redução de 5%', 'percentual', '[{"id": "mv5", "descricao": "Relatórios de consumo"}, {"id": "mv6", "descricao": "Registros operacionais"}, {"id": "mv7", "descricao": "Evidências das ações de economia de água"}]'::jsonb, 'OB03 – Promover o consumo consciente de água'),
  ('ipd3', 'asp3', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id": "mv8", "descricao": "Relação de insumos utilizados"}, {"id": "mv9", "descricao": "Fichas técnicas"}, {"id": "mv10", "descricao": "Registros da ANVISA"}, {"id": "mv11", "descricao": "Documentação dos produtos fornecidos"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('ipd4', 'asp4', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id": "mv12", "descricao": "Inventário dos equipamentos"}, {"id": "mv13", "descricao": "Fichas técnicas"}, {"id": "mv14", "descricao": "Comprovação das características de eficiência energética, hídrica e acústica"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('ipd5', 'asp5', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id": "mv15", "descricao": "Certificados"}, {"id": "mv16", "descricao": "Listas de presença"}, {"id": "mv17", "descricao": "Registros de treinamento"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  ('ipd6', 'asp6', 'eixo1', 'Percentual de redução da emissão de CO₂', 'Redução de 10%', 'percentual', '[{"id": "mv18", "descricao": "Relatórios de abastecimento"}, {"id": "mv19", "descricao": "Relatórios de emissão"}, {"id": "mv20", "descricao": "Controle de rotas"}]'::jsonb, 'OB01 – Reduzir a emissão de CO₂'),
  ('ipd7', 'asp7', 'eixo1', 'Percentual de energia elétrica consumida (kWh)', 'Redução de 5%', 'percentual', '[{"id": "mv21", "descricao": "ENCE dos veículos e pneus"}, {"id": "mv22", "descricao": "CRLV"}, {"id": "mv23", "descricao": "Fichas técnicas"}, {"id": "mv24", "descricao": "Inventário da frota"}]'::jsonb, 'OB02 – Promover o consumo consciente de energia'),
  ('ipd8', 'asp8', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id": "mv25", "descricao": "Certificados de destinação final"}, {"id": "mv26", "descricao": "Notas fiscais"}, {"id": "mv27", "descricao": "Comprovantes de recolhimento"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('ipd9', 'asp9', 'eixo1', 'Percentual de água consumida (m³)', 'Redução de 5%', 'percentual', '[{"id": "mv28", "descricao": "Relatórios operacionais"}, {"id": "mv29", "descricao": "Declaração da empresa de lavagem"}, {"id": "mv30", "descricao": "Registros de consumo"}]'::jsonb, 'OB03 – Promover o consumo consciente de água'),
  ('ipd10', 'asp10', 'eixo3', 'Percentual de serviços do portfólio com caráter sustentável', '10%', 'percentual', '[{"id": "mv31", "descricao": "Checklist da fiscalização"}, {"id": "mv32", "descricao": "Relatórios operacionais"}, {"id": "mv33", "descricao": "Documentação comprobatória"}]'::jsonb, 'OB09 – Capacitar acerca de produtos e serviços mais sustentáveis'),
  ('ipd11', 'asp11', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id": "mv34", "descricao": "Certificados"}, {"id": "mv35", "descricao": "Listas de presença"}, {"id": "mv36", "descricao": "Registros dos treinamentos"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  ('ipd12', 'asp12', 'eixo1', 'Percentual de redução da emissão de CO₂', 'Redução de 10%', 'percentual', '[{"id": "mv37", "descricao": "Sistema de monitoramento da frota"}, {"id": "mv38", "descricao": "Relatórios gerenciais"}, {"id": "mv39", "descricao": "Registros de ocorrências"}]'::jsonb, 'OB01 – Reduzir a emissão de CO₂'),
  ('ipd13', 'asp13', 'eixo1', 'Percentual de redução de aquisição de materiais de consumo', 'Redução de 5%', 'percentual', '[{"id": "mv40", "descricao": "Relatórios da contratada"}, {"id": "mv41", "descricao": "Registros de consumo"}, {"id": "mv42", "descricao": "Acompanhamento da fiscalização"}]'::jsonb, 'OB06 – Promover o uso consciente do material de consumo'),
  ('ipd14', 'asp14', 'eixo1', 'Percentual de energia elétrica consumida (kWh) e percentual de água consumida (m³)', 'Redução de 5%', 'percentual', '[{"id": "mv43", "descricao": "Relatórios de consumo"}, {"id": "mv44", "descricao": "Registros operacionais"}, {"id": "mv45", "descricao": "Ações de conscientização"}]'::jsonb, 'OB02 – Promover o consumo consciente de energia elétrica; OB03 – Promover o consumo consciente de água'),
  ('ipd15', 'asp15', 'eixo1', 'Percentual de resíduos destinados adequadamente', 'Acréscimo de 5%', 'percentual', '[{"id": "mv46", "descricao": "Registros da coleta seletiva"}, {"id": "mv47", "descricao": "Comprovantes de destinação"}, {"id": "mv48", "descricao": "Fiscalização contratual"}]'::jsonb, 'OB04 – Racionalizar a gestão de resíduos'),
  ('ipd16', 'asp16', 'eixo6', 'Quantidade total de capacitações oferecidas sobre produtos e serviços sustentáveis', '2 capacitações', 'quantidade', '[{"id": "mv49", "descricao": "Certificados"}, {"id": "mv50", "descricao": "Listas de presença"}, {"id": "mv51", "descricao": "Registros de treinamento"}]'::jsonb, 'OB13 – Fomentar a capacitação e conscientização na temática da sustentabilidade'),
  ('ipd17', 'asp17', null, 'Cumprimento das exigências de SST', '100% de atendimento', 'conformidade', '[{"id": "mv52", "descricao": "Comprovantes de treinamentos"}, {"id": "mv53", "descricao": "EPIs"}, {"id": "mv54", "descricao": "Documentação trabalhista"}]'::jsonb, 'Requisito contratual do TR'),
  ('ipd18', 'asp18', null, 'Cumprimento das ações de inclusão previstas no Decreto nº 11.430/2023', '100% de atendimento', 'conformidade', '[{"id": "mv55", "descricao": "Declarações semestrais"}, {"id": "mv56", "descricao": "Documentação comprobatória"}]'::jsonb, 'Decreto nº 11.430/2023'),
  ('ipd19', 'asp19', null, 'Quantidade de ocorrências de descumprimento', 'Zero ocorrência', 'quantidade', '[{"id": "mv57", "descricao": "Declarações da contratada"}, {"id": "mv58", "descricao": "Fiscalização contratual"}]'::jsonb, 'Lei nº 14.133/2021'),
  ('ipd20', 'asp20', null, 'Percentual de requisitos legais atendidos', '100% de conformidade', 'percentual', '[{"id": "mv59", "descricao": "Certidões"}, {"id": "mv60", "descricao": "Declarações"}, {"id": "mv61", "descricao": "Documentação trabalhista e ambiental"}]'::jsonb, 'Lei nº 14.133/2021'),
  ('ipd21', 'asp21', null, 'Apresentação da Declaração de Cumprimento do Percentual Mínimo previsto no Decreto nº 11.430/2023', '100% de atendimento', 'conformidade', '[{"id": "mv62", "descricao": "Declaração semestral emitida pela Secretaria da Mulher"}]'::jsonb, 'Decreto nº 11.430/2023');
