import { useState } from 'react';
import {
  Plus, ChevronDown, ChevronUp, Filter, X, Tag, Trash2,
  Upload, Paperclip, Link2, GraduationCap, ExternalLink,
} from 'lucide-react';
import { indicadores } from '../data/mockData';
import { useData } from '../context/DataContext';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';
import type { Ocorrencia, TipoRegistroOcorrencia } from '../types';

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

function criarFormVazio(categoriaPadrao: string) {
  return {
    fornecedorId: '',
    contratoId: '',
    indicadorId: '',
    categoria: categoriaPadrao,
    descricao: '',
    data: '',
    deducao: 25,
    tipoRegistro: 'ocorrencia' as TipoRegistroOcorrencia,
    registradoPor: '',
    link: '',
  };
}

export default function Ocorrencias() {
  const { fornecedores, contratos, ocorrencias, addOcorrencia, categorias, addCategoria, removeCategoria } = useData();

  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroIndicador, setFiltroIndicador] = useState('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCategorias, setShowCategorias] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [form, setForm] = useState(() => criarFormVazio(categorias[0] ?? ''));
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const filtradas = ocorrencias.filter((o) => {
    if (filtroFornecedor !== 'todos' && o.fornecedorId !== filtroFornecedor) return false;
    if (filtroIndicador !== 'todos' && o.indicadorId !== filtroIndicador) return false;
    return true;
  });

  const contratosDoFornecedorSelecionado = contratos.filter((c) => c.fornecedorId === form.fornecedorId);
  const contratoSelecionado = contratos.find((c) => c.id === form.contratoId);
  const fiscaisSugeridos = Array.from(
    new Set(
      [contratoSelecionado?.fiscalTecnico, contratoSelecionado?.fiscalAdministrativo, contratoSelecionado?.fiscalSubstituto]
        .filter((v): v is string => !!v && v.trim() !== '')
    )
  );

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []);
    if (!novos.length) return;

    const grandeDemais = novos.filter((f) => f.size > TAMANHO_MAX_ANEXO);
    const validos = novos.filter((f) => f.size <= TAMANHO_MAX_ANEXO);

    setArquivos((prev) => {
      const combinados = [...prev, ...validos];
      if (combinados.length > MAX_ANEXOS_POR_ENVIO) {
        setErroArquivo(`Você pode anexar no máximo ${MAX_ANEXOS_POR_ENVIO} arquivos.`);
        return combinados.slice(0, MAX_ANEXOS_POR_ENVIO);
      }
      setErroArquivo(grandeDemais.length ? 'Alguns arquivos passaram de 4MB e não foram adicionados.' : '');
      return combinados;
    });
    e.target.value = '';
  };

  const removerArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const fecharModal = () => {
    setShowModal(false);
    setForm(criarFormVazio(categorias[0] ?? ''));
    setArquivos([]);
    setErroArquivo('');
  };

  const handleAdd = async () => {
    if (!form.fornecedorId || !form.descricao) return;
    setSalvando(true);
    const forn = fornecedores.find((f) => f.id === form.fornecedorId);
    const ind = indicadores.find((i) => i.id === form.indicadorId);
    const anexos = arquivos.length ? await arquivosParaAnexos(arquivos) : undefined;
    const nova: Ocorrencia = {
      id: `o${Date.now()}`,
      fornecedorId: form.fornecedorId,
      fornecedorNome: forn?.nome || '',
      contratoId: form.contratoId,
      indicadorId: form.indicadorId,
      indicadorNome: ind?.nome || '',
      categoria: form.categoria,
      descricao: form.descricao,
      data: form.data || new Date().toISOString().split('T')[0],
      deducao: form.tipoRegistro === 'treinamento' ? 0 : form.deducao,
      tipoRegistro: form.tipoRegistro,
      registradoPor: form.registradoPor || undefined,
      link: form.link || undefined,
      anexos,
    };
    addOcorrencia(nova);
    setSalvando(false);
    fecharModal();
  };

  const handleAddCategoria = () => {
    if (!novaCategoria.trim()) return;
    addCategoria(novaCategoria);
    setNovaCategoria('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Ocorrências</h1>
          <p className="page-subtitle">Registro de descumprimentos contratuais e treinamentos de sustentabilidade.</p>
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
          <option value="todos">Todos macroindicadores</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <button className="btn-secondary btn-secondary--sm" onClick={() => setShowCategorias(true)}>
          <Tag size={13} />
          Eixos temáticos
        </button>
        <span className="occurrence-count">{filtradas.length} ocorrência{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      <div className="occurrence-card">
        <h3 className="occurrence-section-title">Ocorrências Recentes</h3>
        <div className="occurrence-list">
          {filtradas.map((o) => {
            const treinamento = o.tipoRegistro === 'treinamento';
            return (
              <div key={o.id} className="occurrence-item">
                <div
                  className="occurrence-item-header"
                  onClick={() => setExpandido(expandido === o.id ? null : o.id)}
                >
                  <div className="occurrence-item-left">
                    <span className="occurrence-date">{formatDate(o.data)}</span>
                    <span className={`badge ${categoriaColors[o.categoria] || 'badge--gray'}`}>{o.categoria}</span>
                    {treinamento && (
                      <span className="badge badge--outline occurrence-badge-treinamento">
                        <GraduationCap size={12} /> Treinamento
                      </span>
                    )}
                    <span className="occurrence-desc">{o.descricao}</span>
                  </div>
                  <div className="occurrence-item-right">
                    {treinamento ? (
                      <span className="occurrence-sem-deducao">Sem dedução</span>
                    ) : (
                      <span className="occurrence-deducao">-{o.deducao}</span>
                    )}
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
                        <span className="detail-label">Macroindicador</span>
                        <span className="detail-value">{o.indicadorNome || '—'}</span>
                      </div>
                      <div>
                        <span className="detail-label">Registrado por</span>
                        <span className="detail-value">{o.registradoPor || '—'}</span>
                      </div>
                      <div>
                        <span className="detail-label">{treinamento ? 'Dedução' : 'Dedução aplicada'}</span>
                        {treinamento ? (
                          <span className="detail-value">Sem dedução — registro de treinamento</span>
                        ) : (
                          <span className="detail-value text-danger">-{o.deducao} pontos</span>
                        )}
                      </div>
                    </div>
                    {(o.link || (o.anexos && o.anexos.length > 0)) && (
                      <div className="occurrence-detail-anexos">
                        {o.link && (
                          <a className="anexo-item-link occurrence-link" href={o.link} target="_blank" rel="noreferrer">
                            <Link2 size={13} /> {o.link} <ExternalLink size={11} />
                          </a>
                        )}
                        {o.anexos && o.anexos.length > 0 && (
                          <div className="anexo-list">
                            {o.anexos.map((anexo) => (
                              <a key={anexo.id} className="anexo-item anexo-item-link" href={anexo.url} target="_blank" rel="noreferrer" download={anexo.nome}>
                                <Paperclip size={13} />
                                <span className="anexo-item-nome">{anexo.nome}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtradas.length === 0 && (
            <div className="empty-state">Nenhuma ocorrência encontrada.</div>
          )}
        </div>
      </div>

      {/* Modal Nova Ocorrência */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nova Ocorrência</h2>
              <button className="modal-close" onClick={fecharModal}><X size={18} /></button>
            </div>

            <div className="form-group form-group--full">
              <label className="form-label">Tipo de registro</label>
              <div className="segmented-toggle">
                <button
                  type="button"
                  className={`segmented-toggle-btn ${form.tipoRegistro === 'ocorrencia' ? 'segmented-toggle-btn--active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, tipoRegistro: 'ocorrencia' }))}
                >
                  Ocorrência (com dedução)
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-btn ${form.tipoRegistro === 'treinamento' ? 'segmented-toggle-btn--active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, tipoRegistro: 'treinamento', deducao: 0 }))}
                >
                  <GraduationCap size={14} /> Treinamento (sem dedução)
                </button>
              </div>
              {form.tipoRegistro === 'treinamento' && (
                <p className="form-hint form-hint--muted">
                  Use quando o caso não precisa de dedução de pontos — apenas uma orientação ou treinamento aplicado ao local.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Fornecedor</label>
              <select
                className="form-input"
                value={form.fornecedorId}
                onChange={(e) => setForm({ ...form, fornecedorId: e.target.value, contratoId: '', registradoPor: '' })}
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contrato</label>
              <select
                className="form-input"
                value={form.contratoId}
                onChange={(e) => setForm({ ...form, contratoId: e.target.value })}
                disabled={!form.fornecedorId}
              >
                <option value="">Selecione...</option>
                {contratosDoFornecedorSelecionado.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}{c.unidade ? ` · ${c.unidade}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Macroindicador</label>
              <select className="form-input" value={form.indicadorId} onChange={(e) => setForm({ ...form, indicadorId: e.target.value })}>
                <option value="">Selecione...</option>
                {indicadores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Eixo temático</label>
              <select className="form-input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {categorias.length === 0 && <option value="">Nenhum eixo cadastrado</option>}
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Registrado por (fiscal)</label>
              <input
                className="form-input"
                list="fiscais-sugeridos-datalist"
                placeholder="Nome do fiscal que constatou/relatou"
                value={form.registradoPor}
                onChange={(e) => setForm({ ...form, registradoPor: e.target.value })}
              />
              <datalist id="fiscais-sugeridos-datalist">
                {fiscaisSugeridos.map((f) => <option key={f} value={f} />)}
              </datalist>
              {contratoSelecionado && fiscaisSugeridos.length > 0 && (
                <p className="form-hint form-hint--muted">Sugestões a partir dos fiscais deste contrato: {fiscaisSugeridos.join(', ')}.</p>
              )}
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Descrição</label>
              <input className="form-input" placeholder="Descreva a ocorrência..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            {form.tipoRegistro === 'ocorrencia' && (
              <div className="form-group">
                <label className="form-label">Dedução (pontos)</label>
                <input type="number" className="form-input" value={form.deducao} onChange={(e) => setForm({ ...form, deducao: Number(e.target.value) })} />
              </div>
            )}

            {form.tipoRegistro === 'treinamento' && (
              <>
                <div className="form-group form-group--full">
                  <label className="form-label">Link (opcional)</label>
                  <input
                    className="form-input"
                    placeholder="Ex: link do material de treinamento, norma ou procedimento"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                  />
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Anexar material (opcional)</label>
                  <label className="file-upload-box">
                    <Upload size={16} />
                    <span>
                      {arquivos.length
                        ? `${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''} selecionado${arquivos.length !== 1 ? 's' : ''}`
                        : 'Selecionar um ou mais arquivos — PDF, imagem ou documento (até 4MB cada)'}
                    </span>
                    <input type="file" multiple accept=".pdf,.doc,.docx,image/*" className="file-upload-input" onChange={handleArquivos} />
                  </label>
                  {arquivos.length > 0 && (
                    <div className="anexo-list">
                      {arquivos.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="anexo-item">
                          <Paperclip size={13} />
                          <span className="anexo-item-nome">{f.name}</span>
                          <button type="button" className="anexo-item-remove" onClick={() => removerArquivo(i)} aria-label="Remover arquivo">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {erroArquivo && <span className="form-hint form-hint--danger">{erroArquivo}</span>}
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleAdd} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar eixos temáticos */}
      {showCategorias && (
        <div className="modal-overlay" onClick={() => setShowCategorias(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Eixos temáticos</h2>
              <button className="modal-close" onClick={() => setShowCategorias(false)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">
              Tags de categoria usadas em ocorrências e macroindicadores (Meio Ambiente, Governança, etc.).
            </p>
            <div className="tag-manage-list">
              {categorias.map((c) => (
                <div key={c} className="tag-manage-item">
                  <span className={`badge ${categoriaColors[c] || 'badge--gray'}`}>{c}</span>
                  <button
                    type="button"
                    className="anexo-item-remove"
                    title="Remover eixo"
                    onClick={() => removeCategoria(c)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {categorias.length === 0 && <p className="empty-state-sm">Nenhum eixo cadastrado ainda.</p>}
            </div>
            <div className="inline-form">
              <input
                className="form-input"
                placeholder="Novo eixo temático — ex: Saúde e Segurança"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategoria(); }}
              />
              <button className="btn-primary" onClick={handleAddCategoria}>
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
