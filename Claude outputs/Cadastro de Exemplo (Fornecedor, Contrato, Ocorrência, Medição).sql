-- ════════════════════════════════════════════════════════════════════════
-- Cadastro de exemplo pra você navegar pelas telas de Fornecedor, Contrato,
-- Ocorrências e Medição/Pagamento com dado real (não fictício "de sistema",
-- mas obviamente de demonstração — pode editar/excluir à vontade depois).
--
-- Cria: 1 fornecedor, 1 contrato (Serviço de limpeza), 1 ocorrência (ligada
-- ao Aspecto "Gestão de Resíduos e Coleta Seletiva") e 2 medições mensais
-- (pra "Medição e Pagamento" já mostrar um histórico, não só um mês solto).
--
-- COMO RODAR: Supabase → SQL Editor → cola tudo → Run.
-- Seguro rodar de novo (tudo com "on conflict do update").
-- ════════════════════════════════════════════════════════════════════════

insert into fornecedores (id, nome, cnpj, contratos, score, faixa, endereco, telefone, preposto, observacao) values
  ('demo-forn-1', 'EcoLimpa Serviços Gerais Ltda', '12.345.678/0001-90', 1, 475, 'verde',
   'SIA Trecho 3, Lote 625, Brasília - DF', '(61) 3345-2200', 'Marcos Andrade Silva', null)
on conflict (id) do update set
  nome = excluded.nome, cnpj = excluded.cnpj, contratos = excluded.contratos, score = excluded.score,
  faixa = excluded.faixa, endereco = excluded.endereco, telefone = excluded.telefone, preposto = excluded.preposto;

insert into contratos (
  id, fornecedor_id, fornecedor_nome, numero, ano, objeto, unidade, vigencia, vigencia_inicio, vigencia_fim,
  tipo, fiscal_tecnico, fiscal_administrativo, gestor, score, faixa, pagamento, status
) values (
  'demo-ctr-1', 'demo-forn-1', 'EcoLimpa Serviços Gerais Ltda', '045/2026', '2026',
  'Prestação de serviços continuados de limpeza, conservação e higienização predial',
  'Secretaria de Administração', '2027-01-14', '2026-01-15', '2027-01-14',
  'Serviço de limpeza', 'Juliana Ramos Ferreira', 'Carlos Eduardo Matos', 'Patrícia Nogueira Lima',
  475, 'verde', 100, 'ativo'
)
on conflict (id) do update set
  numero = excluded.numero, objeto = excluded.objeto, unidade = excluded.unidade, vigencia = excluded.vigencia,
  vigencia_inicio = excluded.vigencia_inicio, vigencia_fim = excluded.vigencia_fim, tipo = excluded.tipo,
  fiscal_tecnico = excluded.fiscal_tecnico, fiscal_administrativo = excluded.fiscal_administrativo,
  gestor = excluded.gestor, score = excluded.score, faixa = excluded.faixa, pagamento = excluded.pagamento,
  status = excluded.status;

insert into ocorrencias (
  id, fornecedor_id, fornecedor_nome, contrato_id, indicador_id, indicador_nome, eixo_pdls_id,
  descricao, data, deducao, tipo_registro, registrado_por
) values (
  'demo-ocor-1', 'demo-forn-1', 'EcoLimpa Serviços Gerais Ltda', 'demo-ctr-1', 'asp1',
  'Gestão de Resíduos e Coleta Seletiva', 'eixo1',
  'Fiscalização constatou acondicionamento incorreto dos resíduos recicláveis no pavimento térreo, sem separação por tipo de material.',
  '2026-08-14', 25, 'ocorrencia', 'Administrador SustentaScore'
)
on conflict (id) do update set
  descricao = excluded.descricao, data = excluded.data, deducao = excluded.deducao,
  indicador_id = excluded.indicador_id, indicador_nome = excluded.indicador_nome, eixo_pdls_id = excluded.eixo_pdls_id;

insert into medicoes (id, contrato_id, periodo, score, ocorrencias, pagamento, valor, status) values
  ('demo-med-1', 'demo-ctr-1', 'jul/26', 500, 0, 100, 18500, 'liberado'),
  ('demo-med-2', 'demo-ctr-1', 'ago/26', 475, 1, 100, 18500, 'pendente')
on conflict (id) do update set
  score = excluded.score, ocorrencias = excluded.ocorrencias, pagamento = excluded.pagamento,
  valor = excluded.valor, status = excluded.status;
