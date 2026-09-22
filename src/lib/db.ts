/**
 * Camada de acesso ao Supabase — conversa com as tabelas descritas em
 * `supabase/schema.sql` e converte entre o formato das colunas (snake_case,
 * convenção do Postgres) e os tipos do app (camelCase, `src/types/index.ts`).
 *
 * Só o `DataContext` deveria importar este arquivo — nenhuma tela chama isto
 * diretamente, exatamente como nenhuma tela lia `localStorage` diretamente
 * antes.
 */
import { supabase } from './supabaseClient';
import type {
  Contrato, EixoPDLS, Fornecedor, Indicador, IndicadorPDLS,
  Medicao, Ocorrencia, Perfil, ScoreHistorico, Usuario,
} from '../types';

// ── snake_case <-> camelCase genérico ───────────────────────────────────────
// Os valores de colunas jsonb (anexos, historico, meiosVerificacao, permissoes
// etc.) já guardam o objeto TS inteiro como está — só as colunas de "primeiro
// nível" de cada tabela precisam dessa conversão de nome.

/** Nomes que a conversão automática (baseada em maiúsculas) não acerta, por
 * causa da sigla "PDLS" no meio do nome. */
const EXCECOES_CAMEL_PARA_SNAKE: Record<string, string> = {
  eixoPDLSId: 'eixo_pdls_id',
};
const EXCECOES_SNAKE_PARA_CAMEL: Record<string, string> = {
  eixo_pdls_id: 'eixoPDLSId',
};

function camelParaSnake(campo: string): string {
  if (EXCECOES_CAMEL_PARA_SNAKE[campo]) return EXCECOES_CAMEL_PARA_SNAKE[campo];
  return campo.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function snakeParaCamel(campo: string): string {
  if (EXCECOES_SNAKE_PARA_CAMEL[campo]) return EXCECOES_SNAKE_PARA_CAMEL[campo];
  return campo.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Linha do Supabase -> objeto do app. Colunas nulas viram ausentes (`undefined`),
 * igual aos campos opcionais dos tipos em `types/index.ts`. */
function linhaParaObjeto<T>(linha: Record<string, unknown>): T {
  const objeto: Record<string, unknown> = {};
  for (const [coluna, valor] of Object.entries(linha)) {
    if (valor === null) continue;
    objeto[snakeParaCamel(coluna)] = valor;
  }
  return objeto as T;
}

/** Objeto do app (ou um patch parcial) -> linha para enviar ao Supabase. */
function objetoParaLinha(objeto: object): Record<string, unknown> {
  const linha: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(objeto)) {
    if (valor === undefined) continue;
    linha[camelParaSnake(campo)] = valor;
  }
  return linha;
}

function relatarErro(acao: string, error: { message: string } | null): void {
  if (error) throw new Error(`${acao}: ${error.message}`);
}

/** Fábrica de operações CRUD para uma tabela com chave primária `id` (texto),
 * que é o caso de quase todas as tabelas do sistema. */
function crud<T extends object>(tabela: string) {
  return {
    async listar(ordenarPor?: string): Promise<T[]> {
      let query = supabase.from(tabela).select('*');
      if (ordenarPor) query = query.order(ordenarPor);
      const { data, error } = await query;
      relatarErro(`Carregar ${tabela}`, error);
      return (data ?? []).map((linha) => linhaParaObjeto<T>(linha));
    },
    async inserir(item: T): Promise<void> {
      const { error } = await supabase.from(tabela).insert(objetoParaLinha(item));
      relatarErro(`Criar em ${tabela}`, error);
    },
    async atualizar(id: string, patch: Partial<T>): Promise<void> {
      const { error } = await supabase.from(tabela).update(objetoParaLinha(patch)).eq('id', id);
      relatarErro(`Atualizar ${tabela}`, error);
    },
    async remover(id: string): Promise<void> {
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      relatarErro(`Excluir de ${tabela}`, error);
    },
  };
}

export const dbFornecedores = crud<Fornecedor>('fornecedores');
export const dbContratos = {
  ...crud<Contrato>('contratos'),
  /** Atualiza em lote o nome do fornecedor denormalizado em todos os contratos
   * dele — mantém `contratos.fornecedor_nome` sincronizado quando o fornecedor
   * é renomeado (ver `updateFornecedor` em `DataContext.tsx`). */
  async atualizarNomeFornecedor(fornecedorId: string, nome: string): Promise<void> {
    const { error } = await supabase.from('contratos').update({ fornecedor_nome: nome }).eq('fornecedor_id', fornecedorId);
    relatarErro('Sincronizar nome do fornecedor nos contratos', error);
  },
};
export const dbIndicadores = crud<Indicador>('indicadores');
export const dbEixosPDLS = crud<EixoPDLS>('eixos_pdls');
export const dbIndicadoresPDLS = crud<IndicadorPDLS>('indicadores_pdls');
export const dbOcorrencias = crud<Ocorrencia>('ocorrencias');
export const dbMedicoes = crud<Medicao>('medicoes');
export const dbUsuarios = crud<Usuario>('usuarios');
export const dbPerfis = crud<Perfil>('perfis');

// ── Exceções que não seguem o padrão "chave primária `id`" ──────────────────

export const dbObjetosContratuais = {
  async listar(): Promise<string[]> {
    const { data, error } = await supabase.from('objetos_contratuais').select('nome').order('nome');
    relatarErro('Carregar objetos_contratuais', error);
    return (data ?? []).map((linha: { nome: string }) => linha.nome);
  },
  async inserir(nome: string): Promise<void> {
    const { error } = await supabase.from('objetos_contratuais').insert({ nome });
    relatarErro('Criar objeto contratual', error);
  },
  async remover(nome: string): Promise<void> {
    const { error } = await supabase.from('objetos_contratuais').delete().eq('nome', nome);
    relatarErro('Excluir objeto contratual', error);
  },
};

export const dbScoreHistorico = {
  async listar(): Promise<ScoreHistorico[]> {
    const { data, error } = await supabase.from('score_historico').select('mes, score').order('ordem');
    relatarErro('Carregar score_historico', error);
    return (data ?? []) as ScoreHistorico[];
  },
};

export const dbNotificacoesLidas = {
  async listar(): Promise<string[]> {
    const { data, error } = await supabase.from('notificacoes_lidas').select('id');
    relatarErro('Carregar notificacoes_lidas', error);
    return (data ?? []).map((linha: { id: string }) => linha.id);
  },
  async marcar(id: string): Promise<void> {
    const { error } = await supabase.from('notificacoes_lidas').upsert({ id });
    relatarErro('Marcar notificação como lida', error);
  },
  async marcarVarias(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await supabase.from('notificacoes_lidas').upsert(ids.map((id) => ({ id })));
    relatarErro('Marcar notificações como lidas', error);
  },
};
