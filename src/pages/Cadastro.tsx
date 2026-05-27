import { useState } from 'react';
import {
  Search, Plus, ChevronRight, ChevronDown, Building2,
  MapPin, Phone, User, FileText, Pencil, X,
} from 'lucide-react';
import { fornecedores as dadosIniciais, contratos as dadosContratos } from '../data/mockData';
import type { Fornecedor, Contrato } from '../types';

// ── Modal Novo Fornecedor ─────────────────────────────────────────
function ModalFornecedor({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: Fornecedor) => void;
}) {
  const [form, setForm] = useState({
    nome: '', cnpj: '', endereco: '', telefone: '', preposto: '', observacao: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.nome || !form.cnpj) return;
    onSave({
      id: `f${Date.now()}`,
      nome: form.nome,
      cnpj: form.cnpj,
      contratos: 0,
      score: 500,
      faixa: 'verde',
      endereco: form.endereco,
      telefone: form.telefone,
      preposto: form.preposto,
      observacao: form.observacao,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Fornecedor</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-grid-2">
          <div className="form-group form-group--full">
            <label className="form-label">Razão Social *</label>
            <input className="form-input" placeholder="Ex: Empresa XYZ Ltda." value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">CNPJ *</label>
            <input className="form-input" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input className="form-input" placeholder="(00) 0000-0000" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Endereço</label>
            <input className="form-input" placeholder="Rua, número - Cidade/UF" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Nome do Preposto</label>
            <input className="form-input" placeholder="Responsável pelo contrato" value={form.preposto} onChange={(e) => set('preposto', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Observações</label>
            <textarea className="form-input form-textarea" placeholder="Informações complementares..." value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Novo Contrato ───────────────────────────────────────────
function ModalContrato({
  fornecedores,
  fornecedorId,
  fornecedorNome,
  onClose,
  onSave,
}: {
  fornecedores: Fornecedor[];
  fornecedorId: string;
  fornecedorNome: string;
  onClose: () => void;
  onSave: (c: Contrato) => void;
}) {
  const [form, setForm] = useState({
    fornId: fornecedorId,
    numero: '',
    ano: new Date().getFullYear().toString(),
    objeto: '',
    unidade: '',
    vigenciaInicio: '',
    vigenciaFim: '',
    tipo: 'Contrato Original',
    status: 'ativo' as 'ativo' | 'inativo',
    fiscalTecnico: '',
    fiscalAdministrativo: '',
    fiscalSubstituto: '',
    gestor: '',
    gestorSubstituto: '',
    observacao: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fornSelecionado = fornecedores.find((f) => f.id === form.fornId);

  const handleSave = () => {
    if (!form.numero || !form.fornId) return;
    onSave({
      id: `ct${Date.now()}`,
      fornecedorId: form.fornId,
      fornecedorNome: fornSelecionado?.nome ?? fornecedorNome,
      numero: form.numero,
      ano: form.ano,
      objeto: form.objeto,
      unidade: form.unidade,
      vigenciaInicio: form.vigenciaInicio,
      vigenciaFim: form.vigenciaFim,
      vigencia: form.vigenciaFim,
      tipo: form.tipo,
      fiscalTecnico: form.fiscalTecnico,
      fiscalAdministrativo: form.fiscalAdministrativo,
      fiscalSubstituto: form.fiscalSubstituto,
      gestor: form.gestor,
      gestorSubstituto: form.gestorSubstituto,
      observacao: form.observacao,
      score: 500,
      faixa: 'verde',
      pagamento: 100,
      status: form.status,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modal-subtitle">Dados do contrato administrativo.</p>

        <div className="modal-grid-2">

          {/* Fornecedor */}
          <div className="form-group">
            <label className="form-label">Fornecedor *</label>
            <select className="form-input" value={form.fornId} onChange={(e) => set('fornId', e.target.value)}>
              <option value="">Selecione</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          {/* Objeto */}
          <div className="form-group">
            <label className="form-label">Objeto *</label>
            <select className="form-input" value={form.objeto} onChange={(e) => set('objeto', e.target.value)}>
              <option value="">Selecione</option>
              <option>Serviço de limpeza</option>
              <option>Locação de veículos</option>
              <option>Vigilância orgânica</option>
              <option>Serviços administrativos</option>
              <option>Construção</option>
            </select>
          </div>

          {/* Nº Contrato */}
          <div className="form-group">
            <label className="form-label">Nº Contrato *</label>
            <input className="form-input" placeholder="CT-2024/001" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
          </div>

          {/* Ano */}
          <div className="form-group">
            <label className="form-label">Ano</label>
            <input className="form-input" placeholder="2026" value={form.ano} onChange={(e) => set('ano', e.target.value)} />
          </div>

          {/* Unidade Administrativa */}
          <div className="form-group form-group--full">
            <label className="form-label">Unidade Administrativa</label>
            <input className="form-input" placeholder="Ex: Superintendência de Infraestrutura" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} />
          </div>

          {/* Vigência Início */}
          <div className="form-group">
            <label className="form-label">Vigência Início</label>
            <input className="form-input" type="date" value={form.vigenciaInicio} onChange={(e) => set('vigenciaInicio', e.target.value)} />
          </div>

          {/* Vigência Fim */}
          <div className="form-group">
            <label className="form-label">Vigência Fim</label>
            <input className="form-input" type="date" value={form.vigenciaFim} onChange={(e) => set('vigenciaFim', e.target.value)} />
          </div>

          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              <option>Contrato Original</option>
              <option>Aditivo</option>
              <option>Apostilamento</option>
              <option>Renovação</option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Seção: Fiscalização e Gestão */}
          <div className="form-group form-group--full">
            <p className="form-section-title">Fiscalização e Gestão</p>
          </div>

          <div className="form-group">
            <label className="form-label">Fiscal Técnico</label>
            <input className="form-input" placeholder="Nome do fiscal técnico" value={form.fiscalTecnico} onChange={(e) => set('fiscalTecnico', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Administrativo</label>
            <input className="form-input" placeholder="Nome do fiscal administrativo" value={form.fiscalAdministrativo} onChange={(e) => set('fiscalAdministrativo', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Substituto</label>
            <input className="form-input" placeholder="Nome do fiscal substituto" value={form.fiscalSubstituto} onChange={(e) => set('fiscalSubstituto', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gestor do Contrato</label>
            <input className="form-input" placeholder="Nome do gestor" value={form.gestor} onChange={(e) => set('gestor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gestor Substituto</label>
            <input className="form-input" placeholder="Nome do gestor substituto" value={form.gestorSubstituto} onChange={(e) => set('gestorSubstituto', e.target.value)} />
          </div>

          {/* Observação */}
          <div className="form-group form-group--full">
            <label className="form-label">Observação</label>
            <textarea className="form-input form-textarea" placeholder="Informações adicionais sobre o contrato..." value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />
          </div>

        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Cadastrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Card do Fornecedor ────────────────────────────────────────────
function FornecedorCard({
  fornecedor,
  contratos,
  onAddContrato,
}: {
  fornecedor: Fornecedor;
  contratos: Contrato[];
  onAddContrato: (f: Fornecedor) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`supplier-card-wrapper ${aberto ? 'supplier-card-wrapper--open' : ''}`}>
      {/* Cabeçalho clicável */}
      <div className="supplier-card" onClick={() => setAberto(!aberto)}>
        <div className="supplier-card-icon">
          <Building2 size={20} strokeWidth={1.5} />
        </div>
        <div className="supplier-card-info">
          <div className="supplier-card-name">{fornecedor.nome}</div>
          <div className="supplier-card-meta">
            CNPJ: {fornecedor.cnpj} · {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="supplier-card-score">
          <span className="supplier-score-value">{fornecedor.score}</span>
          <span className="supplier-score-label">pontos</span>
        </div>
        {aberto
          ? <ChevronDown size={18} className="supplier-card-arrow" />
          : <ChevronRight size={18} className="supplier-card-arrow" />
        }
      </div>

      {/* Painel expandido */}
      {aberto && (
        <div className="supplier-detail">
          <div className="supplier-detail-header">
            <span className="supplier-detail-section">Contratos</span>
            <div className="supplier-detail-actions">
              <button className="btn-icon"><Pencil size={14} /> Editar</button>
              <button className="btn-primary btn-primary--sm" onClick={(e) => { e.stopPropagation(); onAddContrato(fornecedor); }}>
                <Plus size={14} /> Contrato
              </button>
            </div>
          </div>

          {/* Dados do fornecedor */}
          {(fornecedor.endereco || fornecedor.telefone || fornecedor.preposto) && (
            <div className="supplier-info-row">
              {fornecedor.endereco && (
                <span className="supplier-info-item">
                  <MapPin size={13} /> {fornecedor.endereco}
                </span>
              )}
              {fornecedor.telefone && (
                <span className="supplier-info-item">
                  <Phone size={13} /> {fornecedor.telefone}
                </span>
              )}
              {fornecedor.preposto && (
                <span className="supplier-info-item">
                  <User size={13} /> Preposto: {fornecedor.preposto}
                </span>
              )}
            </div>
          )}

          {/* Lista de contratos */}
          <div className="contract-list">
            {contratos.length === 0 && (
              <p className="empty-state-sm">Nenhum contrato vinculado.</p>
            )}
            {contratos.map((c) => (
              <div key={c.id} className="contract-item">
                <div className="contract-item-icon">
                  <FileText size={15} strokeWidth={1.5} />
                </div>
                <div className="contract-item-body">
                  <div className="contract-item-num">{c.numero}</div>
                  <div className="contract-item-meta">
                    {[c.objeto, c.unidade].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`contract-status contract-status--${c.status}`}>
                  {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────
export default function Cadastro() {
  const [busca, setBusca] = useState('');
  const [showModalForn, setShowModalForn] = useState(false);
  const [modalContrato, setModalContrato] = useState<Fornecedor | null>(null);
  const [listaForn, setListaForn] = useState<Fornecedor[]>(dadosIniciais);
  const [listaContratos, setListaContratos] = useState<Contrato[]>(dadosContratos);

  const filtrados = listaForn.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj.includes(busca)
  );

  const handleAddFornecedor = (f: Fornecedor) => {
    setListaForn([...listaForn, f]);
    setShowModalForn(false);
  };

  const handleAddContrato = (c: Contrato) => {
    setListaContratos([...listaContratos, c]);
    setListaForn((prev) =>
      prev.map((f) =>
        f.id === c.fornecedorId ? { ...f, contratos: f.contratos + 1 } : f
      )
    );
    setModalContrato(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Cadastro</h1>
          <p className="page-subtitle">Fornecedores e contratos registrados no sistema.</p>
        </div>
      </div>

      <div className="search-bar-row">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="search-input"
          />
        </div>
        <button className="btn-primary" onClick={() => setShowModalForn(true)}>
          <Plus size={16} />
          Novo Fornecedor
        </button>
      </div>

      <div className="list-cards">
        {filtrados.map((f) => (
          <FornecedorCard
            key={f.id}
            fornecedor={f}
            contratos={listaContratos.filter((c) => c.fornecedorId === f.id)}
            onAddContrato={(forn) => setModalContrato(forn)}
          />
        ))}
        {filtrados.length === 0 && (
          <div className="empty-state">Nenhum fornecedor encontrado.</div>
        )}
      </div>

      {showModalForn && (
        <ModalFornecedor onClose={() => setShowModalForn(false)} onSave={handleAddFornecedor} />
      )}

      {modalContrato && (
        <ModalContrato
          fornecedores={listaForn}
          fornecedorId={modalContrato.id}
          fornecedorNome={modalContrato.nome}
          onClose={() => setModalContrato(null)}
          onSave={handleAddContrato}
        />
      )}
    </div>
  );
}
