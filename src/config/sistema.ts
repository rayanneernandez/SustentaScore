import type { Perfil, PaginaKey } from '../types';

/**
 * Toda tela do sistema que pode ter acesso controlado por perfil, na ordem em
 * que aparece no menu lateral — fonte única usada pelo `Sidebar`, pelas rotas
 * protegidas (`App.tsx`) e pela grade de permissões em Usuários e Permissões.
 *
 * Isto é estrutura fixa do sistema (não é "dado" cadastrado por ninguém), por
 * isso continua em código — só o que é de fato informação (fornecedores,
 * contratos, usuários, perfis etc.) foi movido para o banco de dados
 * (Supabase). Ver `src/lib/supabaseClient.ts` e `src/context/DataContext.tsx`.
 */
export const PAGINAS_SISTEMA: { key: PaginaKey; label: string; num: number }[] = [
  { key: 'cadastro', label: 'Fornecedores', num: 1 },
  { key: 'indicadores', label: 'Aspectos de Sustentabilidade', num: 2 },
  { key: 'cadastroPdls', label: 'Estrutura de Sustentabilidade', num: 3 },
  { key: 'ocorrencias', label: 'Registro de Ocorrências', num: 4 },
  { key: 'score', label: 'Cálculo do Score', num: 5 },
  { key: 'medicao', label: 'Medição e Pagamento', num: 6 },
  { key: 'dashboard', label: 'Monitoramento e Painel Gerencial', num: 7 },
  { key: 'usuarios', label: 'Usuários', num: 8 },
  { key: 'perfis', label: 'Perfis de Acesso', num: 9 },
];

/**
 * Unidades Administrativas permitidas no cadastro de contrato (Fornecedores →
 * Novo Contrato) — lista fechada, a pedido da Vanessa (gestora do contrato): só as
 * 6 Superintendências de Administração regionais. Estrutura fixa do sistema, por
 * isso fica em código (mesmo raciocínio de `PAGINAS_SISTEMA`, acima).
 */
export const UNIDADES_ADMINISTRATIVAS: string[] = [
  'Superintendência de Administração da 1ª Região (SAD1R)',
  'Superintendência de Administração da 2ª Região (SAD2R)',
  'Superintendência de Administração da 3ª Região (SAD3R)',
  'Superintendência de Administração da 4ª Região (SAD4R)',
  'Superintendência de Administração da 5ª Região (SAD5R)',
  'Superintendência de Administração da 6ª Região (SAD6R)',
];

/**
 * Telas que ficam sob "Administração" no menu, ou que ficam de fora do acesso
 * padrão do perfil Colaborador (`PERFIS_PADRAO`, abaixo) — são as telas de
 * configuração/estrutura, não do dia a dia operacional.
 */
export const PAGINAS_ADMINISTRACAO: PaginaKey[] = ['cadastroPdls', 'usuarios', 'perfis'];

export const permissoesTotais = (valor: boolean): Perfil['permissoes'] =>
  PAGINAS_SISTEMA.reduce(
    (acc, p) => ({ ...acc, [p.key]: { ver: valor, criar: valor, editar: valor, excluir: valor } }),
    {} as Perfil['permissoes'],
  );

/** Ids fixos dos dois perfis padrão — usados pelo DataContext para nunca deixar o sistema sem um caminho de acesso total. */
export const PERFIL_ADMIN_ID = 'perfil-administrador';
export const PERFIL_COLABORADOR_ID = 'perfil-colaborador';

/**
 * Perfis de acesso padrão do sistema — usados como REDE DE SEGURANÇA pelo
 * `DataContext` (função `garantirPerfisPadrao`): se por qualquer motivo o
 * banco vier sem esses dois perfis (banco novo ainda sem seed, linha
 * apagada por engano etc.), o app garante que eles existam mesmo assim, para
 * nunca ficar sem nenhum caminho de acesso ao sistema. Os valores aqui devem
 * ser os MESMOS inseridos pelo `supabase/schema.sql` na tabela `perfis`.
 */
export const PERFIS_PADRAO: Perfil[] = [
  { id: PERFIL_ADMIN_ID, nome: 'Administrador', padrao: true, permissoes: permissoesTotais(true) },
  {
    id: PERFIL_COLABORADOR_ID,
    nome: 'Colaborador',
    padrao: true,
    permissoes: PAGINAS_SISTEMA.reduce(
      (acc, p) => ({
        ...acc,
        [p.key]: { ver: !PAGINAS_ADMINISTRACAO.includes(p.key), criar: false, editar: false, excluir: false },
      }),
      {} as Perfil['permissoes'],
    ),
  },
];
