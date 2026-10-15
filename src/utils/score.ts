import type { Medicao, Ocorrencia, ScoreFaixa } from '../types';

/**
 * Pontuação com que todo contrato começa cada mês — pedido explícito da
 * usuária: o score NÃO é cumulativo entre meses, ele reinicia em 500 toda vez
 * que o mês vira, e as Ocorrências registradas naquele mês vão descontando a
 * partir daí. Mesma fórmula que já aparecia (só visualmente, sem ser calculada
 * de verdade) em "Cálculo do Score" ("Pontuação inicial do mês: 500").
 */
export const SCORE_INICIAL_MES = 500;

/**
 * Pagamento mínimo da NF (% do valor da NF da Unidade) — pedido da Vanessa
 * (gestora do contrato): o Score pode cair abaixo de 350 (Zona Preta, que também
 * prevê sanções), mas a trava no pagamento da Nota Fiscal ao fornecedor NUNCA fica
 * abaixo de 90%. Conferido contra a tabela do Indicador Nº 03 (Faixas de ajuste no
 * pagamento): 5 a 4,5 → 100%; 4,5 a 3,5 → 95%; menor que 3,5 → 90% (todas
 * multiplicadas por 100 no sistema, daí 500 / 450 / 350).
 */
export const PAGAMENTO_MINIMO_NF = 90;

/** Abaixo desta pontuação o contrato está na Zona Preta (pagamento travado no mínimo + sanções). */
export const SCORE_ZONA_PRETA = 350;

/** Faixas de pontuação e o respectivo percentual de liberação do pagamento da
 * NF — os mesmos limites já usados em Cálculo do Score e Medição e Pagamento. */
export function faixaDoScore(score: number): ScoreFaixa {
  if (score >= 450) return 'verde';
  if (score >= 350) return 'cinza';
  return 'preto';
}

export function pagamentoDaFaixa(faixa: ScoreFaixa): number {
  if (faixa === 'verde') return 100;
  if (faixa === 'cinza') return 95;
  return PAGAMENTO_MINIMO_NF;
}

/** Percentual do pagamento da NF a aplicar pra um score — já com a trava de
 * {@link PAGAMENTO_MINIMO_NF} (nunca devolve menos que isso, qualquer que seja o score). */
export function pagamentoDoScore(score: number): number {
  return Math.max(PAGAMENTO_MINIMO_NF, pagamentoDaFaixa(faixaDoScore(score)));
}

export interface ValorAPagar {
  /** % do valor da NF a pagar (100 / 95 / 90), já com a trava de mínimo de 90%. */
  percentual: number;
  /** Valor da NF × percentual — o que deve ser pago ao fornecedor. */
  valorAPagar: number;
  /** Quanto fica de fora do pagamento (valor da NF − valor a pagar). */
  desconto: number;
}

/**
 * Valor a pagar de uma NF a partir do valor nominal informado pelo gestor e do score do mês,
 * seguindo as faixas de pagamento do Indicador Nº 03 (ver {@link pagamentoDoScore}). Arredonda
 * pra centavo. Ex: NF de R$ 10.000 com score 400 (faixa 95%) → paga R$ 9.500, desconto R$ 500.
 */
export function calcularValorAPagar(valorNF: number, score: number): ValorAPagar {
  const percentual = pagamentoDoScore(score);
  const valorAPagar = Math.round(valorNF * percentual) / 100;
  const desconto = Math.round((valorNF - valorAPagar) * 100) / 100;
  return { percentual, valorAPagar, desconto };
}

/**
 * Média de scores pra exibição (KPI e gráfico de evolução). Com mais de um
 * contrato a média é arredondada pro múltiplo de 5 mais próximo — a Vanessa
 * observou que, seguindo a matemática do score (descontos de 25 pontos), os
 * valores exibidos só podem terminar em 0 ou 5; uma média de 475 e 500 daria 487,5.
 * Com um contrato só, devolve o score dele como está.
 */
export function mediaDeScores(valores: number[]): number {
  if (valores.length === 0) return 0;
  if (valores.length === 1) return valores[0];
  const media = valores.reduce((soma, v) => soma + v, 0) / valores.length;
  return Math.max(0, Math.min(SCORE_INICIAL_MES, Math.round(media / 5) * 5));
}

/** Transforma "ago/26" em um número comparável (ano*12+mês), pra ordenar períodos
 * cronologicamente — comparar as strings direto não funciona ("jan/27" < "dez/26"). */
export function periodoParaChave(periodo: string): number {
  const [mesStr, anoStr] = periodo.toLowerCase().split('/');
  const mes = Math.max(0, MESES_ABREV_ORDEM.indexOf(mesStr));
  const ano = Number(anoStr);
  return (Number.isFinite(ano) ? ano : 0) * 12 + mes;
}

/** Períodos ("mmm/aa") que têm Medição registrada pra algum dos contratos, em ordem cronológica. */
export function periodosComMedicao(medicoes: Medicao[], contratoIds: Set<string>): string[] {
  const periodos = new Set<string>();
  for (const m of medicoes) if (contratoIds.has(m.contratoId)) periodos.add(m.periodo);
  return [...periodos].sort((a, b) => periodoParaChave(a) - periodoParaChave(b));
}

/** Score médio (ver {@link mediaDeScores}) dos contratos informados num período, a partir
 * das Medições reais — `null` se nenhum deles tem Medição naquele mês. */
export function scoreMedioDoPeriodo(medicoes: Medicao[], contratoIds: Set<string>, periodo: string): number | null {
  const valores = medicoes.filter((m) => m.periodo === periodo && contratoIds.has(m.contratoId)).map((m) => m.score);
  return valores.length ? mediaDeScores(valores) : null;
}

/** "YYYY-MM" do mês corrente (horário local do navegador) — usado pra filtrar
 * quais Ocorrências contam pro score do mês em andamento. */
export function anoMesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

const MESES_ABREV_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "mmm/aa" do mês corrente (ex: "ago/26") — mesmo formato já usado em todo o
 * histórico de Medições (Cálculo do Score, Medição e Pagamento, Histórico de
 * Score no cadastro do contrato). */
export function rotuloMesAtual(): string {
  const agora = new Date();
  return `${MESES_ABREV_ORDEM[agora.getMonth()]}/${String(agora.getFullYear()).slice(-2)}`;
}

export interface ScoreMesAtual {
  score: number;
  faixa: ScoreFaixa;
  pagamento: number;
  ocorrenciasQtd: number;
  deducaoTotal: number;
}

/**
 * Calcula o score do mês corrente de um contrato a partir das Ocorrências já
 * registradas pra ele: soma a dedução de cada Ocorrência do tipo 'ocorrencia'
 * (ou sem `tipoRegistro` nenhum, caso de registros antigos/seed) com `data`
 * dentro do mês atual — registros do tipo 'treinamento' nunca descontam (ver
 * o seletor "Tipo de registro" em `Ocorrencias.tsx`). O resultado nunca passa
 * de 500 nem fica negativo.
 */
export function calcularScoreMesAtual(contratoId: string, ocorrencias: Ocorrencia[]): ScoreMesAtual {
  const mesAtual = anoMesAtual();
  const doMesComDesconto = ocorrencias.filter(
    (o) => o.contratoId === contratoId && o.tipoRegistro !== 'treinamento' && o.data.startsWith(mesAtual),
  );
  const deducaoTotal = doMesComDesconto.reduce((soma, o) => soma + (o.deducao || 0), 0);
  const score = Math.max(0, Math.min(SCORE_INICIAL_MES, SCORE_INICIAL_MES - deducaoTotal));
  const faixa = faixaDoScore(score);
  const pagamento = pagamentoDaFaixa(faixa);
  return { score, faixa, pagamento, ocorrenciasQtd: doMesComDesconto.length, deducaoTotal };
}

export interface MedicaoMesAtualPreparada {
  /** true = precisa inserir uma Medição nova no banco; false = precisa atualizar a Medição `id` já existente com `patch`. */
  nova: boolean;
  id: string;
  medicaoCompleta?: Medicao;
  patch?: Partial<Medicao>;
}

/**
 * Decide o que fazer com a Medição do mês corrente de um contrato, a partir
 * do score recém-calculado (`calcularScoreMesAtual`): cria uma Medição nova
 * (se ainda não existe nenhuma pra esse contrato+mês) ou devolve o patch pra
 * atualizar a já existente — devolve `null` quando nada mudou, pra não gerar
 * escritas à toa no Supabase a cada recarregamento.
 *
 * Isso é o que faz o "Histórico de Score" (no cadastro do contrato) e o
 * "Histórico Mensal" (Cálculo do Score) mostrarem o mês corrente, em
 * andamento, sempre com o valor em dia — igual um mês já fechado — pedido
 * explícito da usuária: esse histórico precisa ficar registrado de verdade,
 * não só calculado na hora só pra exibir numa tela específica.
 *
 * `valor` (valor da NF) não tem de onde ser puxado automaticamente — não
 * existe esse dado em nenhum outro lugar do app hoje (nem no Contrato, nem em
 * nenhuma tela) — então fica 0 nas Medições criadas automaticamente; isso não
 * aparece em nenhuma tela hoje (campo não utilizado). `status` é inferido da
 * faixa: 'bloqueado' na Zona Preta (que já prevê sanções), 'liberado' nas
 * outras duas.
 */
export function prepararMedicaoMesAtual(
  contratoId: string,
  resultado: ScoreMesAtual,
  medicoesExistentes: Medicao[],
): MedicaoMesAtualPreparada | null {
  const periodo = rotuloMesAtual();
  const { score, faixa, pagamento, ocorrenciasQtd } = resultado;
  const status: Medicao['status'] = faixa === 'preto' ? 'bloqueado' : 'liberado';
  const existente = medicoesExistentes.find((m) => m.contratoId === contratoId && m.periodo === periodo);

  if (!existente) {
    const id = `mes-${contratoId}-${periodo.replace('/', '')}`;
    return {
      nova: true,
      id,
      medicaoCompleta: { id, contratoId, periodo, score, ocorrencias: ocorrenciasQtd, pagamento, valor: 0, status },
    };
  }
  if (
    existente.score === score &&
    existente.ocorrencias === ocorrenciasQtd &&
    existente.pagamento === pagamento &&
    existente.status === status
  ) {
    return null;
  }
  return { nova: false, id: existente.id, patch: { score, ocorrencias: ocorrenciasQtd, pagamento, status } };
}
