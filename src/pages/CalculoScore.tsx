import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { medicoes } from '../data/mockData';
import { useData } from '../context/DataContext';

function getFaixa(score: number): { label: string; color: string; pct: string } {
  if (score >= 450) return { label: 'Zona Verde', color: '#3D5C3E', pct: '100% do pagamento' };
  if (score >= 350) return { label: 'Zona Cinza', color: '#9CA3AF', pct: '95% do pagamento' };
  return { label: 'Zona Preta', color: '#1F2937', pct: '90% do pagamento + sanções' };
}

export default function CalculoScore() {
  const { contratos: todosContratos } = useData();
  // Contratos inativos não entram no cálculo/apresentação do score.
  const contratosAtivos = useMemo(
    () => todosContratos.filter((c) => c.status === 'ativo'),
    [todosContratos],
  );

  const [unidadeSel, setUnidadeSel] = useState('Todos');
  const [contratoSel, setContratoSel] = useState(contratosAtivos[0]?.id ?? '');
  const [periodoSel, setPeriodoSel] = useState('Mar/2024');

  const opcoesUnidade = useMemo(
    () => ['Todos', ...new Set(contratosAtivos.map((c) => c.unidade).filter(Boolean) as string[])],
    [contratosAtivos],
  );

  // O contrato listado fica atrelado à unidade escolhida — inclui todos os contratos
  // daquela unidade, mesmo quando o mesmo fornecedor aparece em mais de um contrato.
  const contratosParaSelecao = useMemo(
    () => contratosAtivos.filter((c) => unidadeSel === 'Todos' || c.unidade === unidadeSel),
    [contratosAtivos, unidadeSel],
  );

  useEffect(() => {
    if (!contratosParaSelecao.some((c) => c.id === contratoSel)) {
      setContratoSel(contratosParaSelecao[0]?.id ?? '');
    }
  }, [contratosParaSelecao, contratoSel]);

  const contrato = contratosAtivos.find((c) => c.id === contratoSel) ?? contratosParaSelecao[0] ?? contratosAtivos[0];

  if (!contrato) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Cálculo do Score</h1>
            <p className="page-subtitle">Processamento automático da pontuação mensal.</p>
          </div>
        </div>
        <div className="empty-state">
          Nenhum contrato ativo encontrado. Contratos inativos não são contabilizados no score — reative um
          contrato em Cadastro para calcular a pontuação.
        </div>
      </div>
    );
  }

  const medicao = medicoes.find(
    (m) => m.contratoId === contrato.id && m.periodo === periodoSel
  ) || medicoes.find((m) => m.contratoId === contrato.id);

  const score = medicao?.score ?? contrato.score;
  const ocorrenciasQtd = medicao?.ocorrencias ?? 0;
  const deducaoTotal = ocorrenciasQtd * 25;
  const pagamentoPct = medicao?.pagamento ?? contrato.pagamento;
  const faixa = getFaixa(score);

  const historico = medicoes.filter((m) => m.contratoId === contrato.id);

  const donutData = [
    { value: score, color: faixa.color },
    { value: 500 - score, color: '#E5E1D8' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Cálculo do Score</h1>
          <p className="page-subtitle">Processamento automático da pontuação mensal. Contratos inativos não entram nesta lista.</p>
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
          value={contrato.id}
          onChange={(e) => setContratoSel(e.target.value)}
        >
          {contratosParaSelecao.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fornecedorNome} — {c.numero}{c.unidade ? ` · ${c.unidade}` : ''}
            </option>
          ))}
        </select>
        <select
          className="score-selector"
          value={periodoSel}
          onChange={(e) => setPeriodoSel(e.target.value)}
        >
          {['Mar/2024', 'Fev/2024', 'Jan/2024'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

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
            {historico.map((m) => (
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
    </div>
  );
}
