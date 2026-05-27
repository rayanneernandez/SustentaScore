import { useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { contratos, medicoes } from '../data/mockData';

function getFaixa(score: number): { label: string; color: string; pct: string } {
  if (score >= 450) return { label: 'Zona Verde', color: '#3D5C3E', pct: '100% do pagamento' };
  if (score >= 350) return { label: 'Zona Cinza', color: '#9CA3AF', pct: '95% do pagamento' };
  return { label: 'Zona Preta', color: '#1F2937', pct: '90% do pagamento + sanções' };
}

export default function CalculoScore() {
  const [contratoSel, setContratoSel] = useState(contratos[0].id);
  const [periodoSel, setPeriodoSel] = useState('Mar/2024');

  const contrato = contratos.find((c) => c.id === contratoSel)!;
  const medicao = medicoes.find(
    (m) => m.contratoId === contratoSel && m.periodo === periodoSel
  ) || medicoes.find((m) => m.contratoId === contratoSel);

  const score = medicao?.score ?? contrato.score;
  const ocorrenciasQtd = medicao?.ocorrencias ?? 0;
  const deducaoTotal = ocorrenciasQtd * 25;
  const pagamentoPct = medicao?.pagamento ?? contrato.pagamento;
  const faixa = getFaixa(score);

  const historico = medicoes.filter((m) => m.contratoId === contratoSel);

  const donutData = [
    { value: score, color: faixa.color },
    { value: 500 - score, color: '#E5E1D8' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Cálculo do Score</h1>
          <p className="page-subtitle">Processamento automático da pontuação mensal.</p>
        </div>
      </div>

      {/* Seletores */}
      <div className="score-selectors">
        <select
          className="score-selector"
          value={contratoSel}
          onChange={(e) => setContratoSel(e.target.value)}
        >
          {contratos.slice(0, 3).map((c) => (
            <option key={c.id} value={c.id}>
              {c.fornecedorNome} — {c.numero}
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
                <div className="history-value">R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
