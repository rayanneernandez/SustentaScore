import { useState } from 'react';
import { Plus, Recycle, Droplets, Zap, Leaf, Wind, Users, Pencil, Trash2, X } from 'lucide-react';
import { indicadores } from '../data/mockData';
import type { Indicador } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  recycle: <Recycle size={20} strokeWidth={1.5} />,
  droplets: <Droplets size={20} strokeWidth={1.5} />,
  zap: <Zap size={20} strokeWidth={1.5} />,
  leaf: <Leaf size={20} strokeWidth={1.5} />,
  wind: <Wind size={20} strokeWidth={1.5} />,
  users: <Users size={20} strokeWidth={1.5} />,
};

const categoriaColors: Record<string, string> = {
  'Meio Ambiente': 'badge--green',
  'Governança': 'badge--gray',
  'Social / Trabalhista': 'badge--blue',
};

type FormState = { nome: string; descricao: string; categoria: string; tipo: string };
const emptyForm: FormState = { nome: '', descricao: '', categoria: 'Meio Ambiente', tipo: 'Serviço de limpeza' };

export default function Indicadores() {
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [lista, setLista] = useState<Indicador[]>(indicadores);
  const [form, setForm] = useState<FormState>(emptyForm);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

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
    setForm(emptyForm);
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
    setForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    setLista((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Indicadores</h1>
          <p className="page-subtitle">Indicadores de sustentabilidade vinculados aos contratos.</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true); }}>
          <Plus size={16} />
          Novo Indicador
        </button>
      </div>

      <div className="indicators-grid">
        {lista.map((ind) => (
          <div key={ind.id} className="indicator-card">
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
                  onClick={() => handleEdit(ind)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="indicator-action-btn indicator-action-btn--delete"
                  title="Excluir"
                  onClick={() => handleDelete(ind.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="indicator-card-icon">
              {iconMap[ind.icone] || <Leaf size={20} />}
            </div>
            <h3 className="indicator-card-name">{ind.nome}</h3>
            <p className="indicator-card-desc">{ind.descricao}</p>
            <p className="indicator-card-contracts">
              Vinculado a <strong>{ind.contratosVinculados}</strong> contrato{ind.contratosVinculados !== 1 ? 's' : ''} ativo{ind.contratosVinculados !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Modal Novo Indicador */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Indicador</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Indicador *</label>
              <input className="form-input" placeholder="Ex: Gestão de Resíduos" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Eixo Temático *</label>
              <select className="form-input" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                <option>Meio Ambiente</option>
                <option>Governança</option>
                <option>Social / Trabalhista</option>
              </select>
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
              <textarea className="form-input form-textarea" placeholder="Descreva o indicador..." value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAdd}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Indicador */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Indicador</h2>
              <button className="modal-close" onClick={() => setEditando(null)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">Indicador de sustentabilidade vinculado ao contrato.</p>
            <div className="form-group">
              <label className="form-label">Nome do Indicador *</label>
              <input className="form-input" placeholder="Ex: Gestão de Resíduos" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Eixo Temático *</label>
              <select className="form-input" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                <option>Meio Ambiente</option>
                <option>Governança</option>
                <option>Social / Trabalhista</option>
              </select>
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
              <textarea className="form-input form-textarea" placeholder="Descreva o indicador..." value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
