export type ScoreFaixa = 'verde' | 'cinza' | 'preto';

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contratos: number;
  score: number;
  faixa: ScoreFaixa;
  endereco?: string;
  telefone?: string;
  preposto?: string;
  observacao?: string;
}

export interface Contrato {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  numero: string;
  ano?: string;
  objeto?: string;
  unidade?: string;
  vigencia?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  tipo?: string;
  fiscalTecnico?: string;
  fiscalAdministrativo?: string;
  fiscalSubstituto?: string;
  gestor?: string;
  gestorSubstituto?: string;
  observacao?: string;
  score: number;
  faixa: ScoreFaixa;
  pagamento: number;
  status: 'ativo' | 'inativo';
}

export interface Indicador {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  tipo: string;
  contratosVinculados: number;
  icone: string;
}

export interface Ocorrencia {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  contratoId: string;
  indicadorId: string;
  indicadorNome: string;
  categoria: string;
  descricao: string;
  data: string;
  deducao: number;
}

export interface Medicao {
  id: string;
  contratoId: string;
  periodo: string;
  score: number;
  ocorrencias: number;
  pagamento: number;
  valor: number;
  status: 'liberado' | 'pendente' | 'bloqueado';
}

export interface ScoreHistorico {
  mes: string;
  score: number;
}
