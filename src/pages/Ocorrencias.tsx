import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { ocorrencias, fornecedores, indicadores } from '../data/mockData';
import type { Ocorrencia } from '../types';

const categoriaColors: Record<string, string> = {
  'Meio Ambiente': 'badge--green',
  'Governança': 'badge--gray',
  'Social / Trabalhista': 'badge--blue',
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]}. de ${year}`;
}

export default function Ocorrencias() {
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroIndicador, setFiltroIndicador] = useState('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [lista, setLista] = useState<Ocorrencia[]>(ocorrencias);
  const [form, setForm] = useState({
    fornecedorId: '',
    indicadorId: '',
    categoria: 'Meio Ambiente',
    descricao: '',
    data: '',
    deducao: 25,
  });

  const filtradas = lista.filter((o) => {
    if (filtroFornecedor !== 'todos' && o.fornecedorId !== filtroFornecedor) return false;
    if (filtroIndicador !== 'todos' && o.indicadorId !== filtroIndicador) return false;
    return true;
  });

  const handleAdd = () => {
    if (!form.fornecedorId || !form.descricao) return;
    const forn = fornecedores.find((f) => f.id === form.fornecedorId);
    const ind = indicadores.find((i) => i.id === form.indicadorId);
    const nova: Ocorrencia = {
      id: `o${Date.now()}`,
      fornecedorId: form.fornecedorId,
      fornecedorNome: forn?.nome || '',
      contratoId: '',
      indicadorId: form.indicadorId,
      indicadorNome: ind?.nome || '',
      categoria: form.categoria,
      descricao: form.descricao,
      data: form.data || new Date().toISOString().split('T')[0],
      deducao: form.deducao,
    };
    setLista([nova, ...lista]);
    setForm({ fornecedorId: '', indicadorId: '', categoria: 'Meio Ambiente', descricao: '', data: '', deducao: 25 });
    setShowModal(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Ocorrências</h1>
          <p className="page-subtitle">Registro de descumprimentos contratuais de sustentabilidade.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Nova Ocorrência
        </button>
      </div>

      {/* Filtros */}
      <div className="occurrence-filters">
        <Filter size={14} className="text-muted" />
        <select className="filter-select-plain" value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)}>
          <option value="todos">Todos fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
        <select className="filter-select-plain" value={filtroIndicador} onChange={(e) => setFiltroIndicador(e.target.value)}>
          <option value="todos">Todos indicadores</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <span className="occurrence-count">{filtradas.length} ocorrência{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      <div className="occurrence-card">
        <h3 className="occurrence-section-title">Ocorrências Recentes</h3>
        <div className="occurrence-list">
          {filtradas.map((o) => (
            <div key={o.id} className="occurrence-item">
              <div
                className="occurrence-item-header"
                onClick={() => setExpandido(expandido === o.id ? null : o.id)}
              >
                <div className="occurrence-item-left">
                  <span className="occurrence-date">{formatDate(o.data)}</span>
                  <span className={`badge ${categoriaColors[o.categoria] || 'badge--gray'}`}>{o.categoria}</span>
                  <span className="occurrence-desc">{o.descricao}</span>
                </div>
                <div className="occurrence-item-right">
                  <span className="occurrence-deducao">-{o.deducao}</span>
                  {expandido === o.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {expandido === o.id && (
                <div className="occurrence-item-detail">
                  <div className="occurrence-detail-grid">
                    <div>
                      <span className="detail-label">Fornecedor</span>
                      <span className="detail-value">{o.fornecedorNome}</span>
                    </div>
                    <div>
                      <span className="detail-label">Indicador</span>
                      <span className="detail-value">{o.indicadorNome}</span>
                    </div>
                    <div>
                      <span className="detail-label">Dedução aplicada</span>
                      <span className="detail-value text-danger">-{o.deducao} pontos</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtradas.length === 0 && (
            <div className="empty-state">Nenhuma ocorrência encontrada.</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nova Ocorrência</h2>
            <div className="form-group">
              <label className="form-label">Fornecedor</label>
              <select className="form-input" value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
                <option value="">Selecione...</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Indicador</label>
              <select className="form-input" value={form.indicadorId} onChange={(e) => setForm({ ...form, indicadorId: e.target.value })}>
                <option value="">Selecione...</option>
                {indicadores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option>Meio Ambiente</option>
                <option>Governança</option>
                <option>Social / Trabalhista</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" placeholder="Descreva a ocorrência..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Dedução (pontos)</label>
              <input type="number" className="form-input" value={form.deducao} onChange={(e) => setForm({ ...form, deducao: Number(e.target.value) })} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAdd}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
