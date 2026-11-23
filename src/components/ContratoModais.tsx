import { useRef, useState } from 'react';
import {
  X, Paperclip, Upload, RefreshCw, Clock, AlertTriangle, CheckCircle2, ExternalLink, History, Power, PowerOff, Trash2, Pencil,
} from 'lucide-react';
import { useData, statusVigencia, diasParaVencimento, formatarDataBR, criarEventoHistorico, ALERTA_DIAS_PADRAO } from '../context/DataContext';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';
import { capitalizarPalavras, rotuloAutoria } from '../utils/texto';
import { UNIDADES_ADMINISTRATIVAS } from '../config/sistema';
import { PAGAMENTO_MINIMO_NF } from '../utils/score';
import Paginacao from './Paginacao';
import type { Fornecedor, Contrato, HistoricoTipo, Anexo } from '../types';

// Formulário (novo/editar), detalhe e selo de vigência de um Contrato — usados pela aba
// Contratos (onde o contrato é criado e editado) e pela aba Fornecedores (só consulta).

const CAMPO_CONTRATO_LABEL: Record<string, string> = {
  numero: 'Número', ano: 'Ano', objeto: 'Objeto', unidade: 'Unidade Administrativa',
  vigenciaInicio: 'Vigência Início', vigenciaFim: 'Vigência Fim', tipo: 'Tipo', status: 'Status',
  fiscalTecnico: 'Fiscal Técnico', fiscalAdministrativo: 'Fiscal Administrativo',
  fiscalSubstituto: 'Fiscal Substituto', gestor: 'Gestor', gestorSubstituto: 'Gestor Substituto',
  preposto: 'Preposto da Contratada', observacao: 'Observação',
};

// ── Modal Novo / Editar Contrato ──────────────────────────────────
export function ModalContrato({
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
  const { addContrato, updateContrato, objetosContratuais, indicadores, contratos, usuarios, buscarContratoPorNumero, podeEditar: podeEditarPagina } = useData();
  // Quem pode mudar os aspectos de um contrato já cadastrado: o Administrador ou quem ele liberar
  // (permissão de editar na Estrutura de Sustentabilidade, configurável em Perfis de Acesso).
  const podeAlterarAspectos = podeEditarPagina('cadastroPdls');
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
    preposto: contratoParaEditar?.preposto ?? '',
    observacao: contratoParaEditar?.observacao ?? '',
  };
  const [form, setForm] = useState(valoresIniciais);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [numeroDuplicado, setNumeroDuplicado] = useState<Contrato | null>(null);
  // Depois da primeira tentativa de salvar, o aviso lista (ao vivo) o que ainda falta preencher.
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const avisoRef = useRef<HTMLDivElement>(null);
  const normalizarNumero = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
  // Aviso na hora, enquanto digita: o número já existe nesta lista (a conferência no banco acontece ao salvar).
  const numeroJaNaLista = form.numero.trim()
    ? contratos.find((c) => c.id !== contratoParaEditar?.id && normalizarNumero(c.numero) === normalizarNumero(form.numero)) ?? null
    : null;
  const contratoRepetido =
    numeroDuplicado && normalizarNumero(numeroDuplicado.numero) === normalizarNumero(form.numero) ? numeroDuplicado : numeroJaNaLista;
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── Aspectos de Sustentabilidade deste contrato ──
  const sugeridosDoObjeto = (objeto: string) => indicadores.filter((i) => i.tipo === objeto).map((i) => i.id);
  const [aspectosIds, setAspectosIds] = useState<string[]>(
    contratoParaEditar?.aspectosIds ?? sugeridosDoObjeto(contratoParaEditar?.objeto ?? ''),
  );
  const [aspectosAlterados, setAspectosAlterados] = useState(false);
  // Contrato já cadastrado com a escolha feita: fica fixo, só quem tem permissão altera.
  const aspectosTravados = !!contratoParaEditar && contratoParaEditar.aspectosIds !== undefined && !podeAlterarAspectos;
  const escolherObjeto = (objeto: string) => {
    set('objeto', objeto);
    if (!aspectosTravados) {
      setAspectosIds(sugeridosDoObjeto(objeto));
      setAspectosAlterados(true);
    }
  };
  const alternarAspecto = (id: string) => {
    setAspectosIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setAspectosAlterados(true);
  };
  const aspectosDoObjetoForm = indicadores.filter((i) => i.tipo === form.objeto);
  const aspectosDeOutrosObjetos = indicadores.filter((i) => i.tipo !== form.objeto);
  const semAspectos = !aspectosTravados && aspectosIds.length === 0;
  /** Campos obrigatórios ainda sem preenchimento (na ordem em que aparecem no formulário). */
  const camposFaltando: { chave: string; rotulo: string }[] = [];
  if (!form.fornId) camposFaltando.push({ chave: 'fornecedor', rotulo: 'Fornecedor' });
  if (!form.objeto) camposFaltando.push({ chave: 'objeto', rotulo: 'Objeto' });
  if (!form.numero.trim()) camposFaltando.push({ chave: 'numero', rotulo: 'Nº Contrato' });
  if (!form.unidade) camposFaltando.push({ chave: 'unidade', rotulo: 'Unidade Administrativa' });
  else if (!UNIDADES_ADMINISTRATIVAS.includes(form.unidade)) camposFaltando.push({ chave: 'unidade', rotulo: 'Unidade Administrativa (escolha uma das opções da lista)' });
  if (semAspectos) camposFaltando.push({ chave: 'aspectos', rotulo: 'Aspectos de sustentabilidade (marque pelo menos um)' });
  const invalido = (chave: string) => tentouSalvar && camposFaltando.some((c) => c.chave === chave);

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
    if (camposFaltando.length > 0 || contratoRepetido) {
      setTentouSalvar(true);
      // O formulário rola dentro do modal: leva o aviso para a tela.
      setTimeout(() => avisoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      return;
    }
    setSalvando(true);
    const existente = await buscarContratoPorNumero(form.numero, contratoParaEditar?.id);
    if (existente) {
      setNumeroDuplicado(existente);
      setSalvando(false);
      return;
    }

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
        preposto: form.preposto,
        observacao: form.observacao,
        // Só grava a escolha de aspectos quando ela foi mexida (e permitida): contrato antigo,
        // sem escolha, continua usando todos os aspectos até alguém definir.
        ...(aspectosAlterados && !aspectosTravados ? { aspectosIds } : {}),
      };
      const mudouAspectos = aspectosAlterados && !aspectosTravados;
      if (camposAlterados.length > 0 || mudouAspectos) {
        updateContrato(contratoParaEditar.id, patch, {
          tipo: 'edicao',
          descricao: `Dados do contrato atualizados: ${[
            ...camposAlterados.map((k) => CAMPO_CONTRATO_LABEL[k]),
            ...(mudouAspectos ? ['Aspectos de Sustentabilidade'] : []),
          ].join(', ')}.`,
        });
      }
      setSalvando(false);
      onClose();
      return;
    }

    const historico = [
      criarEventoHistorico('criacao', `Contrato cadastrado (${form.tipo}) com ${aspectosIds.length} aspecto${aspectosIds.length !== 1 ? 's' : ''} de sustentabilidade.`),
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
      preposto: form.preposto,
      observacao: form.observacao,
      aspectosIds,
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
              <select className={`form-input${invalido('fornecedor') ? ' form-input--erro' : ''}`} value={form.fornId} onChange={(e) => set('fornId', e.target.value)}>
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
            <select className={`form-input${invalido('objeto') ? ' form-input--erro' : ''}`} value={form.objeto} onChange={(e) => escolherObjeto(e.target.value)}>
              <option value="">Selecione</option>
              {objetosContratuais.map((o) => (
                <option key={o} value={o}>{capitalizarPalavras(o)}</option>
              ))}
            </select>
            <p className="form-hint form-hint--muted">
              Objetos são cadastrados na tela de Aspectos de Sustentabilidade, em "Objetos contratuais".
            </p>
          </div>

          {/* Nº Contrato */}
          <div className="form-group">
            <label className="form-label">Nº Contrato *</label>
            <input className={`form-input${invalido('numero') ? ' form-input--erro' : ''}`} placeholder="CT-2024/001" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
            {contratoRepetido && (
              <span className="form-hint form-hint--danger">
                Já existe um contrato com o número {contratoRepetido.numero} ({contratoRepetido.fornecedorNome}). Não é possível cadastrar o mesmo número duas vezes.
              </span>
            )}
          </div>

          {/* Ano */}
          <div className="form-group">
            <label className="form-label">Ano</label>
            <input className="form-input" placeholder="2026" value={form.ano} onChange={(e) => set('ano', e.target.value)} />
          </div>

          {/* Unidade Administrativa */}
          <div className="form-group form-group--full">
            <label className="form-label">Unidade Administrativa *</label>
            <select className={`form-input${invalido('unidade') ? ' form-input--erro' : ''}`} value={form.unidade} onChange={(e) => set('unidade', e.target.value)}>
              <option value="">Selecione...</option>
              {/* Lista fechada nas 6 SADs (ver `UNIDADES_ADMINISTRATIVAS`). Contratos antigos
                  cadastrados com outro texto continuam mostrando o valor que já tinham, até
                  alguém escolher uma das 6 — sem isso o select abriria "vazio" e a edição
                  apagaria a unidade sem querer. */}
              {form.unidade && !UNIDADES_ADMINISTRATIVAS.includes(form.unidade) && (
                <option value={form.unidade}>{form.unidade} (fora da lista — escolha uma das SADs)</option>
              )}
              {UNIDADES_ADMINISTRATIVAS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
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
            <span className="form-hint form-hint--muted">
              Clique no campo para escolher um usuário do sistema ou, se preferir, digite o nome livremente. Escolher um usuário é opcional.
            </span>
            <datalist id="lista-usuarios-contrato">
              {Array.from(new Map(usuarios.map((u) => [u.nome, u])).values())
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((u) => (
                  <option key={u.id} value={u.nome}>{u.cargo || u.email}</option>
                ))}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Fiscal Técnico</label>
            <input className="form-input" list="lista-usuarios-contrato" autoComplete="off" placeholder="Nome do fiscal técnico — escolha um usuário ou digite" value={form.fiscalTecnico} onChange={(e) => set('fiscalTecnico', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Administrativo</label>
            <input className="form-input" list="lista-usuarios-contrato" autoComplete="off" placeholder="Nome do fiscal administrativo — escolha um usuário ou digite" value={form.fiscalAdministrativo} onChange={(e) => set('fiscalAdministrativo', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Substituto</label>
            <input className="form-input" list="lista-usuarios-contrato" autoComplete="off" placeholder="Nome do fiscal substituto — escolha um usuário ou digite" value={form.fiscalSubstituto} onChange={(e) => set('fiscalSubstituto', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gestor do Contrato</label>
            <input className="form-input" list="lista-usuarios-contrato" autoComplete="off" placeholder="Nome do gestor — escolha um usuário ou digite" value={form.gestor} onChange={(e) => set('gestor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gestor Substituto</label>
            <input className="form-input" list="lista-usuarios-contrato" autoComplete="off" placeholder="Nome do gestor substituto — escolha um usuário ou digite" value={form.gestorSubstituto} onChange={(e) => set('gestorSubstituto', e.target.value)} />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Preposto da Contratada</label>
            <input className="form-input" placeholder="Representante da empresa responsável por este contrato" value={form.preposto} onChange={(e) => set('preposto', e.target.value)} />
          </div>

          {/* Aspectos de Sustentabilidade deste contrato */}
          <div className="form-group form-group--full">
            <label className="form-label">Aspectos de Sustentabilidade deste contrato *</label>
            {!form.objeto ? (
              <p className="form-hint form-hint--muted">Escolha o objeto acima para ver os aspectos sugeridos.</p>
            ) : aspectosTravados ? (
              <>
                <div className="aspectos-contrato-lista">
                  {aspectosIds.map((id) => {
                    const ind = indicadores.find((i) => i.id === id);
                    return (
                      <span key={id} className="badge badge--outline">
                        {ind ? capitalizarPalavras(ind.nome) : id}
                      </span>
                    );
                  })}
                </div>
                <p className="form-hint form-hint--muted">
                  Escolhidos no cadastro e fixos desde então (valem mesmo nas prorrogações). Só quem tem permissão para editar a
                  Estrutura de Sustentabilidade pode alterar.
                </p>
              </>
            ) : (
              <>
                <p className="form-hint form-hint--muted" style={{ marginTop: 0 }}>
                  Os aspectos do objeto vêm sugeridos. Desmarque os que o edital deste contrato não prevê. Depois de salvo, a
                  escolha fica fixa{contratoParaEditar ? '' : ' (só o Administrador, ou quem ele liberar, altera)'}.
                </p>
                <div className="aspectos-contrato-grid">
                  {aspectosDoObjetoForm.length === 0 && (
                    <p className="empty-state-sm">Nenhum aspecto cadastrado para este objeto.</p>
                  )}
                  {aspectosDoObjetoForm.map((ind) => (
                    <label key={ind.id} className="aspecto-contrato-item">
                      <input type="checkbox" checked={aspectosIds.includes(ind.id)} onChange={() => alternarAspecto(ind.id)} />
                      <span>{capitalizarPalavras(ind.nome)}</span>
                      {ind.impactoColetivo && <span className="badge badge--outline badge--coletivo">Meta da Unidade</span>}
                    </label>
                  ))}
                </div>
                {aspectosDeOutrosObjetos.length > 0 && (
                  <details className="aspectos-contrato-outros">
                    <summary>Incluir aspecto de outro objeto contratual</summary>
                    <div className="aspectos-contrato-grid">
                      {aspectosDeOutrosObjetos.map((ind) => (
                        <label key={ind.id} className="aspecto-contrato-item">
                          <input type="checkbox" checked={aspectosIds.includes(ind.id)} onChange={() => alternarAspecto(ind.id)} />
                          <span>
                            {capitalizarPalavras(ind.nome)}
                            <span className="text-muted"> · {capitalizarPalavras(ind.tipo)}</span>
                          </span>
                          {ind.impactoColetivo && <span className="badge badge--outline badge--coletivo">Meta da Unidade</span>}
                        </label>
                      ))}
                    </div>
                  </details>
                )}
                {semAspectos && (
                  <span className="form-hint form-hint--danger">Marque pelo menos um aspecto de sustentabilidade.</span>
                )}
              </>
            )}
          </div>

          {/* Observação */}
          <div className="form-group form-group--full">
            <label className="form-label">Observação</label>
            <textarea className="form-input form-textarea" placeholder="Informações adicionais sobre o contrato..." value={form.observacao} onChange={(e) => set('observacao', e.target.value)} />
          </div>

        </div>
        {tentouSalvar && camposFaltando.length > 0 && (
          <div ref={avisoRef} className="form-alerta-campos" role="alert">
            <strong>Não foi possível salvar ainda.</strong> Preencha o que falta:
            <ul>
              {camposFaltando.map((c) => <li key={c.chave}>{c.rotulo}</li>)}
            </ul>
          </div>
        )}
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
export function BadgeVigencia({ contrato }: { contrato: Contrato }) {
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
  ocorrencia: 'Ocorrência',
};

// ── Modal Detalhe do Contrato ───────────────────────────────────────
export function ModalDetalheContrato({
  contrato,
  onClose,
  onEditar,
  somenteConsulta = false,
}: {
  contrato: Contrato;
  onClose: () => void;
  onEditar: (c: Contrato) => void;
  /** Abre o detalhe só para leitura (usado na aba Fornecedores): esconde editar, prorrogar, status e anexos. */
  somenteConsulta?: boolean;
}) {
  const { updateContrato, medicoes, indicadores, ocorrencias, eixosPDLS, podeEditar: podeEditarPagina, podeExcluir: podeExcluirPagina } = useData();
  const podeEditar = !somenteConsulta && podeEditarPagina('contratos');
  const podeExcluir = !somenteConsulta && podeExcluirPagina('contratos');
  const [mostrarProrrogacao, setMostrarProrrogacao] = useState(false);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);
  const [aba, setAba] = useState<'detalhes' | 'ocorrencias'>('detalhes');
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [ocMes, setOcMes] = useState('todos');
  const [ocTipo, setOcTipo] = useState<'todos' | 'ocorrencia' | 'treinamento'>('todos');
  const [novaData, setNovaData] = useState(contrato.vigenciaFim ?? '');
  const [motivo, setMotivo] = useState('');
  const [erroArquivo, setErroArquivo] = useState('');
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  const status = statusVigencia(contrato);
  const dias = diasParaVencimento(contrato.vigenciaFim);

  // Ocorrências deste contrato (mais recentes primeiro) e filtros por mês e tipo.
  const ocorrenciasDoContrato = ocorrencias
    .filter((o) => o.contratoId === contrato.id)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const mesesComOcorrencia = Array.from(new Set(ocorrenciasDoContrato.map((o) => (o.data || '').slice(0, 7)).filter(Boolean)));
  const ocorrenciasFiltradas = ocorrenciasDoContrato.filter(
    (o) => (ocMes === 'todos' || (o.data || '').startsWith(ocMes)) && (ocTipo === 'todos' || (o.tipoRegistro ?? 'ocorrencia') === ocTipo),
  );
  const totalDeducaoFiltrado = ocorrenciasFiltradas.reduce((t, o) => t + ((o.tipoRegistro ?? 'ocorrencia') === 'treinamento' ? 0 : o.deducao || 0), 0);
  const rotuloMesAno = (anoMes: string) => {
    const [ano, mes] = anoMes.split('-').map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const alternarStatus = () => {
    setConfirmandoInativar(false);
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
  // Histórico do contrato paginado (10 eventos por página; só essa lista muda de página).
  const EVENTOS_POR_PAGINA = 10;
  const totalPaginasHistorico = Math.max(1, Math.ceil(historicoOrdenado.length / EVENTOS_POR_PAGINA));
  const paginaHistoricoAtual = Math.min(paginaHistorico, totalPaginasHistorico);

  // Histórico mensal de score — fica disponível mesmo com o contrato inativo, como
  // informação gerencial para avaliar o desempenho do fornecedor em futuras contratações.
  const historicoScore = medicoes.filter((m) => m.contratoId === contrato.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{contrato.numero}</h2>
            <p className="modal-subtitle" style={{ margin: '2px 0 0' }}>{contrato.fornecedorNome} · {contrato.objeto ? capitalizarPalavras(contrato.objeto) : contrato.objeto}</p>
            {rotuloAutoria(contrato.criadoPor, contrato.criadoEm) && (
              <p className="autoria-linha">{rotuloAutoria(contrato.criadoPor, contrato.criadoEm)}</p>
            )}
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

        <div className="forn-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'detalhes'} className={`forn-tab ${aba === 'detalhes' ? 'forn-tab--ativa' : ''}`} onClick={() => setAba('detalhes')}>
            Detalhes do contrato
          </button>
          <button type="button" role="tab" aria-selected={aba === 'ocorrencias'} className={`forn-tab ${aba === 'ocorrencias' ? 'forn-tab--ativa' : ''}`} onClick={() => setAba('ocorrencias')}>
            Ocorrências ({ocorrenciasDoContrato.length})
          </button>
        </div>

        {aba === 'ocorrencias' && (
          <div className="forn-aba">
            {ocorrenciasDoContrato.length === 0 ? (
              <p className="empty-state-sm">Nenhuma ocorrência registrada para este contrato.</p>
            ) : (
              <>
                <div className="forn-ocorr-filtro">
                  <select className="filter-select-plain" value={ocMes} onChange={(e) => setOcMes(e.target.value)} aria-label="Filtrar por mês">
                    <option value="todos">Todos os meses</option>
                    {mesesComOcorrencia.map((m) => (
                      <option key={m} value={m}>{rotuloMesAno(m)}</option>
                    ))}
                  </select>
                  <select className="filter-select-plain" value={ocTipo} onChange={(e) => setOcTipo(e.target.value as typeof ocTipo)} aria-label="Filtrar por tipo">
                    <option value="todos">Com e sem dedução</option>
                    <option value="ocorrencia">Só com dedução</option>
                    <option value="treinamento">Só sem dedução</option>
                  </select>
                  <span className="occurrence-count">
                    {ocorrenciasFiltradas.length} registro{ocorrenciasFiltradas.length !== 1 ? 's' : ''}
                    {totalDeducaoFiltrado > 0 ? ` · -${totalDeducaoFiltrado} pts no total` : ''}
                  </span>
                </div>
                {ocorrenciasFiltradas.length === 0 ? (
                  <p className="empty-state-sm">Nenhum registro com esses filtros.</p>
                ) : (
                  <div className="occurrence-list">
                    {ocorrenciasFiltradas.map((o) => {
                      const semDeducao = (o.tipoRegistro ?? 'ocorrencia') === 'treinamento';
                      const eixo = eixosPDLS.find((e) => e.id === o.eixoPDLSId);
                      return (
                        <div key={o.id} className="occurrence-item forn-ocorr-item">
                          <div className="occurrence-item-left">
                            <span className="occurrence-date">{formatarDataBR(o.data)}</span>
                            <div className="occurrence-main">
                              <span className="occurrence-desc">{o.descricao}</span>
                              <span className="occurrence-meta">
                                {o.indicadorNome && <span>{o.indicadorNome}</span>}
                                {eixo && <span>Eixo {eixo.numero}</span>}
                                {o.registradoPor && <span>Registrado por {o.registradoPor}</span>}
                                {o.anexos && o.anexos.length > 0 && <span>{o.anexos.length} anexo{o.anexos.length !== 1 ? 's' : ''}</span>}
                                {o.link && (
                                  <a href={o.link} target="_blank" rel="noreferrer">Ver link</a>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="occurrence-item-right">
                            {semDeducao ? <span className="occurrence-sem-deducao">Sem dedução</span> : <span className="occurrence-deducao">-{o.deducao}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {aba === 'detalhes' && (<>
        {/* Status */}
        <div className="detail-block">
          <div className="detail-block-row">
            <span className={`contract-status contract-status--${contrato.status}`}>
              {contrato.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
            {podeEditar && (
              <button
                className="btn-icon"
                // Inativar pede confirmação (tira o contrato do score); reativar é direto.
                onClick={() => (contrato.status === 'ativo' ? setConfirmandoInativar(true) : alternarStatus())}
              >
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
                    Score: {m.score} · {Math.max(PAGAMENTO_MINIMO_NF, m.pagamento)}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aspectos de Sustentabilidade do contrato */}
        <div className="detail-block">
          <p className="form-section-title" style={{ marginTop: 0 }}>Aspectos de Sustentabilidade do contrato</p>
          {contrato.aspectosIds === undefined ? (
            <p className="form-hint form-hint--muted">
              Contrato anterior à escolha de aspectos: vale todos os aspectos do objeto. Edite o contrato para definir quais se aplicam.
            </p>
          ) : contrato.aspectosIds.length === 0 ? (
            <p className="empty-state-sm">Nenhum aspecto selecionado.</p>
          ) : (
            <div className="aspectos-contrato-lista">
              {contrato.aspectosIds.map((id) => {
                const ind = indicadores.find((i) => i.id === id);
                return (
                  <span key={id} className="badge badge--outline">
                    {ind ? capitalizarPalavras(ind.nome) : id}
                    {ind?.impactoColetivo ? ' · Meta da Unidade' : ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="detail-block">
          <p className="form-section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={14} /> Histórico do contrato
          </p>
          <div className="historico-list">
            {historicoOrdenado.length === 0 && (
              <p className="empty-state-sm">Sem eventos registrados ainda.</p>
            )}
            {historicoOrdenado.slice((paginaHistoricoAtual - 1) * EVENTOS_POR_PAGINA, paginaHistoricoAtual * EVENTOS_POR_PAGINA).map((ev) => (
              <div key={ev.id} className="historico-item">
                <span className={`historico-tag historico-tag--${ev.tipo}`}>{rotuloTipoHistorico[ev.tipo]}</span>
                <div className="historico-item-body">
                  <p className="historico-desc">{ev.descricao}</p>
                  <p className="historico-data">
                    {new Date(ev.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {ev.autor ? ` · por ${ev.autor}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Paginacao
            pagina={paginaHistoricoAtual}
            totalPaginas={totalPaginasHistorico}
            onMudar={setPaginaHistorico}
            rotuloItens={`${historicoOrdenado.length} eventos`}
          />
        </div>

        </>)}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>

      {confirmandoInativar && (
        <div
          className="modal-overlay modal-overlay--confirmar"
          onClick={(e) => { e.stopPropagation(); setConfirmandoInativar(false); }}
        >
          <div className="modal modal--confirmar" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Inativar este contrato?</h2>
            <p className="modal-subtitle" style={{ margin: 0 }}>
              O contrato <strong>{contrato.numero}</strong> ({contrato.fornecedorNome}) deixa de contar no cálculo do score do fornecedor
              e nos indicadores gerenciais. O histórico é mantido e você pode reativá-lo depois.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmandoInativar(false)}>Cancelar</button>
              <button className="btn-primary btn-primary--perigo" onClick={alternarStatus}>Sim, inativar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

