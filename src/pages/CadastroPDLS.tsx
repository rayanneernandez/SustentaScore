import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, ArrowRight, ClipboardCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Indicador, IndicadorPDLS, UnidadeMedidaPDLS } from '../types';

const unidadeMedidaLabel: Record<UnidadeMedidaPDLS, string> = {
  percentual: 'Percentual',
  quantidade: 'Quantidade',
  conformidade: 'Conformidade',
  outro: 'Outro',
};

type FormAspecto = { nome: string; descricao: string };
const formAspectoVazio: FormAspecto = { nome: '', descricao: '' };

type FormPDLS = {
  nome: string;
  meta: string;
  unidadeMedida: UnidadeMedidaPDLS;
  meiosVerificacao: string;
  referenciaNormativa: string;
};
const formPDLSVazio: FormPDLS = {
  nome: '', meta: '', unidadeMedida: 'percentual', meiosVerificacao: '', referenciaNormativa: '',
};

/**
 * Tela dedicada de CADASTRO da estrutura PDLS, em cascata: Objeto Contratual →
 * Aspecto de Sustentabilidade → Eixo PDLS → Indicador de Desempenho. Cada passo só
 * libera depois que o anterior tem uma seleção. Criada porque misturar esse
 * cadastro dentro do detalhe (só consulta) de um Aspecto, em `Indicadores.tsx`,
 * estava confuso — ver README_HANDOFF.md e o comentário no tipo `Indicador`.
 * Só quem tem permissão em `cadastroPdls` (ver `Perfis.tsx`) vê e usa esta tela;
 * os demais só selecionam/consultam o que já foi cadastrado aqui, em outras telas
 * (Aspectos de Sustentabilidade, Ocorrências).
 */
export default function CadastroPDLS() {
  const {
    objetosContratuais, addObjetoContratual, removeObjetoContratual,
    indicadores, addIndicador, updateIndicador, removeIndicador,
    eixosPDLS, addEixoPDLS, updateEixoPDLS, removeEixoPDLS,
    indicadoresPDLSDe, addIndicadorPDLS, updateIndicadorPDLS, removeIndicadorPDLS,
    podeVer, podeCriar: podeCriarPagina, podeEditar: podeEditarPagina, podeExcluir: podeExcluirPagina,
  } = useData();
  const podeCriar = podeCriarPagina('cadastroPdls');
  const podeEditar = podeEditarPagina('cadastroPdls');
  const podeExcluir = podeExcluirPagina('cadastroPdls');

  const [objetoSelecionado, setObjetoSelecionado] = useState('');
  const [novoObjeto, setNovoObjeto] = useState('');

  const [aspectoSelecionadoId, setAspectoSelecionadoId] = useState<string | null>(null);
  const [formAspecto, setFormAspecto] = useState<FormAspecto>(formAspectoVazio);
  const [editandoAspectoId, setEditandoAspectoId] = useState<string | null>(null);
  const [mostrarFormAspecto, setMostrarFormAspecto] = useState(false);

  const [eixoSelecionadoId, setEixoSelecionadoId] = useState<string | null>(null);
  const [renomeandoEixoId, setRenomeandoEixoId] = useState<string | null>(null);
  const [nomeEixoEditado, setNomeEixoEditado] = useState('');
  const [novoEixoPDLS, setNovoEixoPDLS] = useState('');
  const [erroEixo, setErroEixo] = useState('');

  const [formPDLS, setFormPDLS] = useState<FormPDLS>(formPDLSVazio);
  const [editandoPDLSId, setEditandoPDLSId] = useState<string | null>(null);
  const [mostrarFormPDLS, setMostrarFormPDLS] = useState(false);

  if (!podeVer('cadastroPdls')) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Cadastro PDLS</h1>
            <p className="page-subtitle">Acesso restrito.</p>
          </div>
        </div>
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver esta tela.</div>
      </div>
    );
  }

  const aspectosDoObjeto = indicadores.filter((i) => i.tipo === objetoSelecionado);
  const aspectoSelecionado = indicadores.find((i) => i.id === aspectoSelecionadoId) ?? null;
  const eixoSelecionado = eixosPDLS.find((e) => e.id === eixoSelecionadoId) ?? null;

  // ── Passo 1: Objeto Contratual ──────────────────────────────────
  const selecionarObjeto = (objeto: string) => {
    setObjetoSelecionado(objeto);
    setAspectoSelecionadoId(null);
    setEixoSelecionadoId(null);
    setMostrarFormAspecto(false);
    setMostrarFormPDLS(false);
  };

  const handleAddObjeto = () => {
    if (!novoObjeto.trim()) return;
    addObjetoContratual(novoObjeto);
    selecionarObjeto(novoObjeto.trim());
    setNovoObjeto('');
  };

  const handleRemoveObjeto = (objeto: string) => {
    removeObjetoContratual(objeto);
    if (objetoSelecionado === objeto) selecionarObjeto('');
  };

  // ── Passo 2: Aspecto de Sustentabilidade ────────────────────────
  const selecionarAspecto = (id: string) => {
    setAspectoSelecionadoId(id);
    setEixoSelecionadoId(null);
    setMostrarFormPDLS(false);
  };

  const abrirNovoAspecto = () => {
    setEditandoAspectoId(null);
    setFormAspecto(formAspectoVazio);
    setMostrarFormAspecto(true);
  };

  const abrirEditarAspecto = (ind: Indicador) => {
    setEditandoAspectoId(ind.id);
    setFormAspecto({ nome: ind.nome, descricao: ind.descricao });
    setMostrarFormAspecto(true);
  };

  const salvarAspecto = () => {
    if (!formAspecto.nome.trim() || !objetoSelecionado) return;
    if (editandoAspectoId) {
      updateIndicador(editandoAspectoId, { nome: formAspecto.nome, descricao: formAspecto.descricao });
    } else {
      const novo: Indicador = {
        id: `i${Date.now()}`,
        nome: formAspecto.nome,
        descricao: formAspecto.descricao,
        tipo: objetoSelecionado,
        contratosVinculados: 0,
        icone: 'leaf',
      };
      addIndicador(novo);
      setAspectoSelecionadoId(novo.id);
    }
    setMostrarFormAspecto(false);
    setEditandoAspectoId(null);
    setFormAspecto(formAspectoVazio);
  };

  const handleRemoveAspecto = (id: string) => {
    removeIndicador(id);
    if (aspectoSelecionadoId === id) selecionarAspecto('');
  };

  // ── Passo 3: Eixo PDLS ───────────────────────────────────────────
  const selecionarEixo = (id: string) => {
    setEixoSelecionadoId(id);
    setMostrarFormPDLS(false);
  };

  const handleAddEixo = () => {
    if (!novoEixoPDLS.trim()) return;
    addEixoPDLS(novoEixoPDLS);
    setNovoEixoPDLS('');
    setErroEixo('');
  };

  const iniciarRenomeEixo = (id: string, nomeAtual: string) => {
    setRenomeandoEixoId(id);
    setNomeEixoEditado(nomeAtual);
  };

  const salvarRenomeEixo = () => {
    if (!renomeandoEixoId || !nomeEixoEditado.trim()) return;
    updateEixoPDLS(renomeandoEixoId, nomeEixoEditado);
    setRenomeandoEixoId(null);
    setNomeEixoEditado('');
  };

  const handleRemoveEixo = (id: string) => {
    const removeu = removeEixoPDLS(id);
    setErroEixo(removeu ? '' : 'Não é possível excluir: este eixo está em uso (em alguma Ocorrência ou Indicador de Desempenho), ou é o único eixo restante.');
    if (removeu && eixoSelecionadoId === id) selecionarEixo('');
  };

  // ── Passo 4: Indicador de Desempenho PDLS ───────────────────────
  const indicadoresDoEixo = aspectoSelecionado && eixoSelecionado
    ? indicadoresPDLSDe(aspectoSelecionado.id, eixoSelecionado.id)
    : [];

  const abrirNovoPDLS = () => {
    setEditandoPDLSId(null);
    setFormPDLS(formPDLSVazio);
    setMostrarFormPDLS(true);
  };

  const abrirEditarPDLS = (p: IndicadorPDLS) => {
    setEditandoPDLSId(p.id);
    setFormPDLS({
      nome: p.nome,
      meta: p.meta ?? '',
      unidadeMedida: p.unidadeMedida,
      meiosVerificacao: p.meiosVerificacao.map((m) => m.descricao).join('\n'),
      referenciaNormativa: p.referenciaNormativa ?? '',
    });
    setMostrarFormPDLS(true);
  };

  const salvarPDLS = () => {
    if (!aspectoSelecionado || !eixoSelecionado || !formPDLS.nome.trim()) return;
    const meiosVerificacao = formPDLS.meiosVerificacao
      .split('\n')
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map((descricao, i) => ({ id: `mv${Date.now()}${i}`, descricao }));

    if (editandoPDLSId) {
      updateIndicadorPDLS(editandoPDLSId, {
        nome: formPDLS.nome,
        meta: formPDLS.meta || undefined,
        unidadeMedida: formPDLS.unidadeMedida,
        meiosVerificacao,
        referenciaNormativa: formPDLS.referenciaNormativa || undefined,
      });
    } else {
      addIndicadorPDLS({
        id: `pdls${Date.now()}`,
        macroindicadorId: aspectoSelecionado.id,
        eixoId: eixoSelecionado.id,
        nome: formPDLS.nome,
        meta: formPDLS.meta || undefined,
        unidadeMedida: formPDLS.unidadeMedida,
        meiosVerificacao,
        referenciaNormativa: formPDLS.referenciaNormativa || undefined,
      });
    }
    setMostrarFormPDLS(false);
    setEditandoPDLSId(null);
    setFormPDLS(formPDLSVazio);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Cadastro PDLS</h1>
          <p className="page-subtitle">
            Monte a estrutura em 4 passos: Objeto Contratual → Aspecto de Sustentabilidade → Eixo PDLS → Indicador de Desempenho.
          </p>
        </div>
      </div>

      {/* Trilha da seleção atual, pra sempre saber onde está no cadastro */}
      {(objetoSelecionado || aspectoSelecionado || eixoSelecionado) && (
        <p className="form-hint form-hint--muted section-card-hint">
          {objetoSelecionado || <em>Objeto Contratual</em>}
          {' '}<ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
          {aspectoSelecionado?.nome || <em>Aspecto de Sustentabilidade</em>}
          {' '}<ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
          {eixoSelecionado ? `Eixo ${eixoSelecionado.numero} – ${eixoSelecionado.nome}` : <em>Eixo PDLS</em>}
        </p>
      )}

      {/* Passo 1: Objeto Contratual */}
      <div className="occurrence-card" style={{ marginBottom: 16 }}>
        <h3 className="occurrence-section-title">1. Objeto Contratual</h3>
        <div className="eixo-tabs">
          {objetosContratuais.map((o) => (
            <div key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className={`eixo-tab ${o === objetoSelecionado ? 'eixo-tab--active' : ''}`}
                onClick={() => selecionarObjeto(o)}
              >
                {o}
              </button>
              {podeExcluir && (
                <button type="button" className="anexo-item-remove" title="Remover objeto" onClick={() => handleRemoveObjeto(o)}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {objetosContratuais.length === 0 && <p className="empty-state-sm">Nenhum objeto cadastrado ainda.</p>}
        </div>
        {podeCriar && (
          <div className="inline-form" style={{ marginTop: 12 }}>
            <input
              className="form-input"
              placeholder="Novo objeto contratual — ex: Manutenção Predial"
              value={novoObjeto}
              onChange={(e) => setNovoObjeto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddObjeto(); }}
            />
            <button className="btn-primary" onClick={handleAddObjeto}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Passo 2: Aspecto de Sustentabilidade */}
      <div className={`occurrence-card ${!objetoSelecionado ? 'section-card-hint' : ''}`} style={{ marginBottom: 16, opacity: objetoSelecionado ? 1 : 0.5 }}>
        <h3 className="occurrence-section-title">2. Aspecto de Sustentabilidade</h3>
        {!objetoSelecionado ? (
          <p className="empty-state-sm">Selecione um Objeto Contratual no passo 1 primeiro.</p>
        ) : (
          <>
            <div className="tag-manage-list">
              {aspectosDoObjeto.map((ind) => (
                <div
                  key={ind.id}
                  className="tag-manage-item"
                  style={{ cursor: 'pointer', borderColor: ind.id === aspectoSelecionadoId ? 'var(--primary)' : undefined }}
                  onClick={() => selecionarAspecto(ind.id)}
                >
                  <span style={{ fontWeight: ind.id === aspectoSelecionadoId ? 600 : 400 }}>{ind.nome}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {podeEditar && (
                      <button
                        type="button"
                        className="anexo-item-remove"
                        title="Editar aspecto"
                        onClick={(e) => { e.stopPropagation(); abrirEditarAspecto(ind); }}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        type="button"
                        className="anexo-item-remove"
                        title="Excluir aspecto"
                        onClick={(e) => { e.stopPropagation(); handleRemoveAspecto(ind.id); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {aspectosDoObjeto.length === 0 && !mostrarFormAspecto && (
                <p className="empty-state-sm">Nenhum aspecto de sustentabilidade cadastrado para este objeto ainda.</p>
              )}
            </div>

            {podeCriar && mostrarFormAspecto ? (
              <div className="inline-form" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  placeholder="Nome do aspecto — ex: Gestão de Resíduos Sólidos"
                  value={formAspecto.nome}
                  onChange={(e) => setFormAspecto((p) => ({ ...p, nome: e.target.value }))}
                />
                <input
                  className="form-input"
                  placeholder="Descrição (opcional)"
                  value={formAspecto.descricao}
                  onChange={(e) => setFormAspecto((p) => ({ ...p, descricao: e.target.value }))}
                />
                <button className="btn-secondary" onClick={() => { setMostrarFormAspecto(false); setEditandoAspectoId(null); }}>Cancelar</button>
                <button className="btn-primary" onClick={salvarAspecto}>
                  {editandoAspectoId ? 'Salvar' : <><Plus size={14} /> Adicionar</>}
                </button>
              </div>
            ) : podeCriar ? (
              <button className="btn-secondary btn-secondary--sm" style={{ marginTop: 12 }} onClick={abrirNovoAspecto}>
                <Plus size={14} /> Novo Aspecto de Sustentabilidade
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Passo 3: Eixo PDLS */}
      <div className="occurrence-card" style={{ marginBottom: 16, opacity: aspectoSelecionado ? 1 : 0.5 }}>
        <h3 className="occurrence-section-title">3. Eixo PDLS</h3>
        {!aspectoSelecionado ? (
          <p className="empty-state-sm">Selecione um Aspecto de Sustentabilidade no passo 2 primeiro.</p>
        ) : (
          <>
            <p className="form-hint form-hint--muted" style={{ marginBottom: 8 }}>
              Eixos já com indicador cadastrado para este aspecto aparecem preenchidos; os outros ainda estão disponíveis.
            </p>
            <div className="eixo-tabs">
              {eixosPDLS.map((eixo) => {
                const jaCadastrado = indicadoresPDLSDe(aspectoSelecionado.id, eixo.id).length > 0;
                return (
                  <div key={eixo.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {renomeandoEixoId === eixo.id ? (
                      <>
                        <input
                          className="form-input"
                          style={{ width: 180 }}
                          value={nomeEixoEditado}
                          onChange={(e) => setNomeEixoEditado(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvarRenomeEixo(); }}
                          autoFocus
                        />
                        <button type="button" className="anexo-item-remove" title="Salvar nome" onClick={salvarRenomeEixo}>
                          <Check size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`eixo-tab ${eixo.id === eixoSelecionadoId ? 'eixo-tab--active' : ''} ${jaCadastrado ? 'eixo-tab--cadastrado' : ''}`}
                          onClick={() => selecionarEixo(eixo.id)}
                        >
                          Eixo {eixo.numero} – {eixo.nome}
                        </button>
                        {podeEditar && (
                          <button type="button" className="anexo-item-remove" title="Renomear eixo" onClick={() => iniciarRenomeEixo(eixo.id, eixo.nome)}>
                            <Pencil size={12} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button type="button" className="anexo-item-remove" title="Excluir eixo" onClick={() => handleRemoveEixo(eixo.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {eixosPDLS.length === 0 && <p className="empty-state-sm">Nenhum eixo cadastrado ainda.</p>}
            </div>
            {erroEixo && <p className="form-hint form-hint--danger" style={{ marginTop: 8 }}>{erroEixo}</p>}
            {podeCriar && (
              <div className="inline-form" style={{ marginTop: 12 }}>
                <input
                  className="form-input"
                  placeholder="Novo Eixo PDLS — ex: Saúde e Segurança do Trabalho"
                  value={novoEixoPDLS}
                  onChange={(e) => setNovoEixoPDLS(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddEixo(); }}
                />
                <button className="btn-primary" onClick={handleAddEixo}>
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Passo 4: Indicador de Desempenho PDLS */}
      <div className="occurrence-card" style={{ opacity: eixoSelecionado ? 1 : 0.5 }}>
        <h3 className="occurrence-section-title">4. Indicador de Desempenho PDLS</h3>
        {!eixoSelecionado ? (
          <p className="empty-state-sm">Selecione um Eixo PDLS no passo 3 primeiro.</p>
        ) : (
          <>
            <div className="pdls-list">
              {indicadoresDoEixo.map((p) => (
                <div key={p.id} className="pdls-card">
                  <div className="pdls-card-top">
                    <span className="pdls-card-nome">{p.nome}</span>
                    {(podeEditar || podeExcluir) && (
                      <div className="indicator-card-actions">
                        {podeEditar && (
                          <button className="indicator-action-btn" title="Editar" onClick={() => abrirEditarPDLS(p)}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button className="indicator-action-btn indicator-action-btn--delete" title="Excluir" onClick={() => removeIndicadorPDLS(p.id)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="pdls-card-meta-row">
                    <span className="badge badge--outline">{unidadeMedidaLabel[p.unidadeMedida]}</span>
                    <span className="pdls-card-meta">
                      Meta: {p.meta ? p.meta : <em>a definir</em>}
                    </span>
                  </div>
                  {p.meiosVerificacao.length > 0 && (
                    <div className="pdls-meios">
                      <span className="pdls-meios-titulo"><ClipboardCheck size={13} /> Meios de verificação</span>
                      <ul className="pdls-meios-list">
                        {p.meiosVerificacao.map((m) => <li key={m.id}>{m.descricao}</li>)}
                      </ul>
                    </div>
                  )}
                  {p.referenciaNormativa && <p className="pdls-card-muted pdls-card-referencia">{p.referenciaNormativa}</p>}
                </div>
              ))}
              {indicadoresDoEixo.length === 0 && !mostrarFormPDLS && (
                <p className="empty-state-sm">Nenhum indicador de desempenho cadastrado neste eixo para este aspecto ainda.</p>
              )}
            </div>

            {podeCriar && mostrarFormPDLS ? (
              <div className="inline-form" style={{ marginTop: 12 }}>
                <div className="form-group form-group--full">
                  <label className="form-label">Indicador de Desempenho (PDLS) *</label>
                  <input
                    className="form-input"
                    placeholder="Ex: Percentual de água consumida (m³)"
                    value={formPDLS.nome}
                    onChange={(e) => setFormPDLS((p) => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Meta de referência</label>
                  <input
                    className="form-input"
                    placeholder="Ex: Redução de 5% (ainda pode ser ajustada)"
                    value={formPDLS.meta}
                    onChange={(e) => setFormPDLS((p) => ({ ...p, meta: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unidade de Medida</label>
                  <select
                    className="form-input"
                    value={formPDLS.unidadeMedida}
                    onChange={(e) => setFormPDLS((p) => ({ ...p, unidadeMedida: e.target.value as UnidadeMedidaPDLS }))}
                  >
                    <option value="percentual">Percentual</option>
                    <option value="quantidade">Quantidade</option>
                    <option value="conformidade">Conformidade</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Meios de verificação</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder={'Um por linha, ex:\nCertificados de destinação final\nRegistros da fiscalização'}
                    value={formPDLS.meiosVerificacao}
                    onChange={(e) => setFormPDLS((p) => ({ ...p, meiosVerificacao: e.target.value }))}
                  />
                  <p className="form-hint form-hint--muted">
                    Cada meio comprova o cumprimento — ex: anexar um documento já cumpre o requisito.
                  </p>
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Referência normativa / Objetivo PDLS</label>
                  <input
                    className="form-input"
                    placeholder="Ex: OB04 – Racionalizar a gestão de resíduos"
                    value={formPDLS.referenciaNormativa}
                    onChange={(e) => setFormPDLS((p) => ({ ...p, referenciaNormativa: e.target.value }))}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => { setMostrarFormPDLS(false); setEditandoPDLSId(null); }}>Cancelar</button>
                  <button className="btn-primary" onClick={salvarPDLS}>Salvar</button>
                </div>
              </div>
            ) : podeCriar ? (
              <button className="btn-secondary btn-secondary--sm" style={{ marginTop: 12 }} onClick={abrirNovoPDLS}>
                <Plus size={14} /> Novo Indicador de Desempenho
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
