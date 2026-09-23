import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { useData } from '../context/DataContext';

function getFaixa(score: number): { label: string; color: string; pct: string } {
  if (score >= 450) return { label: 'Zona Verde', color: '#3D5C3E', pct: '100% do pagamento' };
  if (score >= 350) return { label: 'Zona Cinza', color: '#9CA3AF', pct: '95% do pagamento' };
  return { label: 'Zona Preta', color: '#1F2937', pct: '90% do pagamento + sanções' };
}

const MESES_ABREV: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

// Transforma "ago/26" em um número comparável (ano*12+mês) pra dar pra ordenar
// os períodos corretamente — comparar as strings direto não funciona (ex:
// "jan/27" viria antes de "dez/26" numa comparação alfabética).
function periodoParaChave(periodo: string): number {
  const [mesStr, anoStr] = periodo.toLowerCase().split('/');
  const mes = MESES_ABREV[mesStr] ?? 0;
  const ano = Number(anoStr);
  return (Number.isFinite(ano) ? ano : 0) * 12 + mes;
}

export default function CalculoScore() {
  const { contratos: todosContratos, medicoes } = useData();

  // Contratos inativos continuam aparecendo aqui, marcados como "(Inativo — histórico)"
  // — servem como informação gerencial para futuras contratações, mas não entram no
  // score atual do fornecedor (isso é calculado só com os contratos ativos, em
  // scoreFornecedor no DataContext).
  // O seletor de contrato começa vazio — mostra um rótulo descritivo ("Selecione um
  // contrato"), igual ao seletor de unidade tem "Todas as unidades". Antes ele já
  // vinha com o primeiro contrato da lista pré-selecionado, puxando um fornecedor
  // específico sem o usuário ter escolhido nada — a usuária achou isso confuso.
  const [unidadeSel, setUnidadeSel] = useState('Todos');
  const [contratoSel, setContratoSel] = useState('');
  const [periodoSel, setPeriodoSel] = useState('');

  const opcoesUnidade = useMemo(
    () => ['Todos', ...new Set(todosContratos.map((c) => c.unidade).filter(Boolean) as string[])],
    [todosContratos],
  );

  // O contrato listado fica atrelado à unidade escolhida — inclui todos os contratos
  // daquela unidade, mesmo quando o mesmo fornecedor aparece em mais de um contrato,
  // e mesmo quando o contrato está inativo (fica marcado, mas continua visível).
  const contratosParaSelecao = useMemo(
    () => todosContratos.filter((c) => unidadeSel === 'Todos' || c.unidade === unidadeSel),
    [todosContratos, unidadeSel],
  );

  // Só limpa a seleção se o contrato escolhido saiu da lista filtrada (ex: trocou de
  // unidade) — nunca escolhe um novo automaticamente no lugar; sem seleção, o
  // seletor volta a mostrar "Selecione um contrato" e o usuário escolhe de novo.
  useEffect(() => {
    if (contratoSel && !contratosParaSelecao.some((c) => c.id === contratoSel)) {
      setContratoSel('');
    }
  }, [contratosParaSelecao, contratoSel]);

  const contrato = todosContratos.find((c) => c.id === contratoSel);

  const historico = useMemo(
    () => (contrato ? medicoes.filter((m) => m.contratoId === contrato.id) : []),
    [contrato, medicoes],
  );

  // Ordenado do mês mais antigo pro mais recente — é como o Histórico Mensal é
  // exibido. O seletor de período usa a ordem inversa (mês mais recente primeiro)
  // e também define o padrão selecionado ao trocar de contrato.
  const historicoAsc = useMemo(
    () => [...historico].sort((a, b) => periodoParaChave(a.periodo) - periodoParaChave(b.periodo)),
    [historico],
  );

  const opcoesPeriodo = useMemo(
    () => [...historicoAsc].reverse().map((m) => m.periodo),
    [historicoAsc],
  );

  // Se o contrato mudou (ou o período escolhido não existe mais no histórico dele),
  // volta pro mês mais recente disponível — nunca fica um período "fantasma" que
  // não está na lista.
  useEffect(() => {
    if (!opcoesPeriodo.includes(periodoSel)) {
      setPeriodoSel(opcoesPeriodo[0] ?? '');
    }
  }, [opcoesPeriodo, periodoSel]);

  if (todosContratos.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Cálculo do Score</h1>
            <p className="page-subtitle">Processamento automático da pontuação mensal.</p>
          </div>
        </div>
        <div className="empty-state">
          Nenhum contrato cadastrado ainda — cadastre um contrato em Fornecedores para calcular a pontuação.
        </div>
      </div>
    );
  }

  // A partir daqui, tudo é opcional (`?.`/`??`) porque `contrato` pode ser `undefined`
  // — o usuário ainda não escolheu nenhum no seletor. O bloco de score só é
  // renderizado quando `contrato` existe (ver `{contrato ? ... : ...}` mais abaixo).
  // O score exibido é sempre o do período escolhido no seletor — nunca cai por
  // baixo dos panos pra outro mês do contrato.
  const medicao = periodoSel ? historico.find((m) => m.periodo === periodoSel) : undefined;

  const score = medicao?.score ?? contrato?.score ?? 0;
  const ocorrenciasQtd = medicao?.ocorrencias ?? 0;
  const deducaoTotal = ocorrenciasQtd * 25;
  const pagamentoPct = medicao?.pagamento ?? contrato?.pagamento ?? 0;
  const faixa = getFaixa(score);

  const donutData = [
    { value: score, color: faixa.color },
    { value: 500 - score, color: '#E5E1D8' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Cálculo do Score</h1>
          <p className="page-subtitle">
            Processamento automático da pontuação mensal. Contratos inativos aparecem marcados como histórico —
            úteis para avaliar o desempenho passado do fornecedor, mas não contam no score atual dele.
          </p>
        </div>
      </div>

      {/* Seletores */}
      <div className="score-selectors">
        <select
          className="score-selector"
          value={unidadeSel}
          onChange={(e) => setUnidadeSel(e.target.value)}
        >
          {opcoesUnidade.map((u) => (
            <option key={u} value={u}>{u === 'Todos' ? 'Todas as unidades' : u}</option>
          ))}
        </select>
        <select
          className="score-selector"
          value={contratoSel}
          onChange={(e) => setContratoSel(e.target.value)}
        >
          <option value="">Selecione um contrato</option>
          {contratosParaSelecao.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fornecedorNome} — {c.numero}{c.unidade ? ` · ${c.unidade}` : ''}{c.status === 'inativo' ? ' (Inativo — histórico)' : ''}
            </option>
          ))}
        </select>
        <select
          className="score-selector"
          value={periodoSel}
          onChange={(e) => setPeriodoSel(e.target.value)}
          disabled={opcoesPeriodo.length === 0}
        >
          {opcoesPeriodo.length === 0 ? (
            <option value="">Sem histórico</option>
          ) : (
            opcoesPeriodo.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))
          )}
        </select>
      </div>

      {!contrato ? (
        <div className="empty-state">Selecione um contrato acima para ver o score calculado.</div>
      ) : (
      <div className="score-content">
        {/* Gauge */}
        <div className="score-gauge-card">
          <h3 className="score-card-title">Índice Raiz</h3>
          <div className="score-gauge-wrapper">
            <PieChart width={220} height={220}>
              <Pie
                data={donutData}
                cx={110}
                cy={110}
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {donutData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="score-gauge-center">
              <span className="score-gauge-value">{score}</span>
              <span className="score-gauge-max">DE 500</span>
            </div>
          </div>
          <div className="score-faixa-badge" style={{ borderColor: faixa.color }}>
            <span className="score-faixa-dot" style={{ background: faixa.color }} />
            <span className="score-faixa-label">{faixa.label}</span>
            <span className="score-faixa-pct">{faixa.pct}</span>
          </div>
        </div>

        {/* Detalhamento */}
        <div className="score-detail-card">
          <h3 className="score-card-title">Detalhamento — {contrato.fornecedorNome}</h3>
          <p className="score-contract-num">{contrato.numero}</p>
          {contrato.status === 'inativo' && (
            <p className="form-hint form-hint--muted" style={{ marginTop: -4, marginBottom: 8 }}>
              Contrato inativo — dados exibidos apenas como histórico de desempenho, sem impacto no score atual do fornecedor.
            </p>
          )}

          <div className="score-breakdown">
            <div className="breakdown-row">
              <span>Pontuação inicial do mês</span>
              <strong>500</strong>
            </div>
            <div className="breakdown-row breakdown-row--warn">
              <span>Ocorrências no período</span>
              <strong>× {ocorrenciasQtd}</strong>
            </div>
            <div className="breakdown-row breakdown-row--danger">
              <span>Total de deduções</span>
              <strong>-{deducaoTotal}</strong>
            </div>
            <div className="breakdown-row breakdown-row--total">
              <span>Score Final</span>
              <strong>{score}</strong>
            </div>
            <div className="breakdown-row">
              <span>Pagamento da NF</span>
              <strong>{pagamentoPct}%</strong>
            </div>
          </div>

          {/* Histórico */}
          <div className="score-history">
            <h4 className="score-history-title">Histórico Mensal</h4>
            {historicoAsc.map((m) => (
              <div key={m.id} className="score-history-row">
                <div className="history-period">{m.periodo}</div>
                <div className="history-meta">Score: {m.score} · {m.pagamento}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}</div>
                <div className={`history-status history-status--${m.status}`}>
                  {m.status === 'liberado' ? 'Liberado' : m.status === 'pendente' ? 'Pendente' : 'Bloqueado'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
