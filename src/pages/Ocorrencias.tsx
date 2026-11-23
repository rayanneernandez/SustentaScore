import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, ChevronDown, ChevronUp, Filter, X, Trash2,
  Upload, Paperclip, Link2, GraduationCap, ExternalLink,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { capitalizarPalavras, rotuloAutoria } from '../utils/texto';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';
import { hojeISO, rotuloDoAnoMes } from '../utils/score';
import type { Ocorrencia, TipoRegistroOcorrencia } from '../types';

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]}. de ${year}`;
}

function criarFormVazio() {
  return {
    fornecedorId: '',
    contratoId: '',
    indicadorId: '',
    eixoPDLSId: '',
    descricao: '',
    // Data em que a ocorrência aconteceu — é ela que define em qual mês a dedução é aplicada.
    data: hojeISO(),
    /** Pontos a deduzir: nunca 0 — mínimo 1. Fica '' enquanto a pessoa apaga para digitar outro valor. */
    deducao: 25 as number | '',
    tipoRegistro: 'ocorrencia' as TipoRegistroOcorrencia,
    /** Só usado em Aspectos de desempenho coletivo (`Indicador.impactoColetivo`): marca que
     * a pessoa quer descontar pontos mesmo assim (situação excepcional causada pelo fornecedor). */
    deducaoManual: false,
    justificativa: '',
    registradoPor: '',
    link: '',
  };
}

export default function Ocorrencias() {
  const {
    fornecedores, contratos, ocorrencias, addOcorrencia, indicadores,
    eixosPDLS, indicadoresPDLSDe, podeCriar: podeCriarPagina, podeVer,
  } = useData();
  const podeCriar = podeCriarPagina('ocorrencias');
  const podeVerCadastroPDLS = podeVer('cadastroPdls');

  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroContrato, setFiltroContrato] = useState('todos');
  const [filtroIndicador, setFiltroIndicador] = useState('todos');
  const [filtroEixo, setFiltroEixo] = useState('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => criarFormVazio());
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroJustificativa, setErroJustificativa] = useState(false);
  // Depois da primeira tentativa de salvar, o aviso lista (ao vivo) o que ainda falta preencher.
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const avisoRef = useRef<HTMLDivElement>(null);

  const nomeEixo = (id?: string) => {
    const eixo = eixosPDLS.find((e) => e.id === id);
    return eixo ? `Eixo ${eixo.numero} – ${eixo.nome}` : '—';
  };

  /** Os "Eixos PDLS do Aspecto" são só os que têm pelo menos um Indicador de
   * Desempenho cadastrado pra ele (mesma lógica usada em Aspectos de
   * Sustentabilidade, ver `eixosDoAspecto` em `Indicadores.tsx`) — nunca os 6
   * eixos soltos, sem relação com o Aspecto escolhido. */
  const eixosDoAspecto = (indicadorId: string) =>
    indicadorId ? eixosPDLS.filter((eixo) => indicadoresPDLSDe(indicadorId, eixo.id).length > 0) : [];

  const filtradas = ocorrencias.filter((o) => {
    if (filtroFornecedor !== 'todos' && o.fornecedorId !== filtroFornecedor) return false;
    if (filtroContrato !== 'todos' && o.contratoId !== filtroContrato) return false;
    if (filtroIndicador !== 'todos' && o.indicadorId !== filtroIndicador) return false;
    if (filtroEixo !== 'todos' && o.eixoPDLSId !== filtroEixo) return false;
    return true;
  });

  const contratosDoFornecedorSelecionado = contratos.filter((c) => c.fornecedorId === form.fornecedorId);
  const contratoSelecionado = contratos.find((c) => c.id === form.contratoId);
  // Aspectos que valem para o contrato escolhido (definidos no cadastro do contrato). Contrato antigo,
  // sem essa escolha, continua oferecendo todos os aspectos, como sempre foi.
  const aspectosDoContrato = contratoSelecionado?.aspectosIds
    ? indicadores.filter((i) => contratoSelecionado.aspectosIds!.includes(i.id))
    : indicadores;
  const eixosDoAspectoDoForm = eixosDoAspecto(form.indicadorId);
  /** O Aspecto escolhido reflete o desempenho coletivo da unidade (água, energia, resíduos)?
   * Se sim, o registro NÃO desconta pontos por padrão (vira Treinamento + alerta). */
  const aspectoColetivo = !!indicadores.find((i) => i.id === form.indicadorId)?.impactoColetivo;
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
    setForm(criarFormVazio());
    setArquivos([]);
    setErroArquivo('');
    setErroJustificativa(false);
    setTentouSalvar(false);
  };

  const deducaoManualAplicada = aspectoColetivo && form.deducaoManual;
  /** Campos obrigatórios ainda sem preenchimento (na ordem em que aparecem no formulário). */
  const camposFaltando: { chave: string; rotulo: string }[] = [];
  if (!form.fornecedorId) camposFaltando.push({ chave: 'fornecedor', rotulo: 'Fornecedor' });
  if (!form.contratoId) camposFaltando.push({ chave: 'contrato', rotulo: 'Contrato' });
  if (eixosDoAspectoDoForm.length > 0 && !form.eixoPDLSId) camposFaltando.push({ chave: 'eixo', rotulo: 'Eixo PDLS' });
  if (!form.descricao.trim()) camposFaltando.push({ chave: 'descricao', rotulo: 'Descrição' });
  if (!form.data) camposFaltando.push({ chave: 'data', rotulo: 'Data da ocorrência' });
  else if (form.data > hojeISO()) camposFaltando.push({ chave: 'data', rotulo: 'Data da ocorrência (não pode ser uma data futura)' });
  if (form.tipoRegistro === 'ocorrencia' && (form.deducao === '' || Number(form.deducao) < 1)) camposFaltando.push({ chave: 'deducao', rotulo: 'Dedução (pontos) — informe um valor de 1 ou mais' });
  if (deducaoManualAplicada && !form.justificativa.trim()) camposFaltando.push({ chave: 'justificativa', rotulo: 'Justificativa da dedução manual' });
  const invalido = (chave: string) => tentouSalvar && camposFaltando.some((c) => c.chave === chave);

  const handleAdd = async () => {
    if (camposFaltando.length > 0) {
      setTentouSalvar(true);
      if (camposFaltando.some((c) => c.chave === 'justificativa')) setErroJustificativa(true);
      // O formulário rola dentro do modal: leva o aviso para a tela.
      setTimeout(() => avisoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      return;
    }
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
      eixoPDLSId: form.eixoPDLSId || undefined,
      descricao: form.descricao,
      data: form.data || new Date().toISOString().split('T')[0],
      deducao: form.tipoRegistro === 'treinamento' ? 0 : Number(form.deducao),
      tipoRegistro: form.tipoRegistro,
      registradoPor: form.registradoPor || undefined,
      link: form.link || undefined,
      anexos,
      justificativaDeducaoManual: deducaoManualAplicada ? form.justificativa.trim() : undefined,
    };
    addOcorrencia(nova);
    setSalvando(false);
    fecharModal();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Ocorrências</h1>
          <p className="page-subtitle">Registro de ocorrências do contrato — com dedução de pontos ou apenas para acompanhamento, sem dedução.</p>
        </div>
        {podeCriar && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Nova Ocorrência
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="occurrence-filters">
        <Filter size={14} className="text-muted" />
        <select
          className="filter-select-plain"
          value={filtroFornecedor}
          onChange={(e) => {
            setFiltroFornecedor(e.target.value);
            // O contrato escolhido pode não ser do novo fornecedor: volta para "todos".
            setFiltroContrato('todos');
          }}
        >
          <option value="todos">Todos fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
        <select className="filter-select-plain" value={filtroContrato} onChange={(e) => setFiltroContrato(e.target.value)}>
          <option value="todos">Todos os contratos</option>
          {contratos
            .filter((c) => filtroFornecedor === 'todos' || c.fornecedorId === filtroFornecedor)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {filtroFornecedor === 'todos' ? `${c.fornecedorNome} — ` : ''}{c.numero}{c.unidade ? ` · ${c.unidade}` : ''}
              </option>
            ))}
        </select>
        <select className="filter-select-plain" value={filtroIndicador} onChange={(e) => setFiltroIndicador(e.target.value)}>
          <option value="todos">Todos os aspectos de sustentabilidade</option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <select className="filter-select-plain" value={filtroEixo} onChange={(e) => setFiltroEixo(e.target.value)}>
          <option value="todos">Todos os Eixos PDLS</option>
          {/* Eixos ainda sem nome definitivo ("nome a definir") não aparecem aqui — não
              fazem sentido como filtro enquanto ninguém usa. Continuam disponíveis pra
              gerenciar/renomear em Estrutura de Sustentabilidade. */}
          {eixosPDLS
            .filter((e) => !e.nome.toLowerCase().includes('a definir'))
            .map((e) => (
              <option key={e.id} value={e.id}>Eixo {e.numero} – {e.nome}</option>
            ))}
        </select>
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
                    <div className="occurrence-main">
                      <span className="occurrence-desc">{o.descricao}</span>
                      <span className="occurrence-meta">
                        <strong>{o.fornecedorNome}</strong>
                        <span>Contrato {contratos.find((c) => c.id === o.contratoId)?.numero ?? '—'}</span>
                        {o.indicadorNome && <span>{o.indicadorNome}</span>}
                      </span>
                    </div>
                    <div className="occurrence-badges">
                      <span className="badge badge--outline">Eixo {eixosPDLS.find((e) => e.id === o.eixoPDLSId)?.numero ?? '—'}</span>
                      {o.justificativaDeducaoManual && (
                        <span className="badge badge--outline badge--coletivo">Dedução manual</span>
                      )}
                    </div>
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
                        <span className="detail-label">Contrato</span>
                        <span className="detail-value">{contratos.find((c) => c.id === o.contratoId)?.numero ?? '—'}</span>
                      </div>
                      <div>
                        <span className="detail-label">Aspecto de Sustentabilidade</span>
                        <span className="detail-value">{o.indicadorNome || '—'}</span>
                      </div>
                      <div>
                        <span className="detail-label">Eixo PDLS</span>
                        <span className="detail-value">{nomeEixo(o.eixoPDLSId)}</span>
                      </div>
                      <div>
                        <span className="detail-label">Registrado por</span>
                        <span className="detail-value">{o.registradoPor || '—'}</span>
                      </div>
                      {rotuloAutoria(o.criadoPor, o.criadoEm, 'Lançado no sistema') && (
                        <div>
                          <span className="detail-label">Lançado no sistema</span>
                          <span className="detail-value">{rotuloAutoria(o.criadoPor, o.criadoEm, 'Lançado no sistema')?.replace('Lançado no sistema ', '')}</span>
                        </div>
                      )}
                      <div>
                        <span className="detail-label">{treinamento ? 'Dedução' : 'Dedução aplicada'}</span>
                        {treinamento ? (
                          <span className="detail-value">Sem dedução — registro apenas para acompanhamento</span>
                        ) : (
                          <span className="detail-value text-danger">-{o.deducao} pontos</span>
                        )}
                      </div>
                    </div>
                    {o.justificativaDeducaoManual && (
                      <div style={{ marginTop: 10 }}>
                        <span className="detail-label">Justificativa da dedução manual</span>
                        <span className="detail-value">{o.justificativaDeducaoManual}</span>
                      </div>
                    )}
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

            {aspectoColetivo ? (
              <div className="form-group form-group--full">
                <label className="form-label">Tipo de registro</label>
                <div className="trava-coletivo" role="note">
                  <GraduationCap size={16} />
                  <div>
                    <strong>Meta da Unidade — sem desconto de IMR</strong>
                    <span>
                      Este aspecto é uma meta da unidade: o resultado reflete o desempenho global da unidade
                      administrativa (servidores, outros terceirizados e características do prédio também influenciam), e não
                      a atuação de um único fornecedor. Por isso este registro entra <strong>sem dedução</strong>: fica registrado e gera o
                      alerta de campanha de treinamento dos funcionários do contrato, sem descontar pontos do score.
                    </span>
                  </div>
                </div>
                <label className="aspecto-coletivo-check" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.deducaoManual}
                    onChange={(e) => {
                      const marcado = e.target.checked;
                      setErroJustificativa(false);
                      setForm((p) => ({
                        ...p,
                        deducaoManual: marcado,
                        tipoRegistro: marcado ? 'ocorrencia' : 'treinamento',
                        deducao: marcado ? 25 : 0,
                        justificativa: marcado ? p.justificativa : '',
                      }));
                    }}
                  />
                  <span>
                    <strong>Aplicar dedução manual mesmo assim</strong> — só para situação excepcional que o fornecedor
                    causou (ex: vazamento ou desperdício comprovadamente dele). Exige justificativa escrita.
                  </span>
                </label>
                {form.deducaoManual && (
                  <>
                    <textarea
                      className="form-input"
                      style={{ marginTop: 8, minHeight: 70, resize: 'vertical' }}
                      placeholder="Justificativa da dedução manual (obrigatória)..."
                      value={form.justificativa}
                      onChange={(e) => {
                        setErroJustificativa(false);
                        setForm((p) => ({ ...p, justificativa: e.target.value }));
                      }}
                    />
                    {erroJustificativa && (
                      <span className="form-hint form-hint--danger">Informe a justificativa para aplicar a dedução manual.</span>
                    )}
                  </>
                )}
              </div>
            ) : (
            <div className="form-group form-group--full">
              <label className="form-label">Tipo de registro</label>
              <div className="segmented-toggle segmented-toggle--duas-linhas">
                <button
                  type="button"
                  className={`segmented-toggle-btn ${form.tipoRegistro === 'ocorrencia' ? 'segmented-toggle-btn--active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, tipoRegistro: 'ocorrencia' }))}
                >
                  <strong>Com dedução</strong>
                  <small>Desconta pontos do score do mês</small>
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-btn ${form.tipoRegistro === 'treinamento' ? 'segmented-toggle-btn--active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, tipoRegistro: 'treinamento', deducao: 0 }))}
                >
                  <strong>Sem dedução</strong>
                  <small>Fica registrado, mas não desconta pontos</small>
                </button>
              </div>
              {form.tipoRegistro === 'treinamento' && (
                <p className="form-hint form-hint--muted">
                  O registro aparece no histórico do fornecedor, mas não altera o score. Serve para orientações, advertências, acompanhamentos
                  ou qualquer caso em que não deva haver desconto.
                </p>
              )}
            </div>
            )}

            <div className="form-group">
              <label className="form-label">Fornecedor *</label>
              <select
                className={`form-input${invalido('fornecedor') ? ' form-input--erro' : ''}`}
                value={form.fornecedorId}
                onChange={(e) => setForm({ ...form, fornecedorId: e.target.value, contratoId: '', registradoPor: '' })}
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contrato *</label>
              <select
                className={`form-input${invalido('contrato') ? ' form-input--erro' : ''}`}
                value={form.contratoId}
                onChange={(e) => {
                  const novoContrato = contratos.find((c) => c.id === e.target.value);
                  const permitidos = novoContrato?.aspectosIds;
                  // Trocou de contrato e o aspecto já escolhido não vale para o novo: limpa a escolha
                  // (e a trava de Meta da Unidade que dependia dela).
                  const perdeAspecto = !!form.indicadorId && !!permitidos && !permitidos.includes(form.indicadorId);
                  setErroJustificativa(false);
                  setForm((p) =>
                    perdeAspecto
                      ? { ...p, contratoId: e.target.value, indicadorId: '', eixoPDLSId: '', ...(aspectoColetivo ? { tipoRegistro: 'ocorrencia' as TipoRegistroOcorrencia, deducao: 25, deducaoManual: false, justificativa: '' } : {}) }
                      : { ...p, contratoId: e.target.value },
                  );
                }}
                disabled={!form.fornecedorId}
              >
                <option value="">Selecione...</option>
                {contratosDoFornecedorSelecionado.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}{c.unidade ? ` · ${c.unidade}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Aspecto de Sustentabilidade</label>
              <select
                className="form-input"
                disabled={!form.contratoId}
                value={form.indicadorId}
                onChange={(e) => {
                  const novoIndicadorId = e.target.value;
                  const eixos = eixosDoAspecto(novoIndicadorId);
                  const novoColetivo = !!indicadores.find((i) => i.id === novoIndicadorId)?.impactoColetivo;
                  setErroJustificativa(false);
                  setForm((p) => {
                    const base = { ...p, indicadorId: novoIndicadorId, eixoPDLSId: eixos[0]?.id ?? '' };
                    // Aspecto de desempenho coletivo: entra como Treinamento (sem dedução). Ao sair
                    // dele, volta pro padrão (Ocorrência com 25 pontos) — mas só se o tipo tinha
                    // sido definido por essa trava, nunca sobrescreve uma escolha manual.
                    if (novoColetivo && !aspectoColetivo) return { ...base, tipoRegistro: 'treinamento' as TipoRegistroOcorrencia, deducao: 0, deducaoManual: false, justificativa: '' };
                    if (!novoColetivo && aspectoColetivo) return { ...base, tipoRegistro: 'ocorrencia' as TipoRegistroOcorrencia, deducao: 25, deducaoManual: false, justificativa: '' };
                    return base;
                  });
                }}
              >
                <option value="">{form.contratoId ? 'Selecione...' : 'Escolha o contrato primeiro'}</option>
                {aspectosDoContrato.map((i) => <option key={i.id} value={i.id}>{capitalizarPalavras(i.nome)}</option>)}
              </select>
              {contratoSelecionado?.aspectosIds && (
                <span className="form-hint form-hint--muted">
                  Só aparecem os aspectos definidos no cadastro deste contrato.
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Eixo PDLS{eixosDoAspectoDoForm.length > 0 ? ' *' : ''}</label>
              {!form.indicadorId ? (
                <p className="form-hint form-hint--muted">Selecione um Aspecto de Sustentabilidade acima pra ver os Eixos PDLS vinculados a ele.</p>
              ) : eixosDoAspectoDoForm.length === 0 ? (
                <p className="form-hint form-hint--muted">Não possui vinculação direta ao PDLS.</p>
              ) : (
                <select className={`form-input${invalido('eixo') ? ' form-input--erro' : ''}`} value={form.eixoPDLSId} onChange={(e) => setForm({ ...form, eixoPDLSId: e.target.value })}>
                  {eixosDoAspectoDoForm.map((e) => <option key={e.id} value={e.id}>Eixo {e.numero} – {e.nome}</option>)}
                </select>
              )}
              {podeVerCadastroPDLS && (
                <p className="form-hint form-hint--muted">
                  Precisa de um eixo novo? Cadastre em <Link to="/estrutura-sustentabilidade">Estrutura de Sustentabilidade</Link>.
                </p>
              )}
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
              <label className="form-label">Descrição *</label>
              <input className={`form-input${invalido('descricao') ? ' form-input--erro' : ''}`} placeholder="Descreva a ocorrência..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Data da ocorrência *</label>
              <input
                type="date"
                className={`form-input${invalido('data') ? ' form-input--erro' : ''}`}
                value={form.data}
                max={hojeISO()}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
              {form.data && form.data <= hojeISO() && form.tipoRegistro === 'ocorrencia' && (
                <span className="form-hint form-hint--muted">
                  A dedução será aplicada no score de {rotuloDoAnoMes(form.data.slice(0, 7))}, o mês desta data.
                </span>
              )}
            </div>
            {form.tipoRegistro === 'ocorrencia' && (
              <div className="form-group">
                <label className="form-label">Dedução (pontos) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  className={`form-input ${invalido('deducao') ? 'form-input--erro' : ''}`}
                  placeholder="Ex: 25"
                  value={form.deducao}
                  onChange={(e) => setForm({ ...form, deducao: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                {invalido('deducao') && <span className="form-hint form-hint--danger">Informe um valor de 1 ou mais.</span>}
              </div>
            )}

            {/* Link e anexos valem para qualquer registro — com ou sem dedução (evidência, foto, ofício, material). */}
            <>
                <div className="form-group form-group--full">
                  <label className="form-label">Link (opcional)</label>
                  <input
                    className="form-input"
                    placeholder="Ex: link de evidência, material de apoio, norma ou procedimento"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                  />
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Anexos (opcional)</label>
                  <label className="file-upload-box">
                    <Upload size={16} />
                    <span>
                      {arquivos.length
                        ? `${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''} selecionado${arquivos.length !== 1 ? 's' : ''}`
                        : 'Anexar fotos, ofícios ou documentos — PDF, imagem ou documento (até 4MB cada)'}
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

            {tentouSalvar && camposFaltando.length > 0 && (
              <div ref={avisoRef} className="form-alerta-campos" role="alert">
                <strong>Não foi possível salvar ainda.</strong> Preencha o que falta:
                <ul>
                  {camposFaltando.map((c) => <li key={c.chave}>{c.rotulo}</li>)}
                </ul>
              </div>
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

    </div>
  );
}
