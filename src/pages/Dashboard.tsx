import { useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import {
  scoreHistorico,
  ocorrenciasPorTipo,
  distribuicaoScore,
  contratos,
} from '../data/mockData';

const faixasPagamento = [
  { range: '500 a 450', percentual: '100%', status: 'Verde', color: 'verde' },
  { range: '449 a 350', percentual: '95%', status: 'Cinza', color: 'cinza' },
  { range: 'Abaixo de 350', percentual: '90%', status: 'Preto', color: 'preto' },
];

const alertas = [
  { tipo: 'erro', mensagem: '5 contratos com score abaixo de 350 pontos.', detalhe: 'Ações corretivas recomendadas.' },
  { tipo: 'aviso', mensagem: '12 ocorrências graves registradas no mês.', detalhe: 'Verifique os detalhes.' },
  { tipo: 'info', mensagem: '3 contratos próximos ao vencimento da medição.', detalhe: 'Acompanhe as medições em aberto.' },
];

const menoresFornecedores = contratos
  .sort((a, b) => a.score - b.score)
  .slice(0, 5);

export default function Dashboard() {
  const [orgao, setOrgao] = useState('Todos');
  const [contrato, setContrato] = useState('Todos');
  const [fornecedor, setFornecedor] = useState('Todos');
  const [periodo] = useState('mai/2024');

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Monitoramento de Desempenho de Fornecedores – Sustentabilidade (IMR)</h1>
          <p className="page-subtitle">Painel Gerencial</p>
        </div>
        <div className="dashboard-last-update">
          <Calendar size={14} />
          <span>Última atualização:<br />31/05/2024 10:30</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Órgão / Unidade</label>
          <div className="filter-select" onClick={() => setOrgao(orgao === 'Todos' ? 'Todos' : 'Todos')}>
            <span>{orgao}</span>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Contrato</label>
          <div className="filter-select" onClick={() => setContrato(contrato)}>
            <span>{contrato}</span>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Fornecedor</label>
          <div className="filter-select" onClick={() => setFornecedor(fornecedor)}>
            <span>{fornecedor}</span>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Período</label>
          <div className="filter-select filter-select--date">
            <span>{periodo}</span>
            <Calendar size={14} />
          </div>
        </div>
        <button className="btn-clear-filter">
          <Filter size={14} />
          Limpar filtros
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><FileText size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">128</div>
          <div className="kpi-label">Contratos ativos</div>
          <div className="kpi-title">CONTRATOS MONITORADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Users size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">48</div>
          <div className="kpi-label">Fornecedores</div>
          <div className="kpi-title">FORNECEDORES AVALIADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Gauge size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">428</div>
          <div className="kpi-label">de 500 pontos</div>
          <div className="kpi-title">SCORE MÉDIO</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CalendarCheck size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">35</div>
          <div className="kpi-label">Avaliados em mai/2024</div>
          <div className="kpi-title">CONTRATOS NO MÊS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><DollarSign size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">95%</div>
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
                data={distribuicaoScore}
                cx={100}
                cy={100}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {distribuicaoScore.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="donut-center">
              <span className="donut-pct">58%</span>
            </div>
          </div>
          <div className="donut-legend">
            {distribuicaoScore.map((item, i) => (
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
            <LineChart data={scoreHistorico} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
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
              data={ocorrenciasPorTipo}
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
            <strong>110</strong>
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
              {menoresFornecedores.map((c) => (
                <tr key={c.id}>
                  <td>{c.fornecedorNome}</td>
                  <td>{c.numero}</td>
                  <td>{c.score}</td>
                  <td>{c.pagamento}%</td>
                  <td>
                    <span className={`status-dot-only status-dot-only--${c.faixa}`} />
                  </td>
                </tr>
              ))}
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
            {alertas.map((a, i) => (
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
