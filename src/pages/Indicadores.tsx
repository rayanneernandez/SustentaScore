import { useMemo, useState } from 'react';
import { Plus, Recycle, Droplets, Zap, Leaf, Wind, Users, Pencil, Trash2, X, Filter, FileText } from 'lucide-react';
import { indicadores } from '../data/mockData';
import { useData } from '../context/DataContext';
import type { Indicador } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  recycle: <Recycle size={16} strokeWidth={1.5} />,
  droplets: <Droplets size={16} strokeWidth={1.5} />,
  zap: <Zap size={16} strokeWidth={1.5} />,
  leaf: <Leaf size={16} strokeWidth={1.5} />,
  wind: <Wind size={16} strokeWidth={1.5} />,
  users: <Users size={16} strokeWidth={1.5} />,
};

const categoriaColors: Record<string, string> = {
  'Meio Ambiente': 'badge--green',
  'Governança': 'badge--gray',
  'Social / Trabalhista': 'badge--blue',
};

type FormState = { nome: string; descricao: string; categoria: string; tipo: string };
const TIPO_PADRAO = 'Serviço de limpeza';

export default function Indicadores() {
  const { contratos, categorias } = useData();
  const criarFormVazio = (): FormState => ({ nome: '', descricao: '', categoria: categorias[0] ?? '', tipo: TIPO_PADRAO });
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [detalhe, setDetalhe] = useState<Indicador | null>(null);
  const [lista, setLista] = useState<Indicador[]>(indicadores);
  const [form, setForm] = useState<FormState>(() => criarFormVazio());
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Opções dos filtros vêm das próprias tags exibidas nos cards, então só aparecem
  // eixos/objetos que realmente existem entre os macroindicadores cadastrados.
  const categoriasDisponiveis = useMemo(
    () => Array.from(new Set(lista.map((i) => i.categoria))).sort(),
    [lista]
  );
  const tiposDisponiveis = useMemo(
    () => Array.from(new Set(lista.map((i) => i.tipo))).sort(),
    [lista]
  );

  const listaFiltrada = lista.filter((i) => {
    if (filtroCategoria !== 'todas' && i.categoria !== filtroCategoria) return false;
    if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    return true;
  });

  /** Um contrato é considerado vinculado ao macroindicador quando o objeto contratual
   * dele corresponde ao objeto contratual do macroindicador e o contrato está ativo. */
  const contratosDoIndicador = (ind: Indicador) =>
    contratos.filter((c) => c.status === 'ativo' && c.objeto === ind.tipo);

  const handleAdd = () => {
    if (!form.nome) return;
    const novo: Indicador = {
      id: `i${Date.now()}`,
      nome: form.nome,
      descricao: form.descricao,
      categoria: form.categoria,
      tipo: form.tipo,
      contratosVinculados: 0,
      icone: 'leaf',
    };
    setLista([...lista, novo]);
    setForm(criarFormVazio());
    setShowModal(false);
  };

  const handleEdit = (ind: Indicador) => {
    setEditando(ind);
    setForm({ nome: ind.nome, descricao: ind.descricao, categoria: ind.categoria, tipo: ind.tipo });
  };

  const handleSaveEdit = () => {
    if (!form.nome || !editando) return;
    setLista((prev) =>
      prev.map((i) =>
        i.id === editando.id
          ? { ...i, nome: form.nome, descricao: form.descricao, categoria: form.categoria, tipo: form.tipo }
          : i
      )
    );
    setEditando(null);
    setForm(criarFormVazio());
  };

  const handleDelete = (id: string) => {
    setLista((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Macroindicadores</h1>
          <p className="page-subtitle">Macroindicadores de sustentabilidade vinculados aos contratos.</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(criarFormVazio()); setShowModal(true); }}>
          <Plus size={16} />
          Novo Macroindicador
        </button>
      </div>

      {/* Filtros por tag (eixo temático e objeto contratual) */}
      <div className="occurrence-filters">
        <Filter size={14} className="text-muted" />
        <select className="filter-select-plain" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="todas">Todos os eixos</option>
          {categoriasDisponiveis.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="filter-select-plain" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os objetos</option>
          {tiposDisponiveis.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="occurrence-count">
          {listaFiltrada.length} macroindicador{listaFiltrada.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="indicators-grid">
        {listaFiltrada.map((ind) => {
          return (
            <div key={ind.id} className="indicator-card" onClick={() => setDetalhe(ind)}>
              <div className="indicator-card-top">
                <div className="indicator-card-badges">
                  <span className={`badge ${categoriaColors[ind.categoria] || 'badge--gray'}`}>
                    {ind.categoria}
                  </span>
                  <span className="badge badge--outline">{ind.tipo}</span>
                </div>
                <div className="indicator-card-actions">
                  <button
                    className="indicator-action-btn"
                    title="Editar"
                    onClick={(e) => { e.stopPropagation(); handleEdit(ind); }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="indicator-action-btn indicator-action-btn--delete"
                    title="Excluir"
                    onClick={(e) => { e.stopPropagation(); handleDelete(ind.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="indicator-card-heading">
                <div className="indicator-card-icon">
                  {iconMap[ind.icone] || <Leaf size={16} />}
                </div>
                <h3 className="indicator-card-name">{ind.nome}</h3>
              </div>
              <p className="indicator-card-desc">{ind.descricao}</p>
            </div>
          );
        })}
        {listaFiltrada.length === 0 && (
          <p className="empty-state-sm">Nenhum macroindicador encontrado para o filtro atual.</p>
        )}
      </div>

      {/* Modal Novo Macroindicador */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Macroindicador</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Macroindicador *</label>
              <input className="form-input" placeholder="Ex: Gestão de Resíduos" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Eixo Temático *</label>
              <select className="form-input" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {categorias.length === 0 && <option value="">Nenhum eixo cadastrado</option>}
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="form-hint form-hint--muted">
                Eixos são cadastrados na tela de Ocorrências, em "Eixos temáticos".
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Objeto Contratual *</label>
              <select className="form-input" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option>Serviço de limpeza</option>
                <option>Locação de veículos</option>
                <option>Vigilância orgânica</option>
                <option>Serviços administrativos</option>
                <option>Construção</option>
                <option>Geral</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input form-textarea" placeholder="Descreva o macroindicador..." value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAdd}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Macroindicador */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Macroindicador</h2>
              <button className="modal-close" onClick={() => setEditando(null)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">Macroindicador de sustentabilidade vinculado ao contrato.</p>
            <div className="form-group">
              <label className="form-label">Nome do Macroindicador *</label>
              <input className="form-input" placeholder="Ex: Gestão de Resíduos" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Eixo Temático *</label>
              <select className="form-input" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {categorias.length === 0 && <option value="">Nenhum eixo cadastrado</option>}
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="form-hint form-hint--muted">
                Eixos são cadastrados na tela de Ocorrências, em "Eixos temáticos".
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Objeto Contratual *</label>
              <select className="form-input" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option>Serviço de limpeza</option>
                <option>Locação de veículos</option>
                <option>Vigilância orgânica</option>
                <option>Serviços administrativos</option>
                <option>Construção</option>
                <option>Geral</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input form-textarea" placeholder="Descreva o macroindicador..." value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe: contratos vinculados ao macroindicador */}
      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{detalhe.nome}</h2>
              <button className="modal-close" onClick={() => setDetalhe(null)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">{detalhe.descricao}</p>
            <div className="indicator-card-badges" style={{ marginBottom: 14 }}>
              <span className={`badge ${categoriaColors[detalhe.categoria] || 'badge--gray'}`}>
                {detalhe.categoria}
              </span>
              <span className="badge badge--outline">{detalhe.tipo}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Contratos vinculados</span>
              {contratosDoIndicador(detalhe).length === 0 ? (
                <p className="empty-state-sm">Nenhum contrato ativo com este objeto contratual.</p>
              ) : (
                <div className="contract-list" style={{ marginTop: 8 }}>
                  {contratosDoIndicador(detalhe).map((c) => (
                    <div key={c.id} className="contract-item contract-item--static">
                      <div className="contract-item-icon">
                        <FileText size={15} strokeWidth={1.5} />
                      </div>
                      <div className="contract-item-body">
                        <div className="contract-item-num">
                          <span
                            className={`status-dot-only status-dot-only--${c.faixa}`}
                            title={`Score: ${c.score} pontos`}
                          />
                          {c.numero}
                        </div>
                        <div className="contract-item-meta">
                          {[c.fornecedorNome, c.unidade].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
