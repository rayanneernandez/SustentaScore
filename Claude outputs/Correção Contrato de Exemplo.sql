-- ════════════════════════════════════════════════════════════════════════
-- Correção do contrato de exemplo (demo-ctr-1): eu tinha invertido os
-- campos "Objeto" e "Tipo" no SQL anterior.
--
-- "Objeto" é a categoria que liga o contrato aos Aspectos de Sustentabilidade
-- (Serviço de limpeza / Locação de veículos / Apoio Administrativo) — é o
-- campo que a tela usa pra achar "Contratos vinculados" de um Aspecto.
-- "Tipo" é outra coisa: Contrato Original / Aditivo / Apostilamento.
--
-- Só rode isto SE você já rodou o SQL anterior (Cadastro de Exemplo). Se
-- ainda não rodou aquele, ignore este arquivo — o outro já vai sair certo
-- na próxima vez que eu gerar (ou me avise que eu reenvio corrigido).
-- ════════════════════════════════════════════════════════════════════════

update contratos set
  objeto = 'Serviço de limpeza',
  tipo = 'Contrato Original',
  observacao = coalesce(nullif(observacao, ''), 'Prestação de serviços continuados de limpeza, conservação e higienização predial')
where id = 'demo-ctr-1';
