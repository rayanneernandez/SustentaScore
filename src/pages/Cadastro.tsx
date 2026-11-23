import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Building2, MapPin, Phone, Pencil, X, ArrowRight, MoreHorizontal, Eye, Upload, Paperclip, Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { rotuloAutoria } from '../utils/texto';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';
import { erroTelefone, formatarTelefone } from '../utils/telefone';
import { formatarCNPJ, exibirCNPJ, cnpjCompleto, erroCnpjIncompleto, soDigitos } from '../utils/cnpj';
import ModalDetalheFornecedor from '../components/ModalDetalheFornecedor';
import type { Fornecedor, Anexo } from '../types';

// ── Modal Novo / Editar Fornecedor ────────────────────────────────
function ModalFornecedor({
  fornecedorParaEditar,
  onClose,
}: {
  fornecedorParaEditar?: Fornecedor;
  onClose: () => void;
}) {
  const { addFornecedor, updateFornecedor, fornecedores, buscarFornecedorPorCnpj } = useData();
  const [form, setForm] = useState({
    nome: fornecedorParaEditar?.nome ?? '',
    cnpj: exibirCNPJ(fornecedorParaEditar?.cnpj ?? ''),
    endereco: fornecedorParaEditar?.endereco ?? '',
    telefone: '', // telefone que está sendo digitado agora; os já adicionados ficam em `telefones`
    observacao: fornecedorParaEditar?.observacao ?? '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Telefones: digita um, clica em "Adicionar" (ou Enter) e ele aparece cadastrado logo abaixo; pode ter vários.
  const [telefones, setTelefones] = useState<string[]>(
    (fornecedorParaEditar?.telefone ?? '').split(',').map((t) => formatarTelefone(t.trim())).filter(Boolean),
  );
  const [erroTelefoneAdd, setErroTelefoneAdd] = useState('');
  const adicionarTelefone = (): boolean => {
    const digitado = form.telefone.trim();
    if (!digitado) return true;
    const problema = erroTelefone(digitado);
    if (problema) {
      setErroTelefoneAdd(problema);
      return false;
    }
    if (telefones.includes(digitado)) {
      setErroTelefoneAdd('Este telefone já foi adicionado.');
      return false;
    }
    setTelefones((prev) => [...prev, digitado]);
    set('telefone', '');
    setErroTelefoneAdd('');
    return true;
  };

  // Anexos (opcional): os já salvos (podem ser removidos) + arquivos novos escolhidos agora.
  const [anexosSalvos, setAnexosSalvos] = useState<Anexo[]>(fornecedorParaEditar?.anexos ?? []);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [duplicado, setDuplicado] = useState<Fornecedor | null>(null);
  // Aviso na hora, enquanto digita: o CNPJ completo já existe nesta lista (a conferência no banco acontece ao salvar).
  const jaNaLista = cnpjCompleto(form.cnpj)
    ? fornecedores.find((f) => f.id !== fornecedorParaEditar?.id && soDigitos(f.cnpj) === soDigitos(form.cnpj)) ?? null
    : null;
  const fornecedorRepetido = duplicado && soDigitos(duplicado.cnpj) === soDigitos(form.cnpj) ? duplicado : jaNaLista;
  const erroTelefoneAoDigitar = form.telefone.trim() ? erroTelefone(form.telefone) ?? '' : '';
  const erroCnpj = erroCnpjIncompleto(form.cnpj) ?? '';

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!novos.length) return;
    const grandeDemais = novos.filter((f) => f.size > TAMANHO_MAX_ANEXO);
    const validos = novos.filter((f) => f.size <= TAMANHO_MAX_ANEXO);
    const espaco = MAX_ANEXOS_POR_ENVIO - anexosSalvos.length - arquivos.length;
    if (validos.length > espaco) {
      setErroArquivo(`Cada fornecedor pode ter no máximo ${MAX_ANEXOS_POR_ENVIO} anexos.`);
    } else {
      setErroArquivo(grandeDemais.length ? 'Alguns arquivos passaram de 4MB e não foram adicionados.' : '');
    }
    setArquivos((prev) => [...prev, ...validos.slice(0, Math.max(espaco, 0))]);
  };

  const handleSave = async () => {
    setTentouSalvar(true);
    if (!form.nome || !cnpjCompleto(form.cnpj) || fornecedorRepetido || salvando) return;
    // Telefone digitado e ainda não adicionado: entra junto (se estiver completo); incompleto, avisa.
    const digitado = form.telefone.trim();
    let listaTelefones = telefones;
    if (digitado) {
      const problema = erroTelefone(digitado);
      if (problema) {
        setErroTelefoneAdd(`${problema} Corrija ou apague o telefone para salvar.`);
        return;
      }
      if (!telefones.includes(digitado)) listaTelefones = [...telefones, digitado];
    }
    setSalvando(true);
    const existente = await buscarFornecedorPorCnpj(form.cnpj, fornecedorParaEditar?.id);
    if (existente) {
      setDuplicado(existente);
      setSalvando(false);
      return;
    }
    let novosAnexos: Anexo[] = [];
    if (arquivos.length) {
      try {
        novosAnexos = await arquivosParaAnexos(arquivos);
      } catch {
        setErroArquivo('Não foi possível ler algum dos arquivos. Tente anexar novamente.');
        setSalvando(false);
        return;
      }
    }
    const anexos = [...anexosSalvos, ...novosAnexos];
    // Só envia `anexos` quando há algo a gravar/alterar — assim o cadastro sem anexos não depende da coluna nova no banco.
    const mudouAnexos = novosAnexos.length > 0 || anexos.length !== (fornecedorParaEditar?.anexos ?? []).length;
    const extra = mudouAnexos ? { anexos } : {};
    if (fornecedorParaEditar) {
      updateFornecedor(fornecedorParaEditar.id, { ...form, telefone: listaTelefones.join(', '), ...extra });
    } else {
      addFornecedor({
        id: `f${Date.now()}`,
        contratos: 0,
        score: 500,
        faixa: 'verde',
        ...form,
        telefone: listaTelefones.join(', '),
        ...extra,
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{fornecedorParaEditar ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-grid-2">
          <div className="form-group form-group--full">
            <label className="form-label">Razão Social *</label>
            <input className="form-input" placeholder="Ex: Empresa XYZ Ltda." value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">CNPJ *</label>
            <input
              className="form-input"
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              maxLength={18}
              value={form.cnpj}
              onChange={(e) => set('cnpj', formatarCNPJ(e.target.value))}
            />
            {fornecedorRepetido && (
              <span className="form-hint form-hint--danger">
                Este fornecedor já está cadastrado: {fornecedorRepetido.nome} (CNPJ {exibirCNPJ(fornecedorRepetido.cnpj)}). Não é possível cadastrar o mesmo CNPJ duas vezes.
              </span>
            )}
            {!fornecedorRepetido && (erroCnpj || (tentouSalvar && !form.cnpj)) && (
              <span className="form-hint form-hint--danger">{erroCnpj || 'Informe o CNPJ.'}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <div className="telefone-input-row">
              <input
                className="form-input"
                placeholder="(00) 00000-0000"
                inputMode="tel"
                value={form.telefone}
                onChange={(e) => { set('telefone', formatarTelefone(e.target.value).split(',')[0]); setErroTelefoneAdd(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarTelefone(); } }}
              />
              <button type="button" className="btn-secondary btn-secondary--sm" onClick={adicionarTelefone} disabled={!form.telefone.trim()}>
                <Plus size={13} /> Adicionar
              </button>
            </div>
            {(erroTelefoneAdd || erroTelefoneAoDigitar) && (
              <span className="form-hint form-hint--danger">{erroTelefoneAdd || erroTelefoneAoDigitar}</span>
            )}
            {telefones.length > 0 && (
              <div className="telefone-chips">
                {telefones.map((t) => (
                  <span key={t} className="telefone-chip">
                    <Phone size={12} /> {t}
                    <button type="button" aria-label={`Remover ${t}`} onClick={() => setTelefones((prev) => prev.filter((x) => x !== t))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Endereço</label>
            <input className="form-input" placeholder="Rua, número - Cidade/UF" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Observações</label>
            <textarea className="form-input form-textarea" placeholder="Informações complementares..." value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Anexos (opcional)</label>
            <label className="file-upload-box">
              <Upload size={16} />
              <span>Anexar documentos do fornecedor — PDF, imagem ou documento (até 4MB cada)</span>
              <input type="file" multiple accept=".pdf,.doc,.docx,image/*" className="file-upload-input" onChange={handleArquivos} />
            </label>
            {(anexosSalvos.length > 0 || arquivos.length > 0) && (
              <div className="anexo-list">
                {anexosSalvos.map((a) => (
                  <div key={a.id} className="anexo-item">
                    <Paperclip size={13} />
                    <a className="anexo-item-nome anexo-item-link" href={a.url} target="_blank" rel="noreferrer" download={a.nome}>{a.nome}</a>
                    <button type="button" className="anexo-item-remove" onClick={() => setAnexosSalvos((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Remover anexo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {arquivos.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="anexo-item">
                    <Paperclip size={13} />
                    <span className="anexo-item-nome">{f.name}</span>
                    <button type="button" className="anexo-item-remove" onClick={() => setArquivos((prev) => prev.filter((_, j) => j !== i))} aria-label="Remover arquivo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {erroArquivo && <span className="form-hint form-hint--danger">{erroArquivo}</span>}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={salvando}>
            {fornecedorParaEditar ? 'Salvar alterações' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card do Fornecedor ────────────────────────────────────────────
// Sem painel expansível: tudo fica no próprio cartão — "Ver contratos" (abre a aba Contratos
// já filtrada), "Adicionar contrato" (abre o Novo Contrato com este fornecedor) e o menu "⋯"
// com "Ver detalhes" (modal com informações/pontuação, contratos e ocorrências).
function FornecedorCard({
  fornecedor,
  qtdContratos,
  qtdInativos,
  onVerDetalhes,
  onEditarFornecedor,
}: {
  fornecedor: Fornecedor;
  qtdContratos: number;
  qtdInativos: number;
  onVerDetalhes: (f: Fornecedor) => void;
  onEditarFornecedor: (f: Fornecedor) => void;
}) {
  const { podeEditar: podeEditarPagina, podeCriar: podeCriarPagina, podeVer: podeVerPagina } = useData();
  const podeEditar = podeEditarPagina('cadastro');
  const podeAdicionarContrato = podeCriarPagina('contratos');
  const podeVerContratos = podeVerPagina('contratos');
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = () => setMenuAberto(false);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [menuAberto]);

  return (
    <div className="supplier-card-wrapper supplier-card-wrapper--simples">
      <div className="supplier-card supplier-card--sem-painel">
        <div className="supplier-card-icon">
          <Building2 size={20} strokeWidth={1.5} />
        </div>
        <div className="supplier-card-info">
          <div className="supplier-card-name">{fornecedor.nome}</div>
          <div className="supplier-card-meta">
            CNPJ: {exibirCNPJ(fornecedor.cnpj)} · {qtdContratos} contrato{qtdContratos !== 1 ? 's' : ''}
            {qtdInativos > 0 && (
              <span className="text-muted"> · {qtdInativos} inativo{qtdInativos !== 1 ? 's' : ''}</span>
            )}
            {!!fornecedor.anexos?.length && (
              <span className="contract-item-anexo-icon" title={`${fornecedor.anexos.length} anexo(s)`} style={{ marginLeft: 8 }}>
                <Paperclip size={12} /> {fornecedor.anexos.length}
              </span>
            )}
          </div>
          {rotuloAutoria(fornecedor.criadoPor, fornecedor.criadoEm) && (
            <div className="autoria-linha">{rotuloAutoria(fornecedor.criadoPor, fornecedor.criadoEm)}</div>
          )}
          {(fornecedor.telefone || fornecedor.endereco) && (
            <div className="supplier-card-contato">
              {fornecedor.telefone && (
                <span className="supplier-info-item">
                  <Phone size={12} /> {fornecedor.telefone}
                </span>
              )}
              {fornecedor.endereco && (
                <span className="supplier-info-item">
                  <MapPin size={12} /> {fornecedor.endereco}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="supplier-card-acoes">
          {podeVerContratos && (
            <button
              type="button"
              className="supplier-ver-contratos-btn"
              disabled={qtdContratos === 0}
              onClick={() => navigate('/contratos', { state: { filtrarFornecedorId: fornecedor.id } })}
              title={qtdContratos === 0 ? 'Este fornecedor ainda não tem contratos' : 'Abrir a aba Contratos já filtrada para este fornecedor'}
            >
              Ver contratos <ArrowRight size={13} />
            </button>
          )}
          {podeAdicionarContrato && (
            <button
              type="button"
              className="supplier-atribuir-btn"
              onClick={() => navigate('/contratos', { state: { novoContratoFornecedorId: fornecedor.id } })}
              title="Cadastrar um novo contrato para este fornecedor"
            >
              <Plus size={13} /> Adicionar contrato
            </button>
          )}
          <div className="supplier-menu">
            <button
              type="button"
              className="supplier-menu-btn"
              aria-label="Mais opções"
              title="Mais opções"
              onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuAberto && (
              <div className="supplier-menu-lista" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setMenuAberto(false); onVerDetalhes(fornecedor); }}>
                  <Eye size={14} /> Ver detalhes
                </button>
                {podeEditar && (
                  <button type="button" onClick={() => { setMenuAberto(false); onEditarFornecedor(fornecedor); }}>
                    <Pencil size={14} /> Editar fornecedor
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────
export default function Cadastro() {
  const { fornecedores, contratos, podeCriar: podeCriarPagina, podeEditar: podeEditarPagina } = useData();
  const podeCriar = podeCriarPagina('cadastro');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [buscaContrato, setBuscaContrato] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [showModalForn, setShowModalForn] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [fornecedorDetalheId, setFornecedorDetalheId] = useState<string | null>(null);
  const navigate = useNavigate();
  const fornecedorDetalhe = fornecedores.find((f) => f.id === fornecedorDetalheId) ?? null;

  const filtroContratoAtivo = buscaContrato.trim() !== '' || statusFiltro !== 'todos';

  const contratosFiltrados = contratos.filter((c) => {
    const matchStatus = statusFiltro === 'todos' || c.status === statusFiltro;
    const matchNumero = !buscaContrato || c.numero.toLowerCase().includes(buscaContrato.toLowerCase());
    return matchStatus && matchNumero;
  });

  const idsFornecedorComContrato = new Set(contratosFiltrados.map((c) => c.fornecedorId));

  const fornecedoresFiltrados = fornecedores.filter((f) => {
    const matchFornecedor =
      f.nome.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
      (soDigitos(buscaFornecedor) !== '' && soDigitos(f.cnpj).includes(soDigitos(buscaFornecedor)));
    const matchContrato = !filtroContratoAtivo || idsFornecedorComContrato.has(f.id);
    return matchFornecedor && matchContrato;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Fornecedores</h1>
          <p className="page-subtitle">Fornecedores registrados no sistema. Os contratos são cadastrados e editados na aba Contratos.</p>
        </div>
      </div>

      <div className="search-bar-row">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar fornecedor por nome ou CNPJ..."
            value={buscaFornecedor}
            onChange={(e) => setBuscaFornecedor(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por número do contrato..."
            value={buscaContrato}
            onChange={(e) => setBuscaContrato(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          className="filter-select-input"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativo' | 'inativo')}
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Somente ativos</option>
          <option value="inativo">Somente inativos</option>
        </select>
        {podeCriar && (
          <button className="btn-primary" onClick={() => setShowModalForn(true)}>
            <Plus size={16} />
            Novo Fornecedor
          </button>
        )}
      </div>

      <div className="list-cards">
        {fornecedoresFiltrados.map((f) => (
          <FornecedorCard
            key={f.id}
            fornecedor={f}
            qtdContratos={contratos.filter((c) => c.fornecedorId === f.id).length}
            qtdInativos={contratos.filter((c) => c.fornecedorId === f.id && c.status === 'inativo').length}
            onVerDetalhes={(forn) => setFornecedorDetalheId(forn.id)}
            onEditarFornecedor={(forn) => setFornecedorEditando(forn)}
          />
        ))}
        {fornecedoresFiltrados.length === 0 && (
          <div className="empty-state">Nenhum fornecedor ou contrato encontrado para os filtros atuais.</div>
        )}
      </div>

      {showModalForn && (
        <ModalFornecedor onClose={() => setShowModalForn(false)} />
      )}

      {fornecedorEditando && (
        <ModalFornecedor fornecedorParaEditar={fornecedorEditando} onClose={() => setFornecedorEditando(null)} />
      )}

      {fornecedorDetalhe && (
        <ModalDetalheFornecedor
          fornecedor={fornecedorDetalhe}
          onClose={() => setFornecedorDetalheId(null)}
          onEditar={
            podeEditarPagina('cadastro')
              ? () => { setFornecedorEditando(fornecedorDetalhe); setFornecedorDetalheId(null); }
              : undefined
          }
          onAbrirContrato={(id) => navigate('/contratos', { state: { abrirContratoId: id } })}
        />
      )}
    </div>
  );
}
