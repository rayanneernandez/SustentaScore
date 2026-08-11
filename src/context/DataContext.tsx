import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fornecedores as fornecedoresIniciais, contratos as contratosIniciais, ocorrencias as ocorrenciasIniciais } from '../data/mockData';
import type { Anexo, Contrato, Fornecedor, HistoricoEvento, HistoricoTipo, Notificacao, Ocorrencia } from '../types';

const STORAGE_KEY = 'sustentascore:dados:v1';
export const ALERTA_DIAS_PADRAO = 60;

/** Eixos temáticos usados como "categoria" em ocorrências/macroindicadores — cadastráveis pelo usuário. */
export const CATEGORIAS_PADRAO = ['Meio Ambiente', 'Governança', 'Social / Trabalhista'];

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

// ── Carregamento / persistência local ──────────────────────────────
interface DadosPersistidos {
  fornecedores: Fornecedor[];
  contratos: Contrato[];
  ocorrencias: Ocorrencia[];
  /** Eixos temáticos cadastrados (tags de categoria usadas em ocorrências e macroindicadores). */
  categorias: string[];
  /** IDs de notificações (de qualquer origem) já marcadas como lidas pelo usuário. */
  notificacoesLidasIds: string[];
}

/**
 * Normaliza um contrato ao carregar: garante `historico`, `alertaDiasAntes` e
 * migra o formato antigo de anexo único (anexoNome/anexoUrl/...) para a
 * lista `anexos`, usada desde que passou a ser possível anexar mais de um arquivo.
 */
function migrarContrato(entrada: unknown): Contrato {
  const c = entrada as Contrato & {
    anexoNome?: string; anexoUrl?: string; anexoTipo?: string; anexoDataUpload?: string;
  };
  let anexos: Anexo[] | undefined = c.anexos;
  if (!anexos && c.anexoNome && c.anexoUrl) {
    anexos = [{
      id: `${c.id}-anexo-legado`,
      nome: c.anexoNome,
      url: c.anexoUrl,
      tipo: c.anexoTipo ?? '',
      dataUpload: c.anexoDataUpload ?? new Date().toISOString(),
    }];
  }
  const { anexoNome, anexoUrl, anexoTipo, anexoDataUpload, ...resto } = c;
  void anexoNome; void anexoUrl; void anexoTipo; void anexoDataUpload;
  return {
    ...resto,
    anexos,
    alertaDiasAntes: resto.alertaDiasAntes ?? ALERTA_DIAS_PADRAO,
    historico: resto.historico ?? [novoEvento('criacao', 'Contrato cadastrado no sistema.')],
  };
}

function carregarDadosIniciais(): DadosPersistidos {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (bruto) {
      const parsed = JSON.parse(bruto);
      if (Array.isArray(parsed?.fornecedores) && Array.isArray(parsed?.contratos)) {
        return {
          fornecedores: parsed.fornecedores,
          contratos: parsed.contratos.map(migrarContrato),
          ocorrencias: Array.isArray(parsed?.ocorrencias) ? parsed.ocorrencias : ocorrenciasIniciais,
          categorias: Array.isArray(parsed?.categorias) && parsed.categorias.length ? parsed.categorias : CATEGORIAS_PADRAO,
          notificacoesLidasIds: Array.isArray(parsed?.notificacoesLidasIds) ? parsed.notificacoesLidasIds : [],
        };
      }
    }
  } catch {
    // Ignora dados corrompidos e usa os dados de exemplo.
  }
  return {
    fornecedores: fornecedoresIniciais,
    contratos: contratosIniciais.map(migrarContrato),
    ocorrencias: ocorrenciasIniciais,
    categorias: CATEGORIAS_PADRAO,
    notificacoesLidasIds: [],
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
  /** Eixos temáticos cadastrados (tags de categoria) — usados em Ocorrências e Macroindicadores. */
  categorias: string[];
  addCategoria: (nome: string) => void;
  removeCategoria: (nome: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosPersistidos>(() => carregarDadosIniciais());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch {
      // Armazenamento indisponível (ex: modo privado) — segue apenas em memória.
    }
  }, [dados]);

  const addFornecedor = (f: Fornecedor) => {
    setDados((prev) => ({ ...prev, fornecedores: [...prev.fornecedores, f] }));
  };

  const updateFornecedor = (id: string, patch: Partial<Fornecedor>) => {
    setDados((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      // Mantém o nome do fornecedor sincronizado nos contratos já cadastrados dele.
      contratos: patch.nome
        ? prev.contratos.map((c) => (c.fornecedorId === id ? { ...c, fornecedorNome: patch.nome as string } : c))
        : prev.contratos,
    }));
  };

  const addContrato = (c: Contrato) => {
    const contratoComHistorico: Contrato = migrarContrato(c);
    setDados((prev) => ({
      ...prev,
      contratos: [...prev.contratos, contratoComHistorico],
      fornecedores: prev.fornecedores.map((f) =>
        f.id === c.fornecedorId ? { ...f, contratos: f.contratos + 1 } : f
      ),
    }));
  };

  const updateContrato: DataContextValue['updateContrato'] = (id, patch, evento) => {
    setDados((prev) => ({
      ...prev,
      contratos: prev.contratos.map((c) => {
        if (c.id !== id) return c;
        const historico = evento ? [...(c.historico ?? []), novoEvento(evento.tipo, evento.descricao)] : c.historico;
        return { ...c, ...patch, historico };
      }),
    }));
  };

  const contratosDoFornecedor = (fornecedorId: string) =>
    dados.contratos.filter((c) => c.fornecedorId === fornecedorId);

  const contratosAtivosDoFornecedor = (fornecedorId: string) =>
    dados.contratos.filter((c) => c.fornecedorId === fornecedorId && c.status === 'ativo');

  const scoreFornecedor = (fornecedorId: string): number | null => {
    const ativos = contratosAtivosDoFornecedor(fornecedorId);
    if (!ativos.length) return null;
    const total = ativos.reduce((soma, c) => soma + c.score, 0);
    return Math.round(total / ativos.length);
  };

  const marcarNotificacaoLida = (id: string) => {
    setDados((prev) =>
      prev.notificacoesLidasIds.includes(id)
        ? prev
        : { ...prev, notificacoesLidasIds: [...prev.notificacoesLidasIds, id] }
    );
  };

  const marcarTodasNotificacoesLidas = (ids: string[]) => {
    setDados((prev) => ({
      ...prev,
      notificacoesLidasIds: Array.from(new Set([...prev.notificacoesLidasIds, ...ids])),
    }));
  };

  const addOcorrencia = (o: Ocorrencia) => {
    setDados((prev) => ({ ...prev, ocorrencias: [o, ...prev.ocorrencias] }));
  };

  const addCategoria = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setDados((prev) =>
      prev.categorias.some((c) => c.toLowerCase() === limpo.toLowerCase())
        ? prev
        : { ...prev, categorias: [...prev.categorias, limpo] }
    );
  };

  const removeCategoria = (nome: string) => {
    setDados((prev) => ({ ...prev, categorias: prev.categorias.filter((c) => c !== nome) }));
  };

  const notificacoes = useMemo<Notificacao[]>(() => {
    const base = gerarNotificacoesVigencia(dados.contratos);
    return base
      .map((n) => ({ ...n, lida: dados.notificacoesLidasIds.includes(n.id) }))
      .sort((a, b) => {
        if (a.lida !== b.lida) return a.lida ? 1 : -1;
        return ORDEM_URGENCIA[a.urgencia] - ORDEM_URGENCIA[b.urgencia];
      });
  }, [dados.contratos, dados.notificacoesLidasIds]);

  const value = useMemo<DataContextValue>(
    () => ({
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
      categorias: dados.categorias,
      addCategoria,
      removeCategoria,
    }),
    [dados, notificacoes]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de um DataProvider.');
  return ctx;
}
