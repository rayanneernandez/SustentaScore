import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';

const faixas = [
  { range: '450 – 500', pct: 100, label: '100%', color: '#3D5C3E' },
  { range: '350 – 449', pct: 95, label: '95%', color: '#9CA3AF' },
  { range: '< 350', pct: 90, label: '90% + sanções', color: '#1F2937' },
];

function labelStatus(status: 'liberado' | 'pendente' | 'bloqueado') {
  return status === 'liberado' ? 'Liberado' : status === 'pendente' ? 'Pendente' : 'Bloqueado';
}

function nomeArquivo(contratoNumero: string, extensao: string) {
  return `medicoes_${contratoNumero.replace(/[^\w-]+/g, '_')}.${extensao}`;
}

export default function MedicaoPagamento() {
  const { contratos: todosContratos, medicoes } = useData();
  // Contratos inativos não entram na medição/pagamento.
  const contratosAtivos = useMemo(
    () => todosContratos.filter((c) => c.status === 'ativo'),
    [todosContratos],
  );

  const [unidadeSel, setUnidadeSel] = useState('Todos');
  const [fornecedorSel, setFornecedorSel] = useState('Todos');
  const [contratoSel, setContratoSel] = useState(contratosAtivos[0]?.id ?? '');
  const [mesSel, setMesSel] = useState('Todos');

  const opcoesUnidade = useMemo(
    () => ['Todos', ...new Set(contratosAtivos.map((c) => c.unidade).filter(Boolean) as string[])],
    [contratosAtivos],
  );

  // O filtro de Fornecedor fica atrelado à Unidade selecionada.
  const opcoesFornecedor = useMemo(
    () => [
      'Todos',
      ...new Set(
        contratosAtivos
          .filter((c) => unidadeSel === 'Todos' || c.unidade === unidadeSel)
          .map((c) => c.fornecedorNome),
      ),
    ],
    [contratosAtivos, unidadeSel],
  );

  useEffect(() => {
    if (fornecedorSel !== 'Todos' && !opcoesFornecedor.includes(fornecedorSel)) {
      setFornecedorSel('Todos');
    }
  }, [opcoesFornecedor, fornecedorSel]);

  // O Contrato listado fica atrelado à Unidade e ao Fornecedor selecionados — inclui
  // todos os contratos correspondentes, mesmo quando o mesmo fornecedor aparece em
  // mais de um contrato/unidade.
  const contratosParaSelecao = useMemo(
    () =>
      contratosAtivos.filter(
        (c) =>
          (unidadeSel === 'Todos' || c.unidade === unidadeSel) &&
          (fornecedorSel === 'Todos' || c.fornecedorNome === fornecedorSel),
      ),
    [contratosAtivos, unidadeSel, fornecedorSel],
  );

  useEffect(() => {
    if (!contratosParaSelecao.some((c) => c.id === contratoSel)) {
      setContratoSel(contratosParaSelecao[0]?.id ?? '');
    }
  }, [contratosParaSelecao, contratoSel]);

  const contrato =
    contratosAtivos.find((c) => c.id === contratoSel) ?? contratosParaSelecao[0] ?? contratosAtivos[0];

  const historicoContratoCompleto = useMemo(
    () => (contrato ? medicoes.filter((m) => m.contratoId === contrato.id) : []),
    [contrato, medicoes],
  );

  const opcoesMes = useMemo(
    () => ['Todos', ...historicoContratoCompleto.map((m) => m.periodo)],
    [historicoContratoCompleto],
  );

  useEffect(() => {
    if (mesSel !== 'Todos' && !opcoesMes.includes(mesSel)) {
      setMesSel('Todos');
    }
  }, [opcoesMes, mesSel]);

  const historicoContrato = useMemo(
    () => historicoContratoCompleto.filter((m) => mesSel === 'Todos' || m.periodo === mesSel),
    [historicoContratoCompleto, mesSel],
  );

  // Quando um mês específico é escolhido, a faixa de pagamento reflete o score
  // daquele mês; com "Todos os meses" ela usa o score atual do contrato.
  const medicaoDoMes = mesSel === 'Todos' ? undefined : historicoContratoCompleto.find((m) => m.periodo === mesSel);
  const scoreExibido = medicaoDoMes?.score ?? contrato?.score ?? 0;
  const currentFaixaIndex = scoreExibido >= 450 ? 0 : scoreExibido >= 350 ? 1 : 2;

  const exportarCSV = () => {
    if (!contrato) return;
    const cabecalho = ['Fornecedor', 'Unidade', 'Contrato', 'Período', 'Score', 'Pagamento (%)', 'Ocorrências', 'Status'];
    const linhas = historicoContrato.map((m) => [
      contrato.fornecedorNome,
      contrato.unidade ?? '',
      contrato.numero,
      m.periodo,
      String(m.score),
      String(m.pagamento),
      String(m.ocorrencias),
      labelStatus(m.status),
    ]);
    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo(contrato.numero, 'csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    if (!contrato) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Histórico de Medições', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `${contrato.fornecedorNome} — ${contrato.numero}${contrato.unidade ? ' · ' + contrato.unidade : ''}`,
      14,
      23,
    );
    autoTable(doc, {
      startY: 28,
      head: [['Período', 'Score', 'Pagamento (%)', 'Ocorrências', 'Status']],
      body: historicoContrato.map((m) => [
        m.periodo,
        String(m.score),
        `${m.pagamento}%`,
        String(m.ocorrencias),
        labelStatus(m.status),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [61, 92, 62] },
    });
    doc.save(nomeArquivo(contrato.numero, 'pdf'));
  };

  if (!contrato) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Medição e Pagamento</h1>
            <p className="page-subtitle">Medição mensal e faixas de liberação de pagamento.</p>
          </div>
        </div>
        <div className="empty-state">
          Nenhum contrato ativo encontrado para os filtros selecionados.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Medição e Pagamento</h1>
          <p className="page-subtitle">Medição mensal e faixas de liberação de pagamento.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Fornecedor</label>
          <select className="filter-select-input" value={fornecedorSel} onChange={(e) => setFornecedorSel(e.target.value)}>
            {opcoesFornecedor.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Unidade</label>
          <select className="filter-select-input" value={unidadeSel} onChange={(e) => setUnidadeSel(e.target.value)}>
            {opcoesUnidade.map((u) => (
              <option key={u} value={u}>{u === 'Todos' ? 'Todas as unidades' : u}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Contrato</label>
          <select className="filter-select-input" value={contrato.id} onChange={(e) => setContratoSel(e.target.value)}>
            {contratosParaSelecao.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fornecedorNome} — {c.numero}{c.unidade ? ` · ${c.unidade}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Mês</label>
          <select className="filter-select-input" value={mesSel} onChange={(e) => setMesSel(e.target.value)}>
            {opcoesMes.map((m) => (
              <option key={m} value={m}>{m === 'Todos' ? 'Todos os meses' : m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Faixas de pagamento */}
      <div className="payment-card">
        <h3 className="payment-card-title">Faixas de Pagamento</h3>
        <p className="payment-score-atual">Score {mesSel === 'Todos' ? 'atual' : `em ${mesSel}`}: <strong>{scoreExibido}</strong></p>

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
          <div className="payment-history-actions">
            <button className="btn-secondary btn-secondary--sm" onClick={exportarCSV}>
              <FileSpreadsheet size={14} />
              Exportar CSV
            </button>
            <button className="btn-secondary btn-secondary--sm" onClick={exportarPDF}>
              <FileText size={14} />
              Exportar PDF
            </button>
          </div>
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
              <div className={`history-item-status history-item-status--${m.status}`}>
                {m.status === 'liberado' && <CheckCircle size={14} />}
                {labelStatus(m.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
