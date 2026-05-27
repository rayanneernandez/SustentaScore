import { useState } from 'react';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { contratos, medicoes } from '../data/mockData';

const faixas = [
  { range: '450 – 500', pct: 100, label: '100%', color: '#3D5C3E' },
  { range: '350 – 449', pct: 95, label: '95%', color: '#9CA3AF' },
  { range: '< 350', pct: 90, label: '90% + sanções', color: '#1F2937' },
];

export default function MedicaoPagamento() {
  const [contratoSel, setContratoSel] = useState(contratos[0].id);
  const contrato = contratos.find((c) => c.id === contratoSel)!;
  const historicoContrato = medicoes.filter((m) => m.contratoId === contratoSel);

  const currentFaixaIndex =
    contrato.score >= 450 ? 0 : contrato.score >= 350 ? 1 : 2;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Medição e Pagamento</h1>
          <p className="page-subtitle">Medição mensal e faixas de liberação de pagamento.</p>
        </div>
      </div>

      {/* Seletor */}
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
      </div>

      {/* Faixas de pagamento */}
      <div className="payment-card">
        <h3 className="payment-card-title">Faixas de Pagamento</h3>
        <p className="payment-score-atual">Score atual: <strong>{contrato.score}</strong></p>

        {/* Barra visual */}
        <div className="payment-bar">
          <div className="payment-bar-segment payment-bar-segment--green">100%</div>
          <div className="payment-bar-segment payment-bar-segment--gray">95%</div>
          <div className="payment-bar-segment payment-bar-segment--dark">90%</div>
        </div>

        {/* Faixas detalhadas */}
        <div className="payment-faixas">
          {faixas.map((f, i) => (
            <div
              key={i}
              className={`payment-faixa ${i === currentFaixaIndex ? 'payment-faixa--active' : ''}`}
            >
              <div className="payment-faixa-left">
                <span
                  className="payment-faixa-icon"
                  style={{ background: i === currentFaixaIndex ? f.color : '#E5E1D8' }}
                />
                <span className="payment-faixa-range">{f.range}</span>
                <span className="payment-faixa-arrow">→</span>
                <span className="payment-faixa-pct">{f.label}</span>
              </div>
              {i === currentFaixaIndex && (
                <span className="payment-faixa-atual-badge">Atual</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de medições */}
      <div className="payment-card">
        <div className="payment-history-header">
          <div>
            <h3 className="payment-card-title">Histórico de Medições</h3>
            <p className="payment-subtitle">{contrato.fornecedorNome} – {contrato.numero}</p>
          </div>
          <button className="btn-secondary btn-secondary--sm">
            <Download size={14} />
            Gerar Relatório
          </button>
        </div>

        <div className="payment-history-list">
          {historicoContrato.length === 0 && (
            <div className="empty-state">Nenhuma medição encontrada.</div>
          )}
          {historicoContrato.map((m) => (
            <div key={m.id} className="payment-history-item">
              <div className="history-item-icon">
                <FileText size={16} strokeWidth={1.5} />
              </div>
              <div className="history-item-body">
                <div className="history-item-period">{m.periodo}</div>
                <div className="history-item-meta">
                  Score: {m.score} · {m.pagamento}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="history-item-value">
                R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className={`history-item-status history-item-status--${m.status}`}>
                {m.status === 'liberado' && <CheckCircle size={14} />}
                {m.status === 'liberado' ? 'Liberado' : m.status === 'pendente' ? 'Pendente' : 'Bloqueado'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
