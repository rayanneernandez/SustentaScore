import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, ShieldAlert } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { PAGAMENTO_MINIMO_NF, SCORE_ZONA_PRETA, calcularValorAPagar, pagamentoDoScore } from '../utils/score';
import { formatarReais, lerReais } from '../utils/moeda';
import { gerarRelatorioMensalPDF } from '../utils/relatorioMensal';

const faixas = [
  { range: '450 – 500', pct: 100, label: '100%', color: '#3D5C3E' },
  { range: '350 – 449', pct: 95, label: '95%', color: '#9CA3AF' },
  { range: '< 350', pct: 90, label: '90% (mínimo garantido) + sanções', color: '#1F2937' },
];

function labelStatus(status: 'liberado' | 'pendente' | 'bloqueado') {
  return status === 'liberado' ? 'Liberado' : status === 'pendente' ? 'Pendente' : 'Bloqueado';
}

/**
 * Campo do valor nominal da NF de um mês (informado pelo gestor). Mostra em R$ e só grava ao
 * sair do campo (ou Enter), se o texto for um valor válido — assim ninguém grava no banco a
 * cada tecla digitada. Vazio = 0 (valor ainda não informado).
 */
function CampoValorNF({ valor, editavel, onSalvar }: { valor: number; editavel: boolean; onSalvar: (novo: number) => void }) {
  const [texto, setTexto] = useState(valor > 0 ? formatarReais(valor) : '');
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setTexto(valor > 0 ? formatarReais(valor) : '');
    setErro(false);
  }, [valor]);

  const confirmar = () => {
    if (texto.trim() === '') {
      setErro(false);
      if (valor !== 0) onSalvar(0);
      return;
    }
    const numero = lerReais(texto);
    if (numero === null) {
      setErro(true);
      return;
    }
    setErro(false);
    if (numero !== valor) onSalvar(numero);
    setTexto(numero > 0 ? formatarReais(numero) : '');
  };

  if (!editavel) {
    return <span className="payment-nf-valor">{valor > 0 ? formatarReais(valor) : 'não informado'}</span>;
  }

  return (
    <>
      <input
        className={`form-input payment-nf-input ${erro ? 'payment-nf-input--erro' : ''}`}
        inputMode="decimal"
        placeholder="R$ 0,00"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        aria-label="Valor da NF do mês"
      />
      {erro && <span className="form-hint form-hint--danger">Valor inválido — use números, ex: 10.000,00</span>}
    </>
  );
}

function nomeArquivo(contratoNumero: string, extensao: string) {
  return `medicoes_${contratoNumero.replace(/[^\w-]+/g, '_')}.${extensao}`;
}

export default function MedicaoPagamento() {
  const { contratos: todosContratos, medicoes, ocorrencias, updateMedicao, podeEditar, usuarioAtual } = useData();
  const podeEditarValorNF = podeEditar('medicao');
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
  const abaixoDoLimite = scoreExibido < SCORE_ZONA_PRETA;
  // Pagamento da NF a aplicar com o score exibido — sempre com a trava de mínimo de 90%.
  const pagamentoAplicado = pagamentoDoScore(scoreExibido);

  const exportarCSV = () => {
    if (!contrato) return;
    const cabecalho = ['Fornecedor', 'Unidade', 'Contrato', 'Período', 'Score', 'Pagamento (%)', 'Valor da NF', 'Valor a pagar', 'Ocorrências', 'Status'];
    const linhas = historicoContrato.map((m) => [
      contrato.fornecedorNome,
      contrato.unidade ?? '',
      contrato.numero,
      m.periodo,
      String(m.score),
      String(pagamentoDoScore(m.score)),
      m.valor > 0 ? formatarReais(m.valor) : '',
      m.valor > 0 ? formatarReais(calcularValorAPagar(m.valor, m.score).valorAPagar) : '',
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
      head: [['Período', 'Score', 'Pagamento (%)', 'Valor da NF', 'Valor a pagar', 'Ocorrências', 'Status']],
      body: historicoContrato.map((m) => [
        m.periodo,
        String(m.score),
        `${pagamentoDoScore(m.score)}%`,
        m.valor > 0 ? formatarReais(m.valor) : '—',
        m.valor > 0 ? formatarReais(calcularValorAPagar(m.valor, m.score).valorAPagar) : '—',
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
        <p className="payment-score-atual">
          Score {mesSel === 'Todos' ? 'atual' : `em ${mesSel}`}: <strong>{scoreExibido}</strong>
          {' · '}Pagamento da NF: <strong>{pagamentoAplicado}%</strong>
        </p>

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
            </div>
          ))}
        </div>

        <div className={`payment-trava ${abaixoDoLimite ? 'payment-trava--ativa' : ''}`} role="note">
          <ShieldAlert size={16} />
          <div>
            <strong>Trava de pagamento: nunca abaixo de {PAGAMENTO_MINIMO_NF}% do valor da NF</strong>
            <span>
              {abaixoDoLimite
                ? `Score abaixo de ${SCORE_ZONA_PRETA}: o pagamento da Nota Fiscal fica travado em ${PAGAMENTO_MINIMO_NF}% — não há desconto adicional na fatura — e as sanções previstas se aplicam.`
                : `O Score pode cair abaixo de ${SCORE_ZONA_PRETA}, mas o pagamento da Nota Fiscal ao fornecedor não desce de ${PAGAMENTO_MINIMO_NF}%.`}
            </span>
          </div>
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
          {historicoContrato.map((m) => {
            const calculo = calcularValorAPagar(m.valor, m.score);
            return (
              <div key={m.id} className="payment-history-item">
                <div className="history-item-icon">
                  <FileText size={16} strokeWidth={1.5} />
                </div>
                <div className="history-item-body">
                  <div className="history-item-period">{m.periodo}</div>
                  <div className="history-item-meta">
                    Score: {m.score} · {calculo.percentual}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                  </div>
                  <div className="payment-nf">
                    <label className="payment-nf-label">Valor da NF do mês</label>
                    <CampoValorNF
                      valor={m.valor}
                      editavel={podeEditarValorNF}
                      onSalvar={(novo) => updateMedicao(m.id, { valor: novo })}
                    />
                    {m.valor > 0 ? (
                      <span className="payment-nf-resultado">
                        Valor a pagar: <strong>{formatarReais(calculo.valorAPagar)}</strong>
                        {calculo.desconto > 0 && <> (desconto de {formatarReais(calculo.desconto)})</>}
                      </span>
                    ) : (
                      podeEditarValorNF && (
                        <span className="payment-nf-resultado">Informe o valor da NF para calcular o valor a pagar.</span>
                      )
                    )}
                  </div>
                </div>
                <button
                  className="btn-secondary btn-secondary--sm payment-history-pdf"
                  title={`Relatório de medição de ${m.periodo} — para anexar ao pagamento do mês`}
                  onClick={() => gerarRelatorioMensalPDF({ contrato, medicao: m, ocorrencias, geradoPor: usuarioAtual?.nome })}
                >
                  <FileText size={14} />
                  PDF do mês
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
