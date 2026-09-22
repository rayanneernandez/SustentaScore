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
  /**
   * ATENÇÃO: este tipo já teve um campo `eixoPDLSId` único (uma "badge" de Eixo PDLS
   * por Aspecto). Foi removido de novo — a usuária achou confuso ter um Eixo PDLS
   * "principal" do Aspecto E, ao mesmo tempo, vários Eixos PDLS internos (com seus
   * Indicadores de Desempenho, ver `IndicadorPDLS`) para o mesmo Aspecto. Agora só
   * existe UM jeito de associar Eixo PDLS a um Aspecto: através de `IndicadorPDLS`
   * (`macroindicadorId` + `eixoId`) — os "Eixos PDLS deste Aspecto" são simplesmente
   * os eixos que têm pelo menos um Indicador de Desempenho cadastrado para ele
   * (ver `indicadoresPDLSDe` no `DataContext`). Esse cadastro é feito na tela
   * `Estrutura de Sustentabilidade` (`EstruturaSustentabilidade.tsx`), não mais dentro do detalhe do Aspecto em
   * `Indicadores.tsx` (que agora só exibe, em modo leitura).
   */
  tipo: string;
  contratosVinculados: number;
  icone: string;
}

/**
 * Um dos 6 Eixos temáticos do PDLS (Plano de Desenvolvimento Local Sustentável).
 * Um mesmo Eixo pode servir a vários Macroindicadores diferentes — a ligação de fato
 * entre Macroindicador e Eixo é feita através de cada `IndicadorPDLS` (que carrega os
 * dois ids), não por um campo fixo no Macroindicador.
 */
export interface EixoPDLS {
  id: string;
  numero: number;
  nome: string;
}

/** Um meio de verificação usado pela fiscalização para comprovar o atendimento de uma meta. */
export interface MeioVerificacao {
  id: string;
  descricao: string;
}

export type UnidadeMedidaPDLS = 'percentual' | 'quantidade' | 'conformidade' | 'outro';

/**
 * Indicador de Desempenho do PDLS — a "subcategoria" que aparece dentro de um Eixo,
 * para um Macroindicador específico. Guarda a meta (ainda sujeita a definição mais
 * precisa pelo órgão), a unidade de medida e os meios de verificação que a
 * fiscalização usa para comprovar o cumprimento.
 */
export interface IndicadorPDLS {
  id: string;
  macroindicadorId: string;
  /**
   * Opcional: algumas exigências contratuais/legais (ex: Saúde e Segurança do
   * Trabalho, Combate ao Trabalho Infantil) não têm vinculação com nenhum dos 6
   * Eixos PDLS — o próprio documento de origem já as marca como "Não possui
   * vinculação direta ao PDLS". Fica `undefined` nesse caso, em vez de forçar
   * um Eixo qualquer. Ver `indicadoresPDLSDe(macroindicadorId, null)` no
   * `DataContext` e o passo 3 de `EstruturaSustentabilidade.tsx`.
   */
  eixoId?: string;
  nome: string;
  /** Meta de referência (PDLS) — texto livre; a metodologia exata ainda pode ser definida pelo órgão. */
  meta?: string;
  /** Documento de referência da meta, quando houver. */
  metaAnexo?: Anexo;
  unidadeMedida: UnidadeMedidaPDLS;
  meiosVerificacao: MeioVerificacao[];
  /** Referência normativa / Objetivo do PDLS (ex: "OB04 – Racionalizar a gestão de resíduos"). */
  referenciaNormativa?: string;
  /**
   * Observações e documentos de apoio (passo 5, opcional, de `EstruturaSustentabilidade.tsx`) —
   * anotação livre e/ou arquivo anexado quando for útil registrar algo a mais sobre este
   * Indicador de Desempenho (ex: uma justificativa, um documento de apoio que não é
   * exatamente um "meio de verificação"). Não confundir com `metaAnexo`, que é especificamente
   * o documento de referência da meta.
   */
  observacoes?: string;
  anexos?: Anexo[];
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
  /** Opcional: o formulário de cadastro pede um Aspecto de Sustentabilidade, mas
   * registros de seed/migração podem ficar sem essa ligação (ex: quando o
   * Aspecto de exemplo que a ocorrência citava foi removido). A tela já trata
   * ausência normalmente (`indicadorNome || '—'`). */
  indicadorId?: string;
  indicadorNome?: string;
  /** Eixo PDLS (1 a 6) ao qual esta ocorrência está atrelada. */
  eixoPDLSId: string;
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

/**
 * Cada tela/seção do sistema que pode ter acesso controlado por perfil. Usada
 * tanto para montar o menu lateral (esconder o que o perfil não pode ver) quanto
 * para a grade de permissões na tela de Usuários e Permissões.
 */
export type PaginaKey =
  | 'dashboard'
  | 'cadastro'
  | 'indicadores'
  | 'cadastroPdls'
  | 'ocorrencias'
  | 'score'
  | 'medicao'
  | 'usuarios'
  | 'perfis';

/**
 * Permissão de um perfil sobre uma tela específica. `criar`, `editar` e
 * `excluir` são independentes entre si — um perfil pode, por exemplo, criar e
 * editar ocorrências mas não excluir nenhuma.
 */
export interface PermissaoPagina {
  /** Pode ver/acessar a tela. Sem isso, a tela nem aparece no menu, e as outras 3 permissões não têm efeito. */
  ver: boolean;
  /** Pode criar novos registros na tela (ex: novo fornecedor, nova ocorrência, novo usuário). */
  criar: boolean;
  /** Pode editar registros já existentes na tela. */
  editar: boolean;
  /** Pode excluir registros na tela. */
  excluir: boolean;
}

/**
 * Perfil de acesso — substitui o antigo modelo fixo de 'administrador' | 'colaborador'.
 * Além dos dois perfis padrão (que sempre existem), qualquer novo perfil pode ser
 * criado com sua própria combinação de telas/permissões, atribuída em
 * `permissoes` (uma entrada por `PaginaKey`).
 */
export interface Perfil {
  id: string;
  nome: string;
  /**
   * Perfis padrão do sistema (Administrador e Colaborador) — não podem ser
   * excluídos, pra sempre existir pelo menos um caminho de acesso total e um de
   * só-leitura. O perfil Administrador padrão também não tem suas permissões
   * editáveis (sempre acesso total), pra evitar que alguém se tranque fora do
   * próprio sistema.
   */
  padrao?: boolean;
  permissoes: Record<PaginaKey, PermissaoPagina>;
}

/**
 * Usuário do sistema. ATENÇÃO: este é um protótipo de frontend sem backend — o
 * login aqui é só local (compara com esta lista guardada no navegador) e a senha
 * fica em texto simples. Não é seguro para produção; existe só para simular o
 * controle de acesso até haver um banco de dados de verdade por trás.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  /** Cargo/função do usuário na organização (ex: "Fiscal de Contrato") — só informativo. */
  cargo?: string;
  /** Id do `Perfil` que define o que este usuário pode ver e editar. */
  perfilId: string;
}
