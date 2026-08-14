import { useMemo, useState } from 'react';
import {
  Search, Plus, ChevronRight, ChevronDown, Building2,
  MapPin, Phone, User, FileText, Pencil, X, Paperclip,
  Upload, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  ExternalLink, History, Power, PowerOff, Trash2,
} from 'lucide-react';
import { useData, statusVigencia, diasParaVencimento, formatarDataBR, criarEventoHistorico, ALERTA_DIAS_PADRAO } from '../context/DataContext';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';
import { medicoes } from '../data/mockData';
import type { Fornecedor, Contrato, HistoricoTipo, Anexo } from '../types';

// ── Modal Novo / Editar Fornecedor ────────────────────────────────
function ModalFornecedor({
  fornecedorParaEditar,
  onClose,
}: {
  fornecedorParaEditar?: Fornecedor;
  onClose: () => void;
}) {
  const { addFornecedor, updateFornecedor } = useData();
  const [form, setForm] = useState({
    nome: fornecedorParaEditar?.nome ?? '',
    cnpj: fornecedorParaEditar?.cnpj ?? '',
    endereco: fornecedorParaEditar?.endereco ?? '',
    telefone: fornecedorParaEditar?.telefone ?? '',
    preposto: fornecedorParaEditar?.preposto ?? '',
    observacao: fornecedorParaEditar?.observacao ?? '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.nome || !form.cnpj) return;
    if (fornecedorParaEditar) {
      updateFornecedor(fornecedorParaEditar.id, { ...form });
    } else {
      addFornecedor({
        id: `f${Date.now()}`,
        contratos: 0,
        score: 500,
        faixa: 'verde',
        ...form,
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
          <button className="btn-primary" onClick={handleSave}>
            {fornecedorParaEditar ? 'Salvar alterações' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const CAMPO_CONTRATO_LABEL: Record<string, string> = {
  numero: 'Número', ano: 'Ano', objeto: 'Objeto', unidade: 'Unidade Administrativa',
  vigenciaInicio: 'Vigência Início', vigenciaFim: 'Vigência Fim', tipo: 'Tipo', status: 'Status',
  fiscalTecnico: 'Fiscal Técnico', fiscalAdministrativo: 'Fiscal Administrativo',
  fiscalSubstituto: 'Fiscal Substituto', gestor: 'Gestor', gestorSubstituto: 'Gestor Substituto',
  observacao: 'Observação',
};

// ── Modal Novo / Editar Contrato ──────────────────────────────────
function ModalContrato({
  fornecedores,
  fornecedorId,
  fornecedorNome,
  contratoParaEditar,
  onClose,
}: {
  fornecedores: Fornecedor[];
  fornecedorId: string;
  fornecedorNome: string;
  contratoParaEditar?: Contrato;
  onClose: () => void;
}) {
  const { addContrato, updateContrato, objetosContratuais } = useData();
  const valoresIniciais = {
    fornId: contratoParaEditar?.fornecedorId ?? fornecedorId,
    numero: contratoParaEditar?.numero ?? '',
    ano: contratoParaEditar?.ano ?? new Date().getFullYear().toString(),
    objeto: contratoParaEditar?.objeto ?? '',
    unidade: contratoParaEditar?.unidade ?? '',
    vigenciaInicio: contratoParaEditar?.vigenciaInicio ?? '',
    vigenciaFim: contratoParaEditar?.vigenciaFim ?? '',
    tipo: contratoParaEditar?.tipo ?? 'Contrato Original',
    status: (contratoParaEditar?.status ?? 'ativo') as 'ativo' | 'inativo',
    fiscalTecnico: contratoParaEditar?.fiscalTecnico ?? '',
    fiscalAdministrativo: contratoParaEditar?.fiscalAdministrativo ?? '',
    fiscalSubstituto: contratoParaEditar?.fiscalSubstituto ?? '',
    gestor: contratoParaEditar?.gestor ?? '',
    gestorSubstituto: contratoParaEditar?.gestorSubstituto ?? '',
    observacao: contratoParaEditar?.observacao ?? '',
  };
  const [form, setForm] = useState(valoresIniciais);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fornSelecionado = fornecedores.find((f) => f.id === form.fornId);

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []);
    if (!novos.length) return;

    const grandeDemais = novos.filter((f) => f.size > TAMANHO_MAX_ANEXO);
    const validos = novos.filter((f) => f.size <= TAMANHO_MAX_ANEXO);

    setArquivos((prev) => {
      const combinados = [...prev, ...validos];
      if (combinados.length > MAX_ANEXOS_POR_ENVIO) {
        setErroArquivo(`Você pode anexar no máximo ${MAX_ANEXOS_POR_ENVIO} arquivos por contrato.`);
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

  const handleSave = async () => {
    if (!form.numero || !form.fornId) return;
    setSalvando(true);

    if (contratoParaEditar) {
      const camposAlterados = Object.keys(CAMPO_CONTRATO_LABEL).filter(
        (k) => valoresIniciais[k as keyof typeof valoresIniciais] !== form[k as keyof typeof form]
      );
      const patch: Partial<Contrato> = {
        numero: form.numero,
        ano: form.ano,
        objeto: form.objeto,
        unidade: form.unidade,
        vigenciaInicio: form.vigenciaInicio,
        vigenciaFim: form.vigenciaFim,
        vigencia: form.vigenciaFim,
        tipo: form.tipo,
        status: form.status,
        fiscalTecnico: form.fiscalTecnico,
        fiscalAdministrativo: form.fiscalAdministrativo,
        fiscalSubstituto: form.fiscalSubstituto,
        gestor: form.gestor,
        gestorSubstituto: form.gestorSubstituto,
        observacao: form.observacao,
      };
      if (camposAlterados.length > 0) {
        updateContrato(contratoParaEditar.id, patch, {
          tipo: 'edicao',
          descricao: `Dados do contrato atualizados: ${camposAlterados.map((k) => CAMPO_CONTRATO_LABEL[k]).join(', ')}.`,
        });
      }
      setSalvando(false);
      onClose();
      return;
    }

    const historico = [
      criarEventoHistorico('criacao', `Contrato cadastrado (${form.tipo}).`),
    ];

    let anexos: Anexo[] = [];
    if (arquivos.length) {
      try {
        anexos = await arquivosParaAnexos(arquivos);
        historico.push(criarEventoHistorico(
          'anexo',
          arquivos.length === 1
            ? `Arquivo "${arquivos[0].name}" anexado no cadastro.`
            : `${arquivos.length} arquivos anexados no cadastro: ${arquivos.map((a) => a.name).join(', ')}.`
        ));
      } catch {
        setErroArquivo('Não foi possível ler algum dos arquivos anexados. O contrato será salvo sem eles.');
      }
    }

    addContrato({
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
      alertaDiasAntes: ALERTA_DIAS_PADRAO,
      historico,
      anexos,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{contratoParaEditar ? 'Editar Contrato' : 'Novo Contrato'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modal-subtitle">Dados do contrato administrativo.</p>

        <div className="modal-grid-2">

          {/* Fornecedor */}
          <div className="form-group">
            <label className="form-label">Fornecedor *</label>
            {contratoParaEditar ? (
              <input className="form-input" value={fornSelecionado?.nome ?? fornecedorNome} disabled />
            ) : (
              <select className="form-input" value={form.fornId} onChange={(e) => set('fornId', e.target.value)}>
                <option value="">Selecione</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Objeto */}
          <div className="form-group">
            <label className="form-label">Objeto *</label>
            <select className="form-input" value={form.objeto} onChange={(e) => set('objeto', e.target.value)}>
              <option value="">Selecione</option>
              {objetosContratuais.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <p className="form-hint form-hint--muted">
              Objetos são cadastrados na tela de Aspectos de Sustentabilidade, em "Objetos contratuais".
            </p>
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
            <span className="form-hint">Você poderá prorrogar essa data depois, direto no detalhe do contrato.</span>
          </div>

          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              <option>Contrato Original</option>
              <option>Aditivo</option>
              <option>Apostilamento</option>
            </select>
            <p className="form-hint form-hint--muted">
              Renovação de vigência não é um tipo de contrato — use "Prorrogar vigência" no detalhe do contrato.
            </p>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value as 'ativo' | 'inativo')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Anexo */}
          {contratoParaEditar ? (
            <div className="form-group form-group--full">
              <label className="form-label">Anexos</label>
              <p className="form-hint form-hint--muted" style={{ marginTop: 0 }}>
                Para anexar, substituir ou remover arquivos deste contrato, use a seção "Contratos Anexados" no detalhe do contrato.
              </p>
            </div>
          ) : (
            <div className="form-group form-group--full">
              <label className="form-label">Anexar contrato assinado / ativo</label>
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
          )}

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
          <button className="btn-primary" onClick={handleSave} disabled={salvando}>
            {salvando ? 'Salvando...' : contratoParaEditar ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge de vigência (alerta de vencimento) ───────────────────────
function BadgeVigencia({ contrato }: { contrato: Contrato }) {
  const status = statusVigencia(contrato);
  if (!status) return null;
  const dias = diasParaVencimento(contrato.vigenciaFim);

  if (status === 'vencido') {
    return (
      <span className="vigencia-badge vigencia-badge--vencido">
        <AlertTriangle size={12} /> Vencido há {Math.abs(dias ?? 0)} dia{Math.abs(dias ?? 0) !== 1 ? 's' : ''}
      </span>
    );
  }
  if (status === 'alerta') {
    return (
      <span className="vigencia-badge vigencia-badge--alerta">
        <Clock size={12} /> Renovar até {formatarDataBR(contrato.vigenciaFim)} · faltam {dias} dia{dias !== 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="vigencia-badge vigencia-badge--ok">
      <CheckCircle2 size={12} /> Vigente até {formatarDataBR(contrato.vigenciaFim)}
    </span>
  );
}

const rotuloTipoHistorico: Record<HistoricoTipo, string> = {
  criacao: 'Criação',
  edicao: 'Edição',
  status: 'Status',
  prorrogacao: 'Prorrogação',
  anexo: 'Anexo',
  observacao: 'Observação',
};

// ── Modal Detalhe do Contrato ───────────────────────────────────────
function ModalDetalheContrato({
  contrato,
  onClose,
  onEditar,
}: {
  contrato: Contrato;
  onClose: () => void;
  onEditar: (c: Contrato) => void;
}) {
  const { updateContrato, podeEditar: podeEditarPagina, podeExcluir: podeExcluirPagina } = useData();
  const podeEditar = podeEditarPagina('cadastro');
  const podeExcluir = podeExcluirPagina('cadastro');
  const [mostrarProrrogacao, setMostrarProrrogacao] = useState(false);
  const [novaData, setNovaData] = useState(contrato.vigenciaFim ?? '');
  const [motivo, setMotivo] = useState('');
  const [erroArquivo, setErroArquivo] = useState('');
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  const status = statusVigencia(contrato);
  const dias = diasParaVencimento(contrato.vigenciaFim);

  const alternarStatus = () => {
    const novoStatus = contrato.status === 'ativo' ? 'inativo' : 'ativo';
    updateContrato(contrato.id, { status: novoStatus }, {
      tipo: 'status',
      descricao: novoStatus === 'inativo'
        ? 'Contrato marcado como inativo — deixou de contar no cálculo do score.'
        : 'Contrato reativado — volta a contar no cálculo do score.',
    });
  };

  const confirmarProrrogacao = () => {
    if (!novaData) return;
    const dataAnterior = formatarDataBR(contrato.vigenciaFim);
    updateContrato(contrato.id, { vigenciaFim: novaData, vigencia: novaData }, {
      tipo: 'prorrogacao',
      descricao: `Vigência prorrogada de ${dataAnterior} para ${formatarDataBR(novaData)}.${motivo ? ` Motivo: ${motivo}` : ''}`,
    });
    setMostrarProrrogacao(false);
    setMotivo('');
  };

  const alterarAlerta = (valor: number) => {
    updateContrato(contrato.id, { alertaDiasAntes: valor }, {
      tipo: 'edicao',
      descricao: `Prazo de alerta de renovação ajustado para ${valor} dias antes do vencimento.`,
    });
  };

  const anexosAtuais = contrato.anexos ?? [];

  const handleArquivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []);
    if (!novos.length) return;

    const grandeDemais = novos.filter((f) => f.size > TAMANHO_MAX_ANEXO);
    const validos = novos.filter((f) => f.size <= TAMANHO_MAX_ANEXO);

    if (anexosAtuais.length + validos.length > MAX_ANEXOS_POR_ENVIO) {
      setErroArquivo(`Este contrato pode ter no máximo ${MAX_ANEXOS_POR_ENVIO} anexos.`);
      e.target.value = '';
      return;
    }

    setErroArquivo(grandeDemais.length ? 'Alguns arquivos passaram de 4MB e não foram anexados.' : '');
    if (!validos.length) {
      e.target.value = '';
      return;
    }

    setEnviandoArquivo(true);
    try {
      const novosAnexos = await arquivosParaAnexos(validos);
      updateContrato(contrato.id, {
        anexos: [...anexosAtuais, ...novosAnexos],
      }, {
        tipo: 'anexo',
        descricao: validos.length === 1
          ? `Arquivo "${validos[0].name}" anexado ao contrato.`
          : `${validos.length} arquivos anexados ao contrato: ${validos.map((a) => a.name).join(', ')}.`,
      });
    } catch {
      setErroArquivo('Não foi possível ler algum desses arquivos.');
    } finally {
      setEnviandoArquivo(false);
      e.target.value = '';
    }
  };

  const removerAnexo = (anexo: Anexo) => {
    updateContrato(contrato.id, {
      anexos: anexosAtuais.filter((a) => a.id !== anexo.id),
    }, {
      tipo: 'anexo',
      descricao: `Arquivo "${anexo.nome}" removido do contrato.`,
    });
  };

  const historicoOrdenado = [...(contrato.historico ?? [])].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  // Histórico mensal de score — fica disponível mesmo com o contrato inativo, como
  // informação gerencial para avaliar o desempenho do fornecedor em futuras contratações.
  const historicoScore = medicoes.filter((m) => m.contratoId === contrato.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{contrato.numero}</h2>
            <p className="modal-subtitle" style={{ margin: '2px 0 0' }}>{contrato.fornecedorNome} · {contrato.objeto}</p>
          </div>
          <div className="detail-block-row" style={{ flexWrap: 'nowrap' }}>
            {podeEditar && (
              <button className="btn-icon" onClick={() => onEditar(contrato)}>
                <Pencil size={14} /> Editar dados
              </button>
            )}
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Status */}
        <div className="detail-block">
          <div className="detail-block-row">
            <span className={`contract-status contract-status--${contrato.status}`}>
              {contrato.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
            {podeEditar && (
              <button className="btn-icon" onClick={alternarStatus}>
                {contrato.status === 'ativo' ? <PowerOff size={14} /> : <Power size={14} />}
                {contrato.status === 'ativo' ? 'Inativar contrato' : 'Reativar contrato'}
              </button>
            )}
          </div>
          {contrato.status === 'inativo' && (
            <p className="form-hint form-hint--muted">
              Este contrato está inativo e não é contabilizado no score do fornecedor nem nos indicadores gerenciais.
            </p>
          )}
        </div>

        {/* Vigência */}
        <div className="detail-block">
          <p className="form-section-title" style={{ marginTop: 0 }}>Vigência</p>
          <div className="detail-block-row">
            <div>
              <span className="detail-label">Início</span>
              <span className="detail-value">{formatarDataBR(contrato.vigenciaInicio)}</span>
            </div>
            <div>
              <span className="detail-label">Fim</span>
              <span className="detail-value">{formatarDataBR(contrato.vigenciaFim)}</span>
            </div>
            <div>
              <BadgeVigencia contrato={contrato} />
            </div>
          </div>

          {contrato.status === 'ativo' && (status === 'alerta' || status === 'vencido') && (
            <p className="form-hint form-hint--warning">
              {status === 'vencido'
                ? `Este contrato venceu há ${Math.abs(dias ?? 0)} dia(s). Renove a vigência ou inative o contrato.`
                : `Faltam ${dias} dia(s) para o fim da vigência — renove até ${formatarDataBR(contrato.vigenciaFim)} para evitar interrupção.`}
            </p>
          )}

          {podeEditar && (
            <div className="detail-block-row" style={{ marginTop: 10 }}>
              <button className="btn-secondary btn-secondary--sm" onClick={() => setMostrarProrrogacao((v) => !v)}>
                <RefreshCw size={13} /> Prorrogar vigência
              </button>
              <div className="form-group" style={{ gap: 3 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Alertar com quantos dias de antecedência?</label>
                <select
                  className="filter-select-plain"
                  style={{ minWidth: 110, padding: '5px 10px' }}
                  value={contrato.alertaDiasAntes ?? ALERTA_DIAS_PADRAO}
                  onChange={(e) => alterarAlerta(Number(e.target.value))}
                >
                  {[15, 30, 45, 60, 90].map((d) => (
                    <option key={d} value={d}>{d} dias</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {podeEditar && mostrarProrrogacao && (
            <div className="inline-form">
              <div className="form-group">
                <label className="form-label">Nova data de vigência fim</label>
                <input className="form-input" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo / observação (opcional)</label>
                <input className="form-input" placeholder="Ex: Aditivo de prazo nº 02" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button className="btn-secondary" onClick={() => setMostrarProrrogacao(false)}>Cancelar</button>
                <button className="btn-primary" onClick={confirmarProrrogacao}>Confirmar prorrogação</button>
              </div>
            </div>
          )}
        </div>

        {/* Anexos */}
        <div className="detail-block">
          <p className="form-section-title" style={{ marginTop: 0 }}>
            Contratos Anexados {anexosAtuais.length > 0 && `(${anexosAtuais.length})`}
          </p>

          {anexosAtuais.length > 0 && (
            <div className="anexo-list">
              {anexosAtuais.map((anexo) => (
                <div key={anexo.id} className="anexo-item">
                  <Paperclip size={13} />
                  <a className="anexo-item-nome anexo-item-link" href={anexo.url} target="_blank" rel="noreferrer" download={anexo.nome}>
                    {anexo.nome} <ExternalLink size={11} />
                  </a>
                  {podeExcluir && (
                    <button type="button" className="anexo-item-remove" onClick={() => removerAnexo(anexo)} aria-label="Remover anexo">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {podeEditar && (
            <>
              <label className="file-upload-box" style={{ marginTop: anexosAtuais.length > 0 ? 10 : 0 }}>
                <Upload size={16} />
                <span>{enviandoArquivo ? 'Enviando...' : 'Anexar mais arquivos (PDF, imagem ou documento, até 4MB cada)'}</span>
                <input type="file" multiple accept=".pdf,.doc,.docx,image/*" className="file-upload-input" onChange={handleArquivos} />
              </label>
              {erroArquivo && <span className="form-hint form-hint--danger">{erroArquivo}</span>}
            </>
          )}
        </div>

        {/* Histórico de Score — visível mesmo com o contrato inativo, como informação
         * gerencial para avaliar o fornecedor em futuras contratações. */}
        {historicoScore.length > 0 && (
          <div className="detail-block">
            <p className="form-section-title" style={{ marginTop: 0 }}>Histórico de Score</p>
            {contrato.status === 'inativo' && (
              <p className="form-hint form-hint--muted" style={{ marginTop: -4 }}>
                Contrato inativo — histórico mantido apenas como referência de desempenho passado.
              </p>
            )}
            <div className="score-history">
              {historicoScore.map((m) => (
                <div key={m.id} className="score-history-row">
                  <div className="history-period">{m.periodo}</div>
                  <div className="history-meta">
                    Score: {m.score} · {m.pagamento}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                  </div>
                  <div className={`history-status history-status--${m.status}`}>
                    {m.status === 'liberado' ? 'Liberado' : m.status === 'pendente' ? 'Pendente' : 'Bloqueado'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico */}
        <div className="detail-block">
          <p className="form-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={14} /> Histórico do contrato
          </p>
          <div className="historico-list">
            {historicoOrdenado.length === 0 && (
              <p className="empty-state-sm">Sem eventos registrados ainda.</p>
            )}
            {historicoOrdenado.map((ev) => (
              <div key={ev.id} className="historico-item">
                <span className={`historico-tag historico-tag--${ev.tipo}`}>{rotuloTipoHistorico[ev.tipo]}</span>
                <div className="historico-item-body">
                  <p className="historico-desc">{ev.descricao}</p>
                  <p className="historico-data">
                    {new Date(ev.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Card do Fornecedor ────────────────────────────────────────────
function FornecedorCard({
  fornecedor,
  contratosFornecedor,
  contratosExibidos,
  forcarAberto,
  onAddContrato,
  onAbrirContrato,
  onEditarFornecedor,
  onEditarContrato,
}: {
  fornecedor: Fornecedor;
  contratosFornecedor: Contrato[];
  contratosExibidos: Contrato[];
  forcarAberto: boolean;
  onAddContrato: (f: Fornecedor) => void;
  onAbrirContrato: (c: Contrato) => void;
  onEditarFornecedor: (f: Fornecedor) => void;
  onEditarContrato: (c: Contrato) => void;
}) {
  const { scoreFornecedor, podeCriar: podeCriarPagina, podeEditar: podeEditarPagina } = useData();
  const podeCriar = podeCriarPagina('cadastro');
  const podeEditar = podeEditarPagina('cadastro');
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = forcarAberto || abertoLocal;

  const contratosAtivos = contratosFornecedor.filter((c) => c.status === 'ativo');
  const contratosInativos = contratosFornecedor.filter((c) => c.status === 'inativo');
  const score = scoreFornecedor(fornecedor.id);

  // Um mesmo fornecedor (mesmo CNPJ) pode ter contratos ativos em unidades
  // administrativas diferentes — aqui quebramos a média do score por unidade,
  // além da média geral já mostrada no cabeçalho do card.
  const scorePorUnidade = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    for (const c of contratosAtivos) {
      if (!c.unidade) continue;
      const atual = mapa.get(c.unidade) ?? { total: 0, qtd: 0 };
      atual.total += c.score;
      atual.qtd += 1;
      mapa.set(c.unidade, atual);
    }
    return Array.from(mapa.entries()).map(([unidade, { total, qtd }]) => ({
      unidade,
      media: Math.round(total / qtd),
      qtd,
    }));
  }, [contratosAtivos]);

  return (
    <div className={`supplier-card-wrapper ${aberto ? 'supplier-card-wrapper--open' : ''}`}>
      {/* Cabeçalho clicável */}
      <div className="supplier-card" onClick={() => setAbertoLocal((v) => !v)}>
        <div className="supplier-card-icon">
          <Building2 size={20} strokeWidth={1.5} />
        </div>
        <div className="supplier-card-info">
          <div className="supplier-card-name">{fornecedor.nome}</div>
          <div className="supplier-card-meta">
            CNPJ: {fornecedor.cnpj} · {contratosFornecedor.length} contrato{contratosFornecedor.length !== 1 ? 's' : ''}
            {contratosInativos.length > 0 && (
              <span className="text-muted"> · {contratosInativos.length} inativo{contratosInativos.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="supplier-card-score">
          <span className="supplier-score-value">{score ?? '—'}</span>
          <span className="supplier-score-label">{score !== null ? 'pontos' : 'sem contrato ativo'}</span>
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
            {(podeEditar || podeCriar) && (
              <div className="supplier-detail-actions">
                {podeEditar && (
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEditarFornecedor(fornecedor); }}>
                    <Pencil size={14} /> Editar
                  </button>
                )}
                {podeCriar && (
                  <button className="btn-primary btn-primary--sm" onClick={(e) => { e.stopPropagation(); onAddContrato(fornecedor); }}>
                    <Plus size={14} /> Contrato
                  </button>
                )}
              </div>
            )}
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

          {/* Score por unidade — só faz sentido mostrar quando o fornecedor tem
           * contratos ativos em mais de uma unidade administrativa. */}
          {scorePorUnidade.length > 1 && (
            <div className="supplier-score-unidade">
              <span className="supplier-score-unidade-titulo">Score por unidade</span>
              <div className="supplier-score-unidade-list">
                {scorePorUnidade.map((u) => (
                  <div key={u.unidade} className="supplier-score-unidade-item">
                    <span className="supplier-score-unidade-nome">{u.unidade}</span>
                    <span className="supplier-score-unidade-valor">
                      {u.media} pts{u.qtd > 1 ? ` (média de ${u.qtd} contratos)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de contratos */}
          <div className="contract-list">
            {contratosExibidos.length === 0 && (
              <p className="empty-state-sm">Nenhum contrato encontrado para o filtro atual.</p>
            )}
            {contratosExibidos.map((c) => (
              <div key={c.id} className="contract-item" onClick={() => onAbrirContrato(c)}>
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
                    {!!c.anexos?.length && (
                      <span className="contract-item-anexo-icon" title={`${c.anexos.length} anexo(s)`}>
                        <Paperclip size={12} /> {c.anexos.length}
                      </span>
                    )}
                  </div>
                  <div className="contract-item-meta">
                    {[c.objeto, c.unidade].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`contract-item-score contract-item-score--${c.faixa}`}>{c.score} pts</span>
                <BadgeVigencia contrato={c} />
                {podeEditar && (
                  <button
                    className="contract-item-edit-btn"
                    title="Editar dados do contrato"
                    onClick={(e) => { e.stopPropagation(); onEditarContrato(c); }}
                  >
                    <Pencil size={13} />
                  </button>
                )}
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
  const { fornecedores, contratos, podeCriar: podeCriarPagina } = useData();
  const podeCriar = podeCriarPagina('cadastro');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [buscaContrato, setBuscaContrato] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [showModalForn, setShowModalForn] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [modalContrato, setModalContrato] = useState<Fornecedor | null>(null);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [contratoDetalheId, setContratoDetalheId] = useState<string | null>(null);

  const contratoDetalhe = contratos.find((c) => c.id === contratoDetalheId) ?? null;

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
      f.cnpj.includes(buscaFornecedor);
    const matchContrato = !filtroContratoAtivo || idsFornecedorComContrato.has(f.id);
    return matchFornecedor && matchContrato;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Fornecedores</h1>
          <p className="page-subtitle">Fornecedores e contratos registrados no sistema.</p>
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
            contratosFornecedor={contratos.filter((c) => c.fornecedorId === f.id)}
            contratosExibidos={contratosFiltrados.filter((c) => c.fornecedorId === f.id)}
            forcarAberto={filtroContratoAtivo}
            onAddContrato={(forn) => setModalContrato(forn)}
            onAbrirContrato={(c) => setContratoDetalheId(c.id)}
            onEditarFornecedor={(forn) => setFornecedorEditando(forn)}
            onEditarContrato={(c) => setContratoEditando(c)}
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

      {modalContrato && (
        <ModalContrato
          fornecedores={fornecedores}
          fornecedorId={modalContrato.id}
          fornecedorNome={modalContrato.nome}
          onClose={() => setModalContrato(null)}
        />
      )}

      {contratoEditando && (
        <ModalContrato
          fornecedores={fornecedores}
          fornecedorId={contratoEditando.fornecedorId}
          fornecedorNome={contratoEditando.fornecedorNome}
          contratoParaEditar={contratoEditando}
          onClose={() => setContratoEditando(null)}
        />
      )}

      {contratoDetalhe && (
        <ModalDetalheContrato
          contrato={contratoDetalhe}
          onClose={() => setContratoDetalheId(null)}
          onEditar={(c) => { setContratoDetalheId(null); setContratoEditando(c); }}
        />
      )}
    </div>
  );
}
