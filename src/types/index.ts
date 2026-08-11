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

export type HistoricoTipo =
  | 'criacao'
  | 'edicao'
  | 'status'
  | 'prorrogacao'
  | 'anexo'
  | 'observacao';

export interface HistoricoEvento {
  id: string;
  data: string; // ISO datetime
  tipo: HistoricoTipo;
  descricao: string;
}

export interface Anexo {
  id: string;
  /** Nome original do arquivo */
  nome: string;
  /** URL (data URL local) do arquivo */
  url: string;
  /** Tipo MIME do arquivo */
  tipo: string;
  /** Data/hora em que o anexo foi enviado */
  dataUpload: string;
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
  /** Arquivos do contrato assinado/ativo anexados (pode ter mais de um) */
  anexos?: Anexo[];
  /** Quantos dias antes do vencimento o alerta de renovação deve aparecer (padrão 60) */
  alertaDiasAntes?: number;
  /** Linha do tempo completa do contrato: criação, edições, prorrogações, anexos, status */
  historico?: HistoricoEvento[];
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

/**
 * Um registro pode ser uma ocorrência de fato (com dedução de pontos) ou um
 * treinamento/orientação aplicado ao local — sem dedução, apenas informativo,
 * geralmente acompanhado de um link ou material anexado.
 */
export type TipoRegistroOcorrencia = 'ocorrencia' | 'treinamento';

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
  /** 'ocorrencia' (padrão, com dedução) ou 'treinamento' (sem dedução, apenas orientação/material). */
  tipoRegistro?: TipoRegistroOcorrencia;
  /** Fiscal responsável pelo registro (quem constatou/relatou). */
  registradoPor?: string;
  /** Link de referência — ex: material de treinamento, norma, procedimento. */
  link?: string;
  /** Arquivos anexados ao registro — ex: certificado de participação, material do treinamento. */
  anexos?: Anexo[];
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

/**
 * Notificação genérica do sistema. Hoje só existem notificações de vigência de
 * contrato, mas o modelo é propositalmente aberto para outras origens no
 * futuro (ocorrências, quedas de score, medições pendentes, etc.) — `tipo`
 * identifica a origem e `link` para onde a notificação deve levar o usuário.
 */
export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  urgencia: 'alta' | 'media' | 'baixa';
  link?: string;
  lida: boolean;
}
