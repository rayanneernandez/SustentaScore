import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';
import {
  FileText,
  Users,
  Gauge,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Info,
  Calendar,
  Filter,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  scoreHistorico,
  ocorrenciasPorTipo,
  distribuicaoScore,
  contratos,
  ocorrencias,
} from '../data/mockData';

const faixasPagamento = [
  { range: '500 a 450', percentual: '100%', status: 'Verde', color: 'verde' },
  { range: '449 a 350', percentual: '95%', status: 'Cinza', color: 'cinza' },
  { range: 'Abaixo de 350', percentual: '90%', status: 'Preto', color: 'preto' },
];

const mesesAbreviados = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const totalScoreGlobal = contratos.reduce((total, item) => total + item.score, 0);
const mediaScoreGlobal = Math.round(totalScoreGlobal / contratos.length);

function normalizarPeriodoDaData(data: string) {
  const [ano, mes] = data.split('-');
  const indiceMes = Number(mes) - 1;
  const anoCurto = ano.slice(-2);
  return `${mesesAbreviados[indiceMes]}/${anoCurto}`;
}

function limitarScore(score: number) {
  return Math.max(0, Math.min(500, Math.round(score)));
}

export default function Dashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [orgao, setOrgao] = useState('Todos');
  const [contrato, setContrato] = useState('Todos');
  const [fornecedor, setFornecedor] = useState('Todos');
  const [periodo, setPeriodo] = useState('Todos');
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setExpandido(document.fullscreenElement === dashboardRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const opcoesOrgao = useMemo(
    () => ['Todos', ...new Set(contratos.map((item) => item.unidade).filter(Boolean) as string[])],
    [],
  );

  const opcoesContrato = useMemo(
    () => ['Todos', ...contratos.map((item) => item.numero)],
    [],
  );

  const opcoesFornecedor = useMemo(
    () => ['Todos', ...new Set(contratos.map((item) => item.fornecedorNome))],
    [],
  );

  const opcoesPeriodo = useMemo(
    () => ['Todos', ...scoreHistorico.map((item) => item.mes)],
    [],
  );

  const contratosFiltrados = useMemo(
    () =>
      contratos.filter((item) => {
        const matchOrgao = orgao === 'Todos' || item.unidade === orgao;
        const matchContrato = contrato === 'Todos' || item.numero === contrato;
        const matchFornecedor = fornecedor === 'Todos' || item.fornecedorNome === fornecedor;
        return matchOrgao && matchContrato && matchFornecedor;
      }),
    [contrato, fornecedor, orgao],
  );

  const idsContratosFiltrados = useMemo(
    () => new Set(contratosFiltrados.map((item) => item.id)),
    [contratosFiltrados],
  );

  const ocorrenciasFiltradas = useMemo(
    () =>
      ocorrencias.filter((item) => {
        const matchContrato = idsContratosFiltrados.has(item.contratoId);
        const matchPeriodo = periodo === 'Todos' || normalizarPeriodoDaData(item.data) === periodo;
        return matchContrato && matchPeriodo;
      }),
    [idsContratosFiltrados, periodo],
  );

  const scoreMedio = useMemo(() => {
    if (!contratosFiltrados.length) {
      return 0;
    }

    const total = contratosFiltrados.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / contratosFiltrados.length);
  }, [contratosFiltrados]);

  const pagamentoMedio = useMemo(() => {
    if (!contratosFiltrados.length) {
      return 0;
    }

    const total = contratosFiltrados.reduce((sum, item) => sum + item.pagamento, 0);
    return Math.round(total / contratosFiltrados.length);
  }, [contratosFiltrados]);

  const fornecedoresAvaliados = useMemo(
    () => new Set(contratosFiltrados.map((item) => item.fornecedorId)).size,
    [contratosFiltrados],
  );

  const distribuicaoFiltrada = useMemo(() => {
    const totais = contratosFiltrados.reduce(
      (acc, item) => {
        acc[item.faixa] += 1;
        return acc;
      },
      { verde: 0, cinza: 0, preto: 0 },
    );

    return distribuicaoScore.map((item) => {
      if (item.name.includes('Verde')) {
        return { ...item, value: totais.verde };
      }

      if (item.name.includes('Cinza')) {
        return { ...item, value: totais.cinza };
      }

      return { ...item, value: totais.preto };
    });
  }, [contratosFiltrados]);

  const percentualFaixaVerde = useMemo(() => {
    const total = distribuicaoFiltrada.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return 0;
    }

    return Math.round((distribuicaoFiltrada[0].value / total) * 100);
  }, [distribuicaoFiltrada]);

  const historicoFiltrado = useMemo(() => {
    const ajuste = scoreMedio ? scoreMedio - mediaScoreGlobal : -mediaScoreGlobal;
    const serie = scoreHistorico.map((item) => ({
      ...item,
      score: limitarScore(item.score + ajuste),
    }));

    if (periodo === 'Todos') {
      return serie;
    }

    const indicePeriodo = serie.findIndex((item) => item.mes === periodo);
    return indicePeriodo >= 0 ? serie.slice(0, indicePeriodo + 1) : serie;
  }, [periodo, scoreMedio]);

  const ocorrenciasAgrupadas = useMemo(() => {
    const totais = ocorrenciasFiltradas.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] ?? 0) + 1;
      return acc;
    }, {});

    const agrupadas = Object.entries(totais)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);

    return agrupadas.length ? agrupadas : [{ tipo: 'Sem registros', total: 0 }];
  }, [ocorrenciasFiltradas]);

  const menoresFornecedores = useMemo(
    () => [...contratosFiltrados].sort((a, b) => a.score - b.score).slice(0, 5),
    [contratosFiltrados],
  );

  const alertasFiltrados = useMemo(() => {
    const abaixoDe350 = contratosFiltrados.filter((item) => item.score < 350).length;
    const proximosVencimentos = contratosFiltrados
      .filter((item) => item.vigencia)
      .sort((a, b) => (a.vigencia ?? '').localeCompare(b.vigencia ?? ''))
      .slice(0, 3).length;

    return [
      {
        tipo: 'erro',
        mensagem: `${abaixoDe350} contratos com score abaixo de 350 pontos.`,
        detalhe: 'Priorize plano de ação para contratos em faixa crítica.',
      },
      {
        tipo: 'aviso',
        mensagem: `${ocorrenciasFiltradas.length} ocorrências registradas no recorte atual.`,
        detalhe: 'Abra o detalhamento para verificar contratos impactados.',
      },
      {
        tipo: 'info',
        mensagem: `${proximosVencimentos} contratos próximos do vencimento da medição.`,
        detalhe: 'Acompanhe medições pendentes para evitar atraso no fechamento.',
      },
    ];
  }, [contratosFiltrados, ocorrenciasFiltradas.length]);

  const totalOcorrencias = useMemo(
    () => ocorrenciasAgrupadas.reduce((sum, item) => sum + item.total, 0),
    [ocorrenciasAgrupadas],
  );

  const labelPeriodo = periodo === 'Todos' ? 'todos os períodos' : periodo;
  const dashboardClasses = `page${expandido ? ' page--fullscreen' : ''}`;

  const limparFiltros = () => {
    setOrgao('Todos');
    setContrato('Todos');
    setFornecedor('Todos');
    setPeriodo('Todos');
  };

  const alternarFullscreen = async () => {
    try {
      if (document.fullscreenElement === dashboardRef.current) {
        await document.exitFullscreen();
        return;
      }

      await dashboardRef.current?.requestFullscreen();
    } catch (error) {
      console.error('Nao foi possivel alternar o fullscreen do dashboard.', error);
    }
  };

  return (
    <div ref={dashboardRef} className={dashboardClasses}>
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Monitoramento de Desempenho de Fornecedores – Sustentabilidade (IMR)</h1>
          <p className="page-subtitle">Painel Gerencial</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn-secondary dashboard-expand-btn" onClick={alternarFullscreen}>
            {expandido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {expandido ? 'Sair da tela inteira' : 'Tela inteira'}
          </button>
          <div className="dashboard-last-update">
            <Calendar size={14} />
            <span>Última atualização:<br />31/05/2024 10:30</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Órgão / Unidade</label>
          <select className="filter-select-input" value={orgao} onChange={(event) => setOrgao(event.target.value)}>
            {opcoesOrgao.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Contrato</label>
          <select className="filter-select-input" value={contrato} onChange={(event) => setContrato(event.target.value)}>
            {opcoesContrato.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Fornecedor</label>
          <select className="filter-select-input" value={fornecedor} onChange={(event) => setFornecedor(event.target.value)}>
            {opcoesFornecedor.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Período</label>
          <select className="filter-select-input filter-select-input--date" value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            {opcoesPeriodo.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-clear-filter" onClick={limparFiltros}>
          <Filter size={14} />
          Limpar filtros
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><FileText size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{contratosFiltrados.length}</div>
          <div className="kpi-label">Contratos ativos</div>
          <div className="kpi-title">CONTRATOS MONITORADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Users size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{fornecedoresAvaliados}</div>
          <div className="kpi-label">Fornecedores</div>
          <div className="kpi-title">FORNECEDORES AVALIADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Gauge size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{scoreMedio}</div>
          <div className="kpi-label">de 500 pontos</div>
          <div className="kpi-title">SCORE MÉDIO</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CalendarCheck size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{contratosFiltrados.length}</div>
          <div className="kpi-label">Avaliados em {labelPeriodo}</div>
          <div className="kpi-title">CONTRATOS NO MÊS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><DollarSign size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{pagamentoMedio}%</div>
          <div className="kpi-label">Percentual médio</div>
          <div className="kpi-title">PAGAMENTO MÉDIO</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Donut Chart */}
        <div className="chart-card">
          <h3 className="chart-title">DISTRIBUIÇÃO DOS CONTRATOS POR FAIXA DE SCORE</h3>
          <div className="donut-wrapper">
            <PieChart width={200} height={200}>
              <Pie
                data={distribuicaoFiltrada}
                cx={100}
                cy={100}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {distribuicaoFiltrada.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="donut-center">
              <span className="donut-pct">{percentualFaixaVerde}%</span>
            </div>
          </div>
          <div className="donut-legend">
            {distribuicaoFiltrada.map((item, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: item.color }} />
                <span className="legend-label">{item.name}</span>
                <span className="legend-count">{item.value} contratos</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line Chart */}
        <div className="chart-card chart-card--wide">
          <h3 className="chart-title">EVOLUÇÃO DO SCORE MÉDIO</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historicoFiltrado} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 500]} ticks={[0, 100, 200, 300, 400, 500]} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E1D8', fontSize: 12 }}
                labelStyle={{ color: '#1C1C1C', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3D5C3E"
                strokeWidth={2.5}
                dot={{ fill: '#3D5C3E', r: 4 }}
                activeDot={{ r: 6 }}
              >
                <LabelList dataKey="score" position="top" style={{ fontSize: 11, fill: '#3D5C3E', fontWeight: 600 }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="chart-card">
          <h3 className="chart-title">DISTRIBUIÇÃO DAS OCORRÊNCIAS POR TIPO</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={ocorrenciasAgrupadas}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="tipo"
                width={140}
                tick={{ fontSize: 12, fill: '#1C1C1C' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E1D8', fontSize: 12 }}
              />
              <Bar dataKey="total" fill="#5C8B5F" radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 12, fill: '#1C1C1C', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="occurrence-total">
            <span>Total de ocorrências</span>
            <strong>{totalOcorrencias}</strong>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Faixas de Pagamento */}
        <div className="table-card">
          <h3 className="chart-title">FAIXAS DE PAGAMENTO</h3>
          <table className="payment-table">
            <thead>
              <tr>
                <th>SCORE</th>
                <th>PERCENTUAL DE PAGAMENTO</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {faixasPagamento.map((f, i) => (
                <tr key={i}>
                  <td>{f.range}</td>
                  <td className="text-center">{f.percentual}</td>
                  <td>
                    <span className={`status-badge status-badge--${f.color}`}>
                      <span className="status-dot" />
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Menores Scores */}
        <div className="table-card table-card--wide">
          <h3 className="chart-title">FORNECEDORES COM MENOR SCORE NO MÊS</h3>
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Contrato</th>
                <th>Score</th>
                <th>Faixa de Pagamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {menoresFornecedores.length ? (
                menoresFornecedores.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fornecedorNome}</td>
                    <td>{c.numero}</td>
                    <td>{c.score}</td>
                    <td>{c.pagamento}%</td>
                    <td>
                      <span className={`status-dot-only status-dot-only--${c.faixa}`} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty-state">Nenhum contrato encontrado para os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="table-footer">
            <button className="btn-link">
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Alertas */}
        <div className="alerts-card">
          <h3 className="chart-title">ALERTAS</h3>
          <div className="alerts-list">
            {alertasFiltrados.map((a, i) => (
              <div key={i} className={`alert-item alert-item--${a.tipo}`}>
                <div className="alert-icon">
                  {a.tipo === 'info' ? (
                    <Info size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div className="alert-body">
                  <p className="alert-msg">{a.mensagem}</p>
                  <p className="alert-detail">{a.detalhe}</p>
                </div>
                <ChevronRight size={16} className="alert-arrow" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
