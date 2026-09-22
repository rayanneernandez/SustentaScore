import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  dbContratos, dbEixosPDLS, dbFornecedores, dbIndicadores, dbIndicadoresPDLS,
  dbMedicoes, dbNotificacoesLidas, dbObjetosContratuais, dbOcorrencias,
  dbPerfis, dbScoreHistorico, dbUsuarios,
} from '../lib/db';
import { supabaseConfigurado } from '../lib/supabaseClient';
import { PERFIS_PADRAO, PERFIL_ADMIN_ID, PERFIL_COLABORADOR_ID } from '../config/sistema';
import type {
  Contrato,
  EixoPDLS,
  Fornecedor,
  HistoricoEvento,
  HistoricoTipo,
  Indicador,
  IndicadorPDLS,
  Medicao,
  Notificacao,
  Ocorrencia,
  PaginaKey,
  Perfil,
  ScoreHistorico,
  Usuario,
} from '../types';

export const ALERTA_DIAS_PADRAO = 60;

/** Só guarda "quem está logado neste navegador" — nunca informação de negócio,
 * essa agora vive inteiramente no Supabase (ver `supabase/schema.sql`). */
const CHAVE_SESSAO = 'sustentascore:sessao:usuarioId';

// ── Utilitários de data ────────────────────────────────────────────
export function formatarDataBR(iso?: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Dias entre hoje e a data de vigência fim (negativo = já venceu). */
export function diasParaVencimento(vigenciaFim?: string): number | null {
  if (!vigenciaFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(`${vigenciaFim}T00:00:00`);
  if (Number.isNaN(fim.getTime())) return null;
  const diffMs = fim.getTime() - hoje.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type StatusVigencia = 'ok' | 'alerta' | 'vencido';

/** Retorna o status de vigência de um contrato ativo (null se não houver data ou estiver inativo). */
export function statusVigencia(contrato: Contrato): StatusVigencia | null {
  if (contrato.status !== 'ativo' || !contrato.vigenciaFim) return null;
  const dias = diasParaVencimento(contrato.vigenciaFim);
  if (dias === null) return null;
  if (dias < 0) return 'vencido';
  const limite = contrato.alertaDiasAntes ?? ALERTA_DIAS_PADRAO;
  if (dias <= limite) return 'alerta';
  return 'ok';
}

export function criarEventoHistorico(tipo: HistoricoTipo, descricao: string): HistoricoEvento {
  return {
    id: `h${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    data: new Date().toISOString(),
    tipo,
    descricao,
  };
}
const novoEvento = criarEventoHistorico;

/** Loga (sem travar a tela) uma falha ao sincronizar uma escrita com o Supabase
 * — a mudança já foi aplicada localmente (otimista); se a escrita de verdade
 * falhar, o usuário só vai notar que não "pegou" no próximo recarregamento.
 * Mesmo nível de robustez que o antigo `try { localStorage.setItem(...) }`. */
function sincronizar(promessa: Promise<void>, contexto: string): void {
  promessa.catch((erro) => {
    // eslint-disable-next-line no-console
    console.error(`[SustentaScore] Falha ao salvar no banco (${contexto}):`, erro);
  });
}

interface DadosCarregados {
  fornecedores: Fornecedor[];
  contratos: Contrato[];
  ocorrencias: Ocorrencia[];
  medicoes: Medicao[];
  scoreHistorico: ScoreHistorico[];
  notificacoesLidasIds: string[];
  indicadores: Indicador[];
  eixosPDLS: EixoPDLS[];
  indicadoresPDLS: IndicadorPDLS[];
  objetosContratuais: string[];
  usuarios: Usuario[];
  perfis: Perfil[];
}

async function carregarDoSupabase(): Promise<DadosCarregados> {
  const [
    fornecedores, contratos, ocorrencias, medicoes, scoreHistorico,
    notificacoesLidasIds, indicadores, eixosPDLS, indicadoresPDLS,
    objetosContratuais, usuarios, perfisCarregados,
  ] = await Promise.all([
    dbFornecedores.listar('nome'),
    dbContratos.listar(),
    dbOcorrencias.listar(),
    dbMedicoes.listar(),
    dbScoreHistorico.listar(),
    dbNotificacoesLidas.listar(),
    dbIndicadores.listar('nome'),
    dbEixosPDLS.listar('numero'),
    dbIndicadoresPDLS.listar(),
    dbObjetosContratuais.listar(),
    dbUsuarios.listar(),
    dbPerfis.listar(),
  ]);

  // Rede de segurança: garante que os dois perfis padrão sempre existam, mesmo
  // que o banco tenha sido criado sem rodar o seed de `supabase/schema.sql` —
  // sem isso o sistema poderia ficar sem nenhum caminho de acesso.
  const perfis = [...perfisCarregados];
  for (const padrao of PERFIS_PADRAO) {
    if (!perfis.some((p) => p.id === padrao.id)) {
      perfis.unshift(padrao);
      sincronizar(dbPerfis.inserir(padrao), `recriar perfil padrão ${padrao.nome}`);
    }
  }

  return {
    fornecedores,
    contratos: contratos.map((c) => ({ ...c, historico: c.historico ?? [], alertaDiasAntes: c.alertaDiasAntes ?? ALERTA_DIAS_PADRAO })),
    ocorrencias,
    medicoes,
    scoreHistorico,
    notificacoesLidasIds,
    indicadores,
    eixosPDLS,
    indicadoresPDLS,
    objetosContratuais,
    usuarios,
    perfis,
  };
}

/**
 * Gera notificações a partir da vigência dos contratos. Esta é hoje a única
 * origem de notificações, mas `notificacoes` (no contexto) foi desenhado para
 * agregar outras origens no futuro (ocorrências, quedas de score, medições
 * pendentes, etc.) — basta gerar mais listas como esta e concatenar.
 */
function gerarNotificacoesVigencia(contratos: Contrato[]): Array<Omit<Notificacao, 'lida'>> {
  const resultado: Array<Omit<Notificacao, 'lida'>> = [];
  for (const contrato of contratos) {
    const status = statusVigencia(contrato);
    if (!status || status === 'ok') continue;
    const dias = diasParaVencimento(contrato.vigenciaFim);
    if (dias === null) continue;
    const id = `vigencia:${contrato.id}:${status}`;
    if (status === 'vencido') {
      resultado.push({
        id,
        tipo: 'vigencia',
        titulo: `Contrato ${contrato.numero} vencido`,
        descricao: `O contrato de ${contrato.fornecedorNome} venceu há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}.`,
        urgencia: 'alta',
        link: '/cadastro',
      });
    } else {
      resultado.push({
        id,
        tipo: 'vigencia',
        titulo: `Contrato ${contrato.numero} vence em breve`,
        descricao: `${contrato.fornecedorNome} — renovar até ${formatarDataBR(contrato.vigenciaFim)} (${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}).`,
        urgencia: 'media',
        link: '/cadastro',
      });
    }
  }
  return resultado;
}

const ORDEM_URGENCIA: Record<Notificacao['urgencia'], number> = { alta: 0, media: 1, baixa: 2 };

// ── Contexto ─────────────────────────────────────────────────────
interface DataContextValue {
  fornecedores: Fornecedor[];
  contratos: Contrato[];
  addFornecedor: (f: Fornecedor) => void;
  updateFornecedor: (id: string, patch: Partial<Fornecedor>) => void;
  addContrato: (c: Contrato) => void;
  updateContrato: (id: string, patch: Partial<Contrato>, evento?: { tipo: HistoricoTipo; descricao: string }) => void;
  contratosDoFornecedor: (fornecedorId: string) => Contrato[];
  contratosAtivosDoFornecedor: (fornecedorId: string) => Contrato[];
  scoreFornecedor: (fornecedorId: string) => number | null;
  /** Notificações de todas as origens, já com `lida` calculado e ordenadas (não lidas primeiro, depois por urgência). */
  notificacoes: Notificacao[];
  marcarNotificacaoLida: (id: string) => void;
  marcarTodasNotificacoesLidas: (ids: string[]) => void;
  ocorrencias: Ocorrencia[];
  addOcorrencia: (o: Ocorrencia) => void;
  /** Histórico de medições mensais de todos os contratos (ver Módulo 5 e 6). */
  medicoes: Medicao[];
  /** Curva-base usada para desenhar a "Evolução do score médio" no Painel Gerencial. */
  scoreHistorico: ScoreHistorico[];
  /** Macroindicadores de sustentabilidade. */
  indicadores: Indicador[];
  addIndicador: (i: Indicador) => void;
  updateIndicador: (id: string, patch: Partial<Indicador>) => void;
  removeIndicador: (id: string) => void;
  /** Eixos PDLS — 6 originais + os que forem criados pelo usuário (ver `addEixoPDLS`). */
  eixosPDLS: EixoPDLS[];
  updateEixoPDLS: (id: string, nome: string) => void;
  /** Cria um novo Eixo PDLS, com o próximo número disponível (não precisa mais ficar só nos 6 originais). */
  addEixoPDLS: (nome: string) => void;
  /** Remove um Eixo PDLS — recusa se ainda estiver em uso (por alguma Ocorrência ou Aspecto de Sustentabilidade) ou se for o único restante. */
  removeEixoPDLS: (id: string) => boolean;
  /** Indicadores de Desempenho (PDLS), vinculados a um Macroindicador e a um Eixo. */
  indicadoresPDLS: IndicadorPDLS[];
  /**
   * Indicadores de Desempenho (PDLS) de um Macroindicador em um Eixo específico.
   * Passe `null` em `eixoId` para os indicadores sem vinculação direta a nenhum
   * Eixo PDLS (`eixoId` não definido — ver comentário em `IndicadorPDLS`).
   */
  indicadoresPDLSDe: (macroindicadorId: string, eixoId: string | null) => IndicadorPDLS[];
  addIndicadorPDLS: (i: IndicadorPDLS) => void;
  updateIndicadorPDLS: (id: string, patch: Partial<IndicadorPDLS>) => void;
  removeIndicadorPDLS: (id: string) => void;
  /** Objetos contratuais cadastrados. */
  objetosContratuais: string[];
  addObjetoContratual: (nome: string) => void;
  removeObjetoContratual: (nome: string) => void;

  // ── Usuários, perfis de acesso e sessão ──────────────────────────
  usuarios: Usuario[];
  /** Usuário logado nesta sessão (null se ninguém logou ainda). */
  usuarioAtual: Usuario | null;
  /** Tenta logar por email+senha; retorna true se as credenciais existirem na lista de usuários. */
  /** `manterConectado`: true grava a sessão no localStorage (sobrevive a fechar o
   * navegador), false grava no sessionStorage (encerra ao fechar a aba/navegador). */
  login: (email: string, senha: string, manterConectado: boolean) => boolean;
  logout: () => void;
  addUsuario: (u: Usuario) => void;
  /** Edita nome/cargo/e-mail/senha/perfil de um usuário existente. */
  updateUsuario: (id: string, patch: Partial<Usuario>) => void;
  /** Remove um usuário — recusa se for o último com o perfil Administrador, para não travar o acesso ao sistema. */
  removeUsuario: (id: string) => boolean;
  /** `true` quando o usuário logado (papel real, ignorando "ver como") tem o perfil Administrador padrão. */
  ehAdministradorReal: boolean;

  /** Perfis de acesso: os 2 padrão (Administrador/Colaborador) e os criados pelo usuário, cada um com sua própria grade de permissões por tela. */
  perfis: Perfil[];
  addPerfil: (p: Perfil) => void;
  /** Edita nome/permissões de um perfil — no perfil Administrador padrão, as permissões nunca são alteradas (sempre acesso total). */
  updatePerfil: (id: string, patch: Partial<Perfil>) => void;
  /** Remove um perfil — recusa se for um dos 2 padrão, ou se ainda houver usuário com esse perfil. */
  removePerfil: (id: string) => boolean;

  /**
   * Só para quem tem o perfil Administrador padrão: deixa "ver o sistema como"
   * outro perfil sem precisar deslogar, para conferir o que aquele perfil veria.
   * Guarda o id do perfil a simular; `null` = ver com o perfil real.
   */
  modoVisualizacao: string | null;
  setModoVisualizacao: (perfilId: string | null) => void;
  /** Perfil realmente em vigor nesta tela (considera o modoVisualizacao quando o usuário tem o perfil Administrador). */
  perfilEfetivo: Perfil | null;
  /** `true` se o perfil efetivo pode VER a tela informada — use para esconder itens de menu e bloquear rotas. */
  podeVer: (pagina: PaginaKey) => boolean;
  /** `true` se o perfil efetivo pode CRIAR registros novos na tela informada (ex: botão "Novo..."). */
  podeCriar: (pagina: PaginaKey) => boolean;
  /** `true` se o perfil efetivo pode EDITAR registros existentes na tela informada. */
  podeEditar: (pagina: PaginaKey) => boolean;
  /** `true` se o perfil efetivo pode EXCLUIR registros na tela informada. */
  podeExcluir: (pagina: PaginaKey) => boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosCarregados | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(
    () => localStorage.getItem(CHAVE_SESSAO) ?? sessionStorage.getItem(CHAVE_SESSAO),
  );
  // "Ver como outro perfil" — só na sessão atual (não persiste), sempre volta a
  // mostrar o perfil real do usuário quando a página é recarregada.
  const [modoVisualizacao, setModoVisualizacao] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    carregarDoSupabase()
      .then((carregados) => {
        if (!cancelado) setDados(carregados);
      })
      .catch((erro: Error) => {
        if (!cancelado) setErroCarregamento(erro.message);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // ── Fornecedores ────────────────────────────────────────────────
  const addFornecedor = (f: Fornecedor) => {
    setDados((prev) => (prev ? { ...prev, fornecedores: [...prev.fornecedores, f] } : prev));
    sincronizar(dbFornecedores.inserir(f), `novo fornecedor ${f.nome}`);
  };

  const updateFornecedor = (id: string, patch: Partial<Fornecedor>) => {
    setDados((prev) =>
      prev
        ? {
            ...prev,
            fornecedores: prev.fornecedores.map((f) => (f.id === id ? { ...f, ...patch } : f)),
            // Mantém o nome do fornecedor sincronizado nos contratos já cadastrados dele.
            contratos: patch.nome
              ? prev.contratos.map((c) => (c.fornecedorId === id ? { ...c, fornecedorNome: patch.nome as string } : c))
              : prev.contratos,
          }
        : prev,
    );
    sincronizar(dbFornecedores.atualizar(id, patch), `editar fornecedor ${id}`);
    if (patch.nome) {
      sincronizar(dbContratos.atualizarNomeFornecedor(id, patch.nome), `sincronizar nome do fornecedor ${id} nos contratos`);
    }
  };

  const addContrato = (c: Contrato) => {
    const contratoComHistorico: Contrato = {
      ...c,
      alertaDiasAntes: c.alertaDiasAntes ?? ALERTA_DIAS_PADRAO,
      historico: c.historico?.length ? c.historico : [novoEvento('criacao', 'Contrato cadastrado no sistema.')],
    };
    setDados((prev) =>
      prev
        ? {
            ...prev,
            contratos: [...prev.contratos, contratoComHistorico],
            fornecedores: prev.fornecedores.map((f) =>
              f.id === c.fornecedorId ? { ...f, contratos: f.contratos + 1 } : f,
            ),
          }
        : prev,
    );
    sincronizar(dbContratos.inserir(contratoComHistorico), `novo contrato ${c.numero}`);
    const fornecedorAtual = dados?.fornecedores.find((f) => f.id === c.fornecedorId);
    if (fornecedorAtual) {
      sincronizar(
        dbFornecedores.atualizar(c.fornecedorId, { contratos: fornecedorAtual.contratos + 1 }),
        `atualizar contagem de contratos do fornecedor ${c.fornecedorId}`,
      );
    }
  };

  const updateContrato: DataContextValue['updateContrato'] = (id, patch, evento) => {
    let historicoNovo: HistoricoEvento[] | undefined;
    setDados((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contratos: prev.contratos.map((c) => {
          if (c.id !== id) return c;
          const historico = evento ? [...(c.historico ?? []), novoEvento(evento.tipo, evento.descricao)] : c.historico;
          historicoNovo = historico;
          return { ...c, ...patch, historico };
        }),
      };
    });
    sincronizar(
      dbContratos.atualizar(id, historicoNovo !== undefined ? { ...patch, historico: historicoNovo } : patch),
      `editar contrato ${id}`,
    );
  };

  const contratosDoFornecedor = (fornecedorId: string) =>
    (dados?.contratos ?? []).filter((c) => c.fornecedorId === fornecedorId);

  const contratosAtivosDoFornecedor = (fornecedorId: string) =>
    (dados?.contratos ?? []).filter((c) => c.fornecedorId === fornecedorId && c.status === 'ativo');

  const scoreFornecedor = (fornecedorId: string): number | null => {
    const ativos = contratosAtivosDoFornecedor(fornecedorId);
    if (!ativos.length) return null;
    const total = ativos.reduce((soma, c) => soma + c.score, 0);
    return Math.round(total / ativos.length);
  };

  // ── Notificações ──────────────────────────────────────────────
  const marcarNotificacaoLida = (id: string) => {
    setDados((prev) =>
      !prev || prev.notificacoesLidasIds.includes(id)
        ? prev
        : { ...prev, notificacoesLidasIds: [...prev.notificacoesLidasIds, id] },
    );
    sincronizar(dbNotificacoesLidas.marcar(id), `marcar notificação ${id} como lida`);
  };

  const marcarTodasNotificacoesLidas = (ids: string[]) => {
    setDados((prev) =>
      prev ? { ...prev, notificacoesLidasIds: Array.from(new Set([...prev.notificacoesLidasIds, ...ids])) } : prev,
    );
    sincronizar(dbNotificacoesLidas.marcarVarias(ids), 'marcar notificações como lidas');
  };

  // ── Ocorrências ──────────────────────────────────────────────
  const addOcorrencia = (o: Ocorrencia) => {
    setDados((prev) => (prev ? { ...prev, ocorrencias: [o, ...prev.ocorrencias] } : prev));
    sincronizar(dbOcorrencias.inserir(o), `nova ocorrência ${o.id}`);
  };

  // ── Aspectos de Sustentabilidade (Indicador) ──────────────────
  const addIndicador = (i: Indicador) => {
    setDados((prev) => (prev ? { ...prev, indicadores: [...prev.indicadores, i] } : prev));
    sincronizar(dbIndicadores.inserir(i), `novo aspecto ${i.nome}`);
  };

  const updateIndicador = (id: string, patch: Partial<Indicador>) => {
    setDados((prev) =>
      prev ? { ...prev, indicadores: prev.indicadores.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : prev,
    );
    sincronizar(dbIndicadores.atualizar(id, patch), `editar aspecto ${id}`);
  };

  const removeIndicador = (id: string) => {
    setDados((prev) =>
      prev
        ? {
            ...prev,
            indicadores: prev.indicadores.filter((i) => i.id !== id),
            // Remove também os Indicadores de Desempenho (PDLS) que pertenciam a este macroindicador
            // (no banco, a FK com ON DELETE CASCADE cuida disso do lado do servidor).
            indicadoresPDLS: prev.indicadoresPDLS.filter((p) => p.macroindicadorId !== id),
          }
        : prev,
    );
    sincronizar(dbIndicadores.remover(id), `excluir aspecto ${id}`);
  };

  // ── Eixos PDLS ──────────────────────────────────────────────
  const updateEixoPDLS = (id: string, nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setDados((prev) =>
      prev ? { ...prev, eixosPDLS: prev.eixosPDLS.map((e) => (e.id === id ? { ...e, nome: limpo } : e)) } : prev,
    );
    sincronizar(dbEixosPDLS.atualizar(id, { nome: limpo }), `renomear eixo ${id}`);
  };

  const addEixoPDLS = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo || !dados) return;
    const proximoNumero = Math.max(0, ...dados.eixosPDLS.map((e) => e.numero)) + 1;
    const novo: EixoPDLS = { id: `eixo-custom-${Date.now()}`, numero: proximoNumero, nome: limpo };
    setDados((prev) => (prev ? { ...prev, eixosPDLS: [...prev.eixosPDLS, novo] } : prev));
    sincronizar(dbEixosPDLS.inserir(novo), `novo eixo ${limpo}`);
  };

  const removeEixoPDLS = (id: string): boolean => {
    if (!dados || dados.eixosPDLS.length <= 1) return false;
    // Um Aspecto de Sustentabilidade "usa" um eixo através de algum Indicador de
    // Desempenho (`IndicadorPDLS.eixoId`) ligado a ele — não tem mais um campo de
    // eixo direto no `Indicador` (ver comentário no tipo, em types/index.ts).
    const emUso = dados.ocorrencias.some((o) => o.eixoPDLSId === id) || dados.indicadoresPDLS.some((p) => p.eixoId === id);
    if (emUso) return false;
    setDados((prev) => (prev ? { ...prev, eixosPDLS: prev.eixosPDLS.filter((e) => e.id !== id) } : prev));
    sincronizar(dbEixosPDLS.remover(id), `excluir eixo ${id}`);
    return true;
  };

  // ── Indicadores de Desempenho (PDLS) ──────────────────────────
  // `eixoId === null` busca os indicadores SEM vinculação a nenhum Eixo PDLS
  // (campo `eixoId` não definido) — ver comentário em `IndicadorPDLS`.
  const indicadoresPDLSDe = (macroindicadorId: string, eixoId: string | null) =>
    (dados?.indicadoresPDLS ?? []).filter(
      (p) => p.macroindicadorId === macroindicadorId && (eixoId === null ? !p.eixoId : p.eixoId === eixoId),
    );

  const addIndicadorPDLS = (i: IndicadorPDLS) => {
    setDados((prev) => (prev ? { ...prev, indicadoresPDLS: [...prev.indicadoresPDLS, i] } : prev));
    sincronizar(dbIndicadoresPDLS.inserir(i), `novo indicador de desempenho ${i.nome}`);
  };

  const updateIndicadorPDLS = (id: string, patch: Partial<IndicadorPDLS>) => {
    setDados((prev) =>
      prev
        ? { ...prev, indicadoresPDLS: prev.indicadoresPDLS.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
        : prev,
    );
    sincronizar(dbIndicadoresPDLS.atualizar(id, patch), `editar indicador de desempenho ${id}`);
  };

  const removeIndicadorPDLS = (id: string) => {
    setDados((prev) => (prev ? { ...prev, indicadoresPDLS: prev.indicadoresPDLS.filter((p) => p.id !== id) } : prev));
    sincronizar(dbIndicadoresPDLS.remover(id), `excluir indicador de desempenho ${id}`);
  };

  // ── Objetos contratuais ────────────────────────────────────────
  const addObjetoContratual = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo || !dados) return;
    if (dados.objetosContratuais.some((o) => o.toLowerCase() === limpo.toLowerCase())) return;
    setDados((prev) => (prev ? { ...prev, objetosContratuais: [...prev.objetosContratuais, limpo] } : prev));
    sincronizar(dbObjetosContratuais.inserir(limpo), `novo objeto contratual ${limpo}`);
  };

  const removeObjetoContratual = (nome: string) => {
    setDados((prev) => (prev ? { ...prev, objetosContratuais: prev.objetosContratuais.filter((o) => o !== nome) } : prev));
    sincronizar(dbObjetosContratuais.remover(nome), `excluir objeto contratual ${nome}`);
  };

  // ── Usuários e sessão ──────────────────────────────────────────
  const usuarioAtual = dados?.usuarios.find((u) => u.id === usuarioAtualId) ?? null;

  const login = (email: string, senha: string, manterConectado: boolean): boolean => {
    const encontrado = dados?.usuarios.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha,
    );
    if (!encontrado) return false;
    setUsuarioAtualId(encontrado.id);
    // Só um dos dois guarda a sessão — limpa o outro pra não ficar um resquício
    // de uma escolha anterior de "manter conectado" fazendo a sessão persistir
    // (ou não) contra a vontade da usuária dessa vez.
    if (manterConectado) {
      localStorage.setItem(CHAVE_SESSAO, encontrado.id);
      sessionStorage.removeItem(CHAVE_SESSAO);
    } else {
      sessionStorage.setItem(CHAVE_SESSAO, encontrado.id);
      localStorage.removeItem(CHAVE_SESSAO);
    }
    setModoVisualizacao(null);
    return true;
  };

  const logout = () => {
    setUsuarioAtualId(null);
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
    setModoVisualizacao(null);
  };

  const addUsuario = (u: Usuario) => {
    setDados((prev) => (prev ? { ...prev, usuarios: [...prev.usuarios, u] } : prev));
    sincronizar(dbUsuarios.inserir(u), `novo usuário ${u.email}`);
  };

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    setDados((prev) =>
      prev ? { ...prev, usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)) } : prev,
    );
    sincronizar(dbUsuarios.atualizar(id, patch), `editar usuário ${id}`);
  };

  const removeUsuario = (id: string): boolean => {
    if (!dados) return false;
    const alvo = dados.usuarios.find((u) => u.id === id);
    if (!alvo) return false;
    const outrosAdmins = dados.usuarios.some((u) => u.id !== id && u.perfilId === PERFIL_ADMIN_ID);
    if (alvo.perfilId === PERFIL_ADMIN_ID && !outrosAdmins) return false;
    setDados((prev) => (prev ? { ...prev, usuarios: prev.usuarios.filter((u) => u.id !== id) } : prev));
    if (usuarioAtualId === id) {
      setUsuarioAtualId(null);
      localStorage.removeItem(CHAVE_SESSAO);
    }
    sincronizar(dbUsuarios.remover(id), `excluir usuário ${id}`);
    return true;
  };

  // ── Perfis de acesso ────────────────────────────────────────────
  const addPerfil = (p: Perfil) => {
    setDados((prev) => (prev ? { ...prev, perfis: [...prev.perfis, p] } : prev));
    sincronizar(dbPerfis.inserir(p), `novo perfil ${p.nome}`);
  };

  const updatePerfil = (id: string, patch: Partial<Perfil>) => {
    // O perfil Administrador padrão nunca perde o acesso total — só o nome pode mudar.
    const patchEfetivo: Partial<Perfil> = id === PERFIL_ADMIN_ID ? { ...patch, permissoes: undefined, padrao: true } : patch;
    setDados((prev) =>
      prev
        ? {
            ...prev,
            perfis: prev.perfis.map((p) => {
              if (p.id !== id) return p;
              if (p.id === PERFIL_ADMIN_ID) return { ...p, ...patch, permissoes: p.permissoes, padrao: true };
              return { ...p, ...patch };
            }),
          }
        : prev,
    );
    sincronizar(dbPerfis.atualizar(id, patchEfetivo), `editar perfil ${id}`);
  };

  const removePerfil = (id: string): boolean => {
    if (!dados) return false;
    const alvo = dados.perfis.find((p) => p.id === id);
    if (!alvo || alvo.padrao) return false;
    const emUso = dados.usuarios.some((u) => u.perfilId === id);
    if (emUso) return false;
    setDados((prev) => (prev ? { ...prev, perfis: prev.perfis.filter((p) => p.id !== id) } : prev));
    sincronizar(dbPerfis.remover(id), `excluir perfil ${id}`);
    return true;
  };

  const ehAdministradorReal = usuarioAtual?.perfilId === PERFIL_ADMIN_ID;

  const perfilReal = dados?.perfis.find((p) => p.id === usuarioAtual?.perfilId) ?? null;

  const perfilEfetivo: Perfil | null = !usuarioAtual
    ? null
    : ehAdministradorReal && modoVisualizacao
      ? dados?.perfis.find((p) => p.id === modoVisualizacao) ?? perfilReal
      : perfilReal;

  const podeVer = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.ver;
  const podeCriar = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.criar;
  const podeEditar = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.editar;
  const podeExcluir = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.excluir;

  const notificacoes = useMemo<Notificacao[]>(() => {
    if (!dados) return [];
    const base = gerarNotificacoesVigencia(dados.contratos);
    return base
      .map((n) => ({ ...n, lida: dados.notificacoesLidasIds.includes(n.id) }))
      .sort((a, b) => {
        if (a.lida !== b.lida) return a.lida ? 1 : -1;
        return ORDEM_URGENCIA[a.urgencia] - ORDEM_URGENCIA[b.urgencia];
      });
  }, [dados]);

  const value = useMemo<DataContextValue | null>(() => {
    if (!dados) return null;
    return {
      fornecedores: dados.fornecedores,
      contratos: dados.contratos,
      addFornecedor,
      updateFornecedor,
      addContrato,
      updateContrato,
      contratosDoFornecedor,
      contratosAtivosDoFornecedor,
      scoreFornecedor,
      notificacoes,
      marcarNotificacaoLida,
      marcarTodasNotificacoesLidas,
      ocorrencias: dados.ocorrencias,
      addOcorrencia,
      medicoes: dados.medicoes,
      scoreHistorico: dados.scoreHistorico,
      indicadores: dados.indicadores,
      addIndicador,
      updateIndicador,
      removeIndicador,
      eixosPDLS: dados.eixosPDLS,
      updateEixoPDLS,
      addEixoPDLS,
      removeEixoPDLS,
      indicadoresPDLS: dados.indicadoresPDLS,
      indicadoresPDLSDe,
      addIndicadorPDLS,
      updateIndicadorPDLS,
      removeIndicadorPDLS,
      objetosContratuais: dados.objetosContratuais,
      addObjetoContratual,
      removeObjetoContratual,
      usuarios: dados.usuarios,
      usuarioAtual,
      login,
      logout,
      addUsuario,
      updateUsuario,
      removeUsuario,
      ehAdministradorReal,
      perfis: dados.perfis,
      addPerfil,
      updatePerfil,
      removePerfil,
      modoVisualizacao,
      setModoVisualizacao,
      perfilEfetivo,
      podeVer,
      podeCriar,
      podeEditar,
      podeExcluir,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, [dados, notificacoes, usuarioAtualId, modoVisualizacao]);

  if (!supabaseConfigurado) {
    return <TelaAvisoConfiguracao />;
  }

  if (erroCarregamento) {
    return <TelaErroCarregamento mensagem={erroCarregamento} />;
  }

  if (!dados || !value) {
    return <TelaCarregando />;
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function TelaCarregando() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#6B7280' }}>
      Carregando dados do sistema…
    </div>
  );
}

function TelaAvisoConfiguracao() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 520, textAlign: 'center', color: '#1C1C1C' }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Banco de dados não configurado</h1>
        <p style={{ color: '#6B7280', lineHeight: 1.5 }}>
          Falta configurar a conexão com o Supabase. Copie <code>.env.example</code> para <code>.env</code> e preencha
          <code> VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> com os dados do seu projeto (Project
          Settings → API no painel do Supabase), depois rode <code>npm run dev</code> novamente.
        </p>
      </div>
    </div>
  );
}

function TelaErroCarregamento({ mensagem }: { mensagem: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 520, textAlign: 'center', color: '#1C1C1C' }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Não foi possível carregar os dados</h1>
        <p style={{ color: '#6B7280', lineHeight: 1.5 }}>
          Verifique se as tabelas já existem no Supabase (rode <code>supabase/schema.sql</code> no SQL Editor do
          projeto) e se <code>VITE_SUPABASE_URL</code>/<code>VITE_SUPABASE_ANON_KEY</code> estão corretos no <code>.env</code>.
        </p>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 12 }}>Detalhe técnico: {mensagem}</p>
      </div>
    </div>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de um DataProvider.');
  return ctx;
}
