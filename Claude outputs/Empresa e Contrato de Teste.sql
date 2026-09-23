-- ════════════════════════════════════════════════════════════════════════
-- Empresa de teste + contrato de teste + histórico de 2 meses (agosto e
-- setembro/2026), pra você ver as telas de Fornecedor, Registro de
-- Ocorrências, Cálculo do Score e Medição e Pagamento com dado de exemplo
-- (edite ou exclua depois à vontade).
--
-- Cria: 1 fornecedor ("Empresa Teste Ltda"), 1 contrato vinculado a ela
-- (Objeto = "Serviço de limpeza", Status = "Ativo" — já aparece automático
-- em "Contratos vinculados" nos Aspectos desse objeto), 4 ocorrências (1 em
-- setembro, 3 em agosto — dedução padrão de 25 pontos cada, igual o valor
-- que já vem pré-preenchido na tela de Nova Ocorrência) e 2 medições:
--   • ago/26: 3 ocorrências → 500 - 75 = 425 pontos (faixa 350-449, 95%)
--   • set/26: 1 ocorrência  → 500 - 25 = 475 pontos (faixa 450-500, 100%)
-- Score atual do contrato/fornecedor fica no mês mais recente (set/26: 475).
-- Status das medições como "liberado" (não fica marcado como pendente).
--
-- Se você já rodou uma versão anterior deste arquivo, pode rodar este por
-- cima sem problema — está tudo com "on conflict do update", é seguro
-- rodar de novo.
--
-- COMO RODAR: Supabase → SQL Editor → cola tudo → Run.
-- ════════════════════════════════════════════════════════════════════════

insert into fornecedores (id, nome, cnpj, contratos, score, faixa, endereco, telefone, preposto, observacao) values
  ('teste-forn-1', 'Empresa Teste Ltda', '00.000.000/0001-00', 1, 475, 'verde',
   'Endereço de teste, 123, Brasília - DF', '(61) 0000-0000', 'Fulano de Tal', 'Registro de teste — pode editar ou excluir.')
on conflict (id) do update set
  nome = excluded.nome, cnpj = excluded.cnpj, contratos = excluded.contratos, score = excluded.score,
  faixa = excluded.faixa, endereco = excluded.endereco, telefone = excluded.telefone, preposto = excluded.preposto,
  observacao = excluded.observacao;

insert into contratos (
  id, fornecedor_id, fornecedor_nome, numero, ano, objeto, unidade, vigencia, vigencia_inicio, vigencia_fim,
  tipo, fiscal_tecnico, fiscal_administrativo, gestor, observacao, score, faixa, pagamento, status
) values (
  'teste-ctr-1', 'teste-forn-1', 'Empresa Teste Ltda', '000/2026', '2026',
  'Serviço de limpeza',
  'Unidade de Teste', '2027-09-22', '2026-09-22', '2027-09-22',
  'Contrato Original', 'Fiscal Técnico de Teste', 'Fiscal Administrativo de Teste', 'Gestor de Teste',
  'Contrato de teste — pode editar ou excluir.',
  475, 'verde', 100, 'ativo'
)
on conflict (id) do update set
  fornecedor_nome = excluded.fornecedor_nome, numero = excluded.numero, ano = excluded.ano,
  objeto = excluded.objeto, unidade = excluded.unidade, vigencia = excluded.vigencia,
  vigencia_inicio = excluded.vigencia_inicio, vigencia_fim = excluded.vigencia_fim, tipo = excluded.tipo,
  fiscal_tecnico = excluded.fiscal_tecnico, fiscal_administrativo = excluded.fiscal_administrativo,
  gestor = excluded.gestor, observacao = excluded.observacao, score = excluded.score, faixa = excluded.faixa,
  pagamento = excluded.pagamento, status = excluded.status;

-- Ocorrências de agosto/2026 (3 — derrubam o score do mês pra faixa 350-449)
insert into ocorrencias (
  id, fornecedor_id, fornecedor_nome, contrato_id, indicador_id, indicador_nome, eixo_pdls_id,
  descricao, data, deducao, tipo_registro, registrado_por
) values
  ('teste-ocor-1', 'teste-forn-1', 'Empresa Teste Ltda', 'teste-ctr-1', 'asp1',
   'Gestão de Resíduos e Coleta Seletiva', 'eixo1',
   'Fiscalização constatou acondicionamento incorreto dos resíduos recicláveis, sem separação por tipo de material.',
   '2026-08-05', 25, 'ocorrencia', 'Administrador SustentaScore'),
  ('teste-ocor-2', 'teste-forn-1', 'Empresa Teste Ltda', 'teste-ctr-1', 'asp3',
   'Produtos de Menor Impacto Ambiental', 'eixo3',
   'Uso de produtos de limpeza fora do portfólio de menor impacto ambiental previsto em contrato.',
   '2026-08-14', 25, 'ocorrencia', 'Administrador SustentaScore'),
  ('teste-ocor-3', 'teste-forn-1', 'Empresa Teste Ltda', 'teste-ctr-1', 'asp4',
   'Eficiência dos Equipamentos Utilizados', 'eixo3',
   'Equipamentos em uso sem comprovação de eficiência energética e acústica exigida.',
   '2026-08-22', 25, 'ocorrencia', 'Administrador SustentaScore'),
  ('teste-ocor-4', 'teste-forn-1', 'Empresa Teste Ltda', 'teste-ctr-1', 'asp2',
   'Uso Sustentável da Água', 'eixo1',
   'Fiscalização constatou consumo de água acima do esperado no período, sem evidência das ações de economia previstas.',
   '2026-09-22', 25, 'ocorrencia', 'Administrador SustentaScore')
on conflict (id) do update set
  descricao = excluded.descricao, data = excluded.data, deducao = excluded.deducao,
  indicador_id = excluded.indicador_id, indicador_nome = excluded.indicador_nome, eixo_pdls_id = excluded.eixo_pdls_id;

insert into medicoes (id, contrato_id, periodo, score, ocorrencias, pagamento, valor, status) values
  ('teste-med-ago', 'teste-ctr-1', 'ago/26', 425, 3, 95, 14250, 'liberado'),
  ('teste-med-1',   'teste-ctr-1', 'set/26', 475, 1, 100, 15000, 'liberado')
on conflict (id) do update set
  score = excluded.score, ocorrencias = excluded.ocorrencias, pagamento = excluded.pagamento,
  valor = excluded.valor, status = excluded.status;
