-- Zera os dados de TESTE antes da fase de testes de verdade (22/10/2026).
-- Apaga: ocorrências, medições, contratos, fornecedores e as marcações de "notificação lida".
-- NÃO mexe em: perfis, usuários, objetos contratuais, eixos PDLS, aspectos de sustentabilidade,
-- indicadores PDLS (a estrutura que a Vanessa definiu) nem na curva-base do gráfico (score_historico).
-- Operação IRREVERSÍVEL. Rode primeiro o SELECT de conferência (comentado no fim) se quiser ver o que será apagado.

begin;

delete from notificacoes_lidas;
delete from ocorrencias;
delete from medicoes;
delete from contratos;      -- (também apagaria ocorrências/medições ligadas, por cascade)
delete from fornecedores;

commit;

-- Conferência (deve dar 0 em tudo e manter as contagens da estrutura):
-- select 'fornecedores' t, count(*) from fornecedores union all
-- select 'contratos', count(*) from contratos union all
-- select 'ocorrencias', count(*) from ocorrencias union all
-- select 'medicoes', count(*) from medicoes union all
-- select 'usuarios (mantido)', count(*) from usuarios union all
-- select 'indicadores (mantido)', count(*) from indicadores;
