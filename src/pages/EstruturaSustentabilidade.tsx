import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Check, ChevronLeft, ChevronRight, ClipboardCheck, Upload, Paperclip } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Indicador, IndicadorPDLS, UnidadeMedidaPDLS, Anexo } from '../types';
import { TAMANHO_MAX_ANEXO, MAX_ANEXOS_POR_ENVIO, arquivosParaAnexos } from '../utils/anexos';

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

/** Rótulo de cada um dos 5 passos do cadastro em cascata, usado na barra de passos. */
const NOMES_PASSO = ['Objeto Contratual', 'Aspecto de Sustentabilidade', 'Eixo PDLS', 'Indicador de Desempenho', 'Observações'];

/**
 * Valor "sentinela" de `eixoSelecionadoId` pra representar, no passo 3, a opção
 * "este Indicador de Desempenho não tem vinculação com nenhum dos 6 Eixos PDLS"
 * — existe pra cobrir exigências contratuais/legais que o próprio documento de
 * origem já marca assim (ex: Saúde e Segurança do Trabalho, Combate ao Trabalho
 * Infantil). Nunca é salvo como Eixo de verdade (não existe em `eixosPDLS`) —
 * quando selecionado, o Indicador de Desempenho criado fica com `eixoId`
 * indefinido (ver `IndicadorPDLS` em types/index.ts).
 */
const SEM_VINCULO_PDLS = '__sem_vinculo_pdls__';

/**
 * Tela dedicada de CADASTRO da estrutura de sustentabilidade, em cascata: Objeto
 * Contratual → Aspecto de Sustentabilidade → Eixo PDLS → Indicador de Desempenho
 * → Observações (opcional). Criada porque misturar esse cadastro dentro do
 * detalhe (só consulta) de um Aspecto, em `Indicadores.tsx`, estava confuso —
 * ver README_HANDOFF.md e o comentário no tipo `Indicador`.
 *
 * A tela funciona como um wizard de verdade — só um passo visível por vez, com
 * botões Voltar/Avançar — em vez dos passos empilhados na mesma tela (isso foi
 * trocado a pedido da usuária, que achou todos sempre visíveis juntos poluído).
 * `passo` controla qual está em tela; `maxPasso` (calculado a partir do que já
 * foi selecionado) controla até onde a barra de passos deixa saltar diretamente.
 *
 * O passo 5 ("Observações") é opcional — permite anexar um documento e/ou
 * escrever uma nota livre sobre o Indicador de Desempenho selecionado no passo 4,
 * pra registrar algo que não se encaixa exatamente como "meio de verificação"
 * (ex: uma justificativa). Fica salvo em `IndicadorPDLS.observacoes`/`.anexos`.
 *
 * Só quem tem permissão em `cadastroPdls` (ver `Perfis.tsx`) vê e usa esta tela;
 * os demais só selecionam/consultam o que já foi cadastrado aqui, em outras telas
 * (Aspectos de Sustentabilidade, Ocorrências).
 */
export default function EstruturaSustentabilidade() {
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
  const navigate = useNavigate();

  const [passo, setPasso] = useState(1);

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

  const [pdlsSelecionadoId, setPdlsSelecionadoId] = useState<string | null>(null);
  const [textoObservacoes, setTextoObservacoes] = useState('');
  const [anexosAtuais, setAnexosAtuais] = useState<Anexo[]>([]);
  const [novosArquivos, setNovosArquivos] = useState<File[]>([]);
  const [erroArquivoObs, setErroArquivoObs] = useState('');
  const [salvouObservacoes, setSalvouObservacoes] = useState(false);

  const aspectosDoObjeto = indicadores.filter((i) => i.tipo === objetoSelecionado);
  const aspectoSelecionado = indicadores.find((i) => i.id === aspectoSelecionadoId) ?? null;
  const eixoSelecionado = eixosPDLS.find((e) => e.id === eixoSelecionadoId) ?? null;
  // Sentinela do passo 3 (ver comentário em `SEM_VINCULO_PDLS`) — não é um Eixo de
  // verdade, por isso não aparece em `eixosPDLS.find(...)` acima.
  const semVinculoSelecionado = eixoSelecionadoId === SEM_VINCULO_PDLS;
  const eixoEtapaValida = eixoSelecionado !== null || semVinculoSelecionado;
  const indicadoresDoEixo = aspectoSelecionado && eixoEtapaValida
    ? indicadoresPDLSDe(aspectoSelecionado.id, semVinculoSelecionado ? null : (eixoSelecionado as NonNullable<typeof eixoSelecionado>).id)
    : [];
  const pdlsSelecionado = indicadoresDoEixo.find((p) => p.id === pdlsSelecionadoId) ?? null;

  // Até onde a barra de passos deixa saltar direto — um passo só fica alcançável
  // depois que o anterior tem uma seleção válida. O passo 5 (Observações) é opcional,
  // então ele conta pro alcance mas nunca bloqueia nada depois dele (é o último).
  const maxPasso = 1 + (objetoSelecionado ? 1 : 0) + (aspectoSelecionado ? 1 : 0) + (eixoEtapaValida ? 1 : 0) + (pdlsSelecionado ? 1 : 0);

  // Se uma seleção anterior for desfeita (ex: excluiu o objeto que estava selecionado
  // enquanto já tinha avançado pros passos seguintes), volta pro passo mais avançado
  // que ainda é válido — sem isso o usuário ficaria "preso" num passo vazio.
  useEffect(() => {
    if (passo > maxPasso) setPasso(maxPasso);
  }, [passo, maxPasso]);

  // Carrega a observação/anexos já salvos do Indicador de Desempenho selecionado sempre
  // que a seleção mudar (troca de indicador, ou de eixo/aspecto/objeto lá atrás, que
  // limpa a seleção) — sem isso o passo 5 mostraria os dados do indicador anterior.
  useEffect(() => {
    setTextoObservacoes(pdlsSelecionado?.observacoes ?? '');
    setAnexosAtuais(pdlsSelecionado?.anexos ?? []);
    setNovosArquivos([]);
    setErroArquivoObs('');
    setSalvouObservacoes(false);
  }, [pdlsSelecionadoId]);

  if (!podeVer('cadastroPdls')) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Estrutura de Sustentabilidade</h1>
            <p className="page-subtitle">Acesso restrito.</p>
          </div>
        </div>
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver esta tela.</div>
      </div>
    );
  }

  // ── Passo 1: Objeto Contratual ──────────────────────────────────
  const selecionarObjeto = (objeto: string) => {
    setObjetoSelecionado(objeto);
    setAspectoSelecionadoId(null);
    setEixoSelecionadoId(null);
    setPdlsSelecionadoId(null);
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
    setPdlsSelecionadoId(null);
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
    setPdlsSelecionadoId(null);
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
  const selecionarPDLS = (id: string) => {
    setPdlsSelecionadoId(id);
  };

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
    if (!aspectoSelecionado || !eixoEtapaValida || !formPDLS.nome.trim()) return;
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
      const novoId = `pdls${Date.now()}`;
      addIndicadorPDLS({
        id: novoId,
        macroindicadorId: aspectoSelecionado.id,
        eixoId: semVinculoSelecionado ? undefined : (eixoSelecionado as NonNullable<typeof eixoSelecionado>).id,
        nome: formPDLS.nome,
        meta: formPDLS.meta || undefined,
        unidadeMedida: formPDLS.unidadeMedida,
        meiosVerificacao,
        referenciaNormativa: formPDLS.referenciaNormativa || undefined,
      });
      // Seleciona automaticamente o que acabou de ser criado — como no passo 2
      // (Aspecto), isso já deixa o "Avançar" pro passo 5 (Observações) liberado.
      setPdlsSelecionadoId(novoId);
    }
    setMostrarFormPDLS(false);
    setEditandoPDLSId(null);
    setFormPDLS(formPDLSVazio);
  };

  const handleRemovePDLS = (id: string) => {
    removeIndicadorPDLS(id);
    if (pdlsSelecionadoId === id) setPdlsSelecionadoId(null);
  };

  // ── Passo 5: Observações (opcional) ─────────────────────────────
  const handleArquivosObs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files ?? []);
    if (!novos.length) return;

    const grandeDemais = novos.filter((f) => f.size > TAMANHO_MAX_ANEXO);
    const validos = novos.filter((f) => f.size <= TAMANHO_MAX_ANEXO);

    setNovosArquivos((prev) => {
      const combinados = [...prev, ...validos];
      const totalComExistentes = combinados.length + anexosAtuais.length;
      if (totalComExistentes > MAX_ANEXOS_POR_ENVIO) {
        setErroArquivoObs(`Você pode anexar no máximo ${MAX_ANEXOS_POR_ENVIO} arquivos.`);
        return combinados.slice(0, Math.max(0, MAX_ANEXOS_POR_ENVIO - anexosAtuais.length));
      }
      setErroArquivoObs(grandeDemais.length ? 'Alguns arquivos passaram de 4MB e não foram adicionados.' : '');
      return combinados;
    });
    e.target.value = '';
  };

  const removerNovoArquivoObs = (index: number) => {
    setNovosArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const removerAnexoSalvoObs = (id: string) => {
    setAnexosAtuais((prev) => prev.filter((a) => a.id !== id));
  };

  const salvarObservacoes = async () => {
    if (!pdlsSelecionado || !aspectoSelecionado) return;
    const novosAnexos = novosArquivos.length ? await arquivosParaAnexos(novosArquivos) : [];
    const anexosFinais = [...anexosAtuais, ...novosAnexos];
    updateIndicadorPDLS(pdlsSelecionado.id, {
      observacoes: textoObservacoes.trim() || undefined,
      anexos: anexosFinais.length ? anexosFinais : undefined,
    });

    // Depois de salvar, leva direto pra "Aspectos de Sustentabilidade" (tela de consulta),
    // já com o modal do Aspecto correspondente aberto — a usuária pediu isso pra poder
    // confirmar visualmente o que acabou de salvar, sem precisar navegar e procurar de
    // novo. Só navega se o perfil também tiver acesso àquela tela (por padrão todo perfil
    // que vê "Estrutura de Sustentabilidade" também vê "Aspectos de Sustentabilidade",
    // mas perfis customizados podem não ter — nesse caso só confirma na própria tela).
    if (podeVer('indicadores')) {
      navigate('/indicadores', { state: { abrirAspectoId: aspectoSelecionado.id } });
      return;
    }

    setAnexosAtuais(anexosFinais);
    setNovosArquivos([]);
    setSalvouObservacoes(true);
  };

  // Rótulo da seleção já feita em cada passo, mostrado embaixo do nome do passo
  // na barra — é o que substitui a antiga "trilha" (breadcrumb) separada.
  const valorDoPasso = [
    objetoSelecionado || null,
    aspectoSelecionado?.nome ?? null,
    semVinculoSelecionado
      ? 'Sem vinculação ao PDLS'
      : eixoSelecionado ? `Eixo ${eixoSelecionado.numero} – ${eixoSelecionado.nome}` : null,
    pdlsSelecionado?.nome ?? null,
    null,
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Estrutura de Sustentabilidade</h1>
          <p className="page-subtitle">
            Monte a estrutura em 4 passos: Objeto Contratual → Aspecto de Sustentabilidade → Eixo PDLS → Indicador de Desempenho.
            O 5º passo (Observações) é opcional.
          </p>
        </div>
      </div>

      {/* Barra de passos — só um passo fica visível por vez (ver comentário no
          topo do arquivo); ela também mostra o que já foi selecionado em cada
          passo anterior, fazendo o papel que antes era de uma trilha separada. */}
      <div className="wizard-steps">
        {NOMES_PASSO.map((nome, i) => {
          const n = i + 1;
          const alcancavel = n <= maxPasso;
          const concluido = n < maxPasso;
          return (
            <button
              key={nome}
              type="button"
              className={`wizard-step ${n === passo ? 'wizard-step--active' : ''} ${concluido ? 'wizard-step--done' : ''}`}
              disabled={!alcancavel}
              onClick={() => setPasso(n)}
            >
              <span className="wizard-step-num">{concluido ? <Check size={13} /> : n}</span>
              <span className="wizard-step-text">
                <span className="wizard-step-label">{nome}</span>
                {valorDoPasso[i] && <span className="wizard-step-value">{valorDoPasso[i]}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Passo 1: Objeto Contratual */}
      {passo === 1 && (
        <div className="occurrence-card wizard-card">
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
          <div className="wizard-nav">
            <span />
            <button className="btn-primary" disabled={!objetoSelecionado} onClick={() => setPasso(2)}>
              Avançar <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: Aspecto de Sustentabilidade */}
      {passo === 2 && (
        <div className="occurrence-card wizard-card">
          <h3 className="occurrence-section-title">2. Aspecto de Sustentabilidade</h3>
          <p className="form-hint form-hint--muted" style={{ marginBottom: 8 }}>
            Aspectos de sustentabilidade do objeto <strong>{objetoSelecionado}</strong>.
          </p>
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

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setPasso(1)}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <button className="btn-primary" disabled={!aspectoSelecionado} onClick={() => setPasso(3)}>
              Avançar <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Passo 3: Eixo PDLS */}
      {passo === 3 && aspectoSelecionado && (
        <div className="occurrence-card wizard-card">
          <h3 className="occurrence-section-title">3. Eixo PDLS</h3>
          <p className="form-hint form-hint--muted" style={{ marginBottom: 8 }}>
            Eixos já com indicador cadastrado para <strong>{aspectoSelecionado.nome}</strong> aparecem marcados; os outros ainda estão disponíveis.
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

            {/* Pseudo-tab pra indicadores sem vinculação com nenhum Eixo PDLS — não é um
                Eixo de verdade (não tem lápis/lixeira, não entra em `eixosPDLS`), só uma
                segunda opção de seleção pro passo 3. Ver comentário em `SEM_VINCULO_PDLS`. */}
            <button
              type="button"
              className={`eixo-tab ${semVinculoSelecionado ? 'eixo-tab--active' : ''} ${indicadoresPDLSDe(aspectoSelecionado.id, null).length > 0 ? 'eixo-tab--cadastrado' : ''}`}
              onClick={() => selecionarEixo(SEM_VINCULO_PDLS)}
              title="Para exigências contratuais/legais que não se enquadram em nenhum dos 6 Eixos PDLS"
            >
              Sem vinculação direta ao PDLS
            </button>
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

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setPasso(2)}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <button className="btn-primary" disabled={!eixoEtapaValida} onClick={() => setPasso(4)}>
              Avançar <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Passo 4: Indicador de Desempenho PDLS */}
      {passo === 4 && aspectoSelecionado && eixoEtapaValida && (
        <div className="occurrence-card wizard-card">
          <h3 className="occurrence-section-title">4. Indicador de Desempenho PDLS</h3>
          <p className="form-hint form-hint--muted" style={{ marginBottom: 8 }}>
            {semVinculoSelecionado ? (
              <>Indicadores de <strong>{aspectoSelecionado.nome}</strong> sem vinculação direta ao PDLS.</>
            ) : (
              <>Indicadores de <strong>{aspectoSelecionado.nome}</strong> no Eixo {eixoSelecionado!.numero} – {eixoSelecionado!.nome}.</>
            )}{' '}
            Clique num indicador pra selecioná-lo e (se quiser) adicionar observações no próximo passo.
          </p>
          <div className="pdls-list">
            {indicadoresDoEixo.map((p) => {
              const temObservacao = !!p.observacoes || (p.anexos && p.anexos.length > 0);
              return (
                <div
                  key={p.id}
                  className="pdls-card"
                  style={{ cursor: 'pointer', borderColor: p.id === pdlsSelecionadoId ? 'var(--primary)' : undefined }}
                  onClick={() => selecionarPDLS(p.id)}
                >
                  <div className="pdls-card-top">
                    <span className="pdls-card-nome">
                      {p.nome}
                      {temObservacao && <Paperclip size={12} style={{ marginLeft: 6, verticalAlign: 'middle', color: 'var(--text-muted)' }} />}
                    </span>
                    {(podeEditar || podeExcluir) && (
                      <div className="indicator-card-actions">
                        {podeEditar && (
                          <button className="indicator-action-btn" title="Editar" onClick={(e) => { e.stopPropagation(); abrirEditarPDLS(p); }}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button className="indicator-action-btn indicator-action-btn--delete" title="Excluir" onClick={(e) => { e.stopPropagation(); handleRemovePDLS(p.id); }}>
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
              );
            })}
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

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setPasso(3)}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <button className="btn-primary" disabled={!pdlsSelecionado} onClick={() => setPasso(5)}>
              Avançar <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Passo 5: Observações (opcional) — nota livre e/ou documentos de apoio sobre o
          Indicador de Desempenho selecionado no passo 4. */}
      {passo === 5 && pdlsSelecionado && (
        <div className="occurrence-card wizard-card">
          <h3 className="occurrence-section-title">5. Observações</h3>
          <p className="form-hint form-hint--muted" style={{ marginBottom: 8 }}>
            Opcional — sobre <strong>{pdlsSelecionado.nome}</strong>. Use pra registrar algo que não
            se encaixa nos meios de verificação, ou anexar um documento de apoio.
          </p>

          <div className="form-group form-group--full">
            <label className="form-label">Observação (texto livre)</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Ex: aguardando validação do órgão responsável antes de aplicar a meta definitiva."
              value={textoObservacoes}
              onChange={(e) => { setTextoObservacoes(e.target.value); setSalvouObservacoes(false); }}
            />
          </div>

          <div className="form-group form-group--full">
            <label className="form-label">Documento anexo (opcional)</label>
            <label className="file-upload-box">
              <Upload size={16} />
              <span>
                {novosArquivos.length
                  ? `${novosArquivos.length} arquivo${novosArquivos.length !== 1 ? 's' : ''} selecionado${novosArquivos.length !== 1 ? 's' : ''}`
                  : 'Selecionar um ou mais arquivos — PDF, imagem ou documento (até 4MB cada)'}
              </span>
              <input type="file" multiple accept=".pdf,.doc,.docx,image/*" className="file-upload-input" onChange={handleArquivosObs} />
            </label>

            {anexosAtuais.length > 0 && (
              <div className="anexo-list" style={{ marginTop: 8 }}>
                {anexosAtuais.map((anexo) => (
                  <div key={anexo.id} className="anexo-item">
                    <Paperclip size={13} />
                    <a className="anexo-item-nome anexo-item-link" href={anexo.url} target="_blank" rel="noreferrer" download={anexo.nome}>
                      {anexo.nome}
                    </a>
                    <button type="button" className="anexo-item-remove" onClick={() => removerAnexoSalvoObs(anexo.id)} aria-label="Remover anexo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {novosArquivos.length > 0 && (
              <div className="anexo-list" style={{ marginTop: 8 }}>
                {novosArquivos.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="anexo-item">
                    <Paperclip size={13} />
                    <span className="anexo-item-nome">{f.name}</span>
                    <button type="button" className="anexo-item-remove" onClick={() => removerNovoArquivoObs(i)} aria-label="Remover arquivo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {erroArquivoObs && <span className="form-hint form-hint--danger">{erroArquivoObs}</span>}
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn-primary" onClick={salvarObservacoes}>Salvar observações</button>
            {salvouObservacoes && <span className="form-hint form-hint--muted">Salvo.</span>}
          </div>

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setPasso(4)}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
