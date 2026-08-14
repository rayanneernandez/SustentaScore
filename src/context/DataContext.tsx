import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fornecedores as fornecedoresIniciais,
  contratos as contratosIniciais,
  ocorrencias as ocorrenciasIniciais,
  indicadores as indicadoresIniciais,
  eixosPDLS as eixosPDLSIniciais,
  indicadoresPDLS as indicadoresPDLSIniciais,
  OBJETOS_CONTRATUAIS_PADRAO,
  USUARIOS_PADRAO,
  PERFIS_PADRAO,
  PERFIL_ADMIN_ID,
  PERFIL_COLABORADOR_ID,
  PAGINAS_SISTEMA,
} from '../data/mockData';
import type {
  Anexo,
  Contrato,
  EixoPDLS,
  Fornecedor,
  HistoricoEvento,
  HistoricoTipo,
  Indicador,
  IndicadorPDLS,
  Notificacao,
  Ocorrencia,
  PaginaKey,
  Perfil,
  PermissaoPagina,
  Usuario,
} from '../types';

const STORAGE_KEY = 'sustentascore:dados:v1';
export const ALERTA_DIAS_PADRAO = 60;

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
  /** IDs de notificações (de qualquer origem) já marcadas como lidas pelo usuário. */
  notificacoesLidasIds: string[];
  /** Macroindicadores de sustentabilidade. */
  indicadores: Indicador[];
  /** Os 6 Eixos temáticos do PDLS — nome pode ser editado (ex: renomear "a definir"). */
  eixosPDLS: EixoPDLS[];
  /** Indicadores de Desempenho (PDLS), cada um vinculado a um Macroindicador e a um Eixo. */
  indicadoresPDLS: IndicadorPDLS[];
  /** Objetos contratuais cadastrados — usados em Cadastro (contrato) e Macroindicadores. */
  objetosContratuais: string[];
  /** Usuários do sistema — login local do protótipo (ver aviso em `Usuario`). */
  usuarios: Usuario[];
  /** Id do usuário logado nesta sessão (persiste no navegador para não pedir login de novo a cada reload). */
  usuarioAtualId: string | null;
  /** Perfis de acesso (padrão + criados pelo usuário) — ver `Perfil` em types/index.ts. */
  perfis: Perfil[];
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

/**
 * Limpa campos antigos de um Aspecto de Sustentabilidade que não existem mais no
 * tipo `Indicador`: `categoria` (a tag livre "Eixo Temático" de antes da primeira
 * unificação) e `eixoPDLSId` (a "badge" única de Eixo PDLS que o Aspecto chegou a
 * ter por uma rodada, e que foi removida de novo — ver comentário em
 * `types/index.ts`, em `Indicador`). Nenhum dos dois é usado por nada hoje; isso
 * só evita que fiquem chaves mortas acumuladas no `localStorage` de quem já
 * tinha dados salvos numa dessas versões antigas.
 */
function migrarIndicador(entrada: unknown): Indicador {
  const i = entrada as Indicador & { categoria?: string; eixoPDLSId?: string };
  const { categoria, eixoPDLSId, ...resto } = i;
  void categoria;
  void eixoPDLSId;
  return resto;
}

/**
 * Migra uma Ocorrência salva antes do `eixoPDLSId` existir (ou salva com um id
 * de eixo que não existe mais na lista atual) — cai no primeiro eixo por
 * padrão, mesma lógica de `migrarIndicador`. Sem isso, ocorrências antigas
 * mostram "Eixo —" na lista.
 */
function migrarOcorrencia(entrada: unknown, eixosAtuais: EixoPDLS[]): Ocorrencia {
  const o = entrada as Ocorrencia;
  if (o.eixoPDLSId && eixosAtuais.some((e) => e.id === o.eixoPDLSId)) return o;
  return { ...o, eixoPDLSId: eixosAtuais[0]?.id ?? 'eixo1' };
}

/**
 * Migra um usuário salvo no formato antigo (campo `papel: 'administrador' |
 * 'colaborador'`, de antes dos perfis de acesso configuráveis) para o formato
 * atual (`perfilId`), mapeando cada papel antigo para o perfil padrão
 * equivalente. Usuários já no formato novo passam direto.
 */
function migrarUsuario(entrada: unknown): Usuario {
  const u = entrada as Usuario & { papel?: 'administrador' | 'colaborador' };
  if (u.perfilId) return u;
  const { papel, ...resto } = u;
  return { ...resto, perfilId: papel === 'administrador' ? PERFIL_ADMIN_ID : PERFIL_COLABORADOR_ID };
}

/**
 * Migra a permissão de uma tela para o formato atual (4 campos: ver/criar/
 * editar/excluir). Formatos antigos tinham só `ver`/`editar` — quem podia
 * `editar` antes podia criar, editar e excluir (não havia essa distinção), por
 * isso os dois novos campos herdam o valor antigo de `editar`. Telas que não
 * existiam ainda quando o perfil foi salvo (ex: a divisão de "Usuários" e
 * "Perfis de Acesso" em duas telas) entram como totalmente sem acesso, por
 * segurança — quem precisar, o administrador libera manualmente.
 */
function migrarPermissaoPagina(entrada: unknown): PermissaoPagina {
  const p = (entrada ?? {}) as Partial<PermissaoPagina> & { editar?: boolean };
  const legadoEditar = p.editar ?? false;
  return {
    ver: p.ver ?? false,
    criar: p.criar ?? legadoEditar,
    editar: p.editar ?? false,
    excluir: p.excluir ?? legadoEditar,
  };
}

/**
 * Garante que os dois perfis padrão (Administrador e Colaborador) sempre
 * existam, mesmo em dados salvos antes de perfis configuráveis existirem, e
 * normaliza a grade de permissões de todo perfil salvo (perfis padrão e
 * criados pelo usuário) para o formato atual — preenchendo telas novas e
 * migrando o formato antigo de permissão (ver seção `migrarPermissaoPagina`).
 * O perfil Administrador tem suas permissões sempre forçadas ao acesso total,
 * nunca confiando no que estiver salvo, pois ele é o único caminho garantido
 * de acesso ao sistema.
 */
function garantirPerfisPadrao(perfis: unknown): Perfil[] {
  const lista = Array.isArray(perfis) ? (perfis as Perfil[]) : [];
  const resultado = [...lista];
  for (const padrao of PERFIS_PADRAO) {
    if (!resultado.some((p) => p.id === padrao.id)) resultado.unshift(padrao);
  }
  const permissoesAdminPadrao = PERFIS_PADRAO.find((p) => p.id === PERFIL_ADMIN_ID)!.permissoes;
  return resultado.map((p) => {
    if (p.id === PERFIL_ADMIN_ID) return { ...p, permissoes: permissoesAdminPadrao };
    const permissoes = PAGINAS_SISTEMA.reduce(
      (acc, pg) => ({ ...acc, [pg.key]: migrarPermissaoPagina(p.permissoes?.[pg.key]) }),
      {} as Perfil['permissoes'],
    );
    return { ...p, permissoes };
  });
}

function carregarDadosIniciais(): DadosPersistidos {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (bruto) {
      const parsed = JSON.parse(bruto);
      if (Array.isArray(parsed?.fornecedores) && Array.isArray(parsed?.contratos)) {
        // Resolvido antes das ocorrências/indicadores porque a migração deles precisa
        // saber quais eixos existem de fato (inclusive os criados pelo usuário).
        const eixosPDLS: EixoPDLS[] = Array.isArray(parsed?.eixosPDLS) && parsed.eixosPDLS.length ? parsed.eixosPDLS : eixosPDLSIniciais;
        return {
          fornecedores: parsed.fornecedores,
          contratos: parsed.contratos.map(migrarContrato),
          ocorrencias: (Array.isArray(parsed?.ocorrencias) ? parsed.ocorrencias : ocorrenciasIniciais).map((o: unknown) => migrarOcorrencia(o, eixosPDLS)),
          notificacoesLidasIds: Array.isArray(parsed?.notificacoesLidasIds) ? parsed.notificacoesLidasIds : [],
          indicadores: (Array.isArray(parsed?.indicadores) && parsed.indicadores.length ? parsed.indicadores : indicadoresIniciais).map(migrarIndicador),
          eixosPDLS,
          indicadoresPDLS: Array.isArray(parsed?.indicadoresPDLS) ? parsed.indicadoresPDLS : indicadoresPDLSIniciais,
          objetosContratuais: Array.isArray(parsed?.objetosContratuais) && parsed.objetosContratuais.length
            ? parsed.objetosContratuais
            : OBJETOS_CONTRATUAIS_PADRAO,
          usuarios: (Array.isArray(parsed?.usuarios) && parsed.usuarios.length ? parsed.usuarios : USUARIOS_PADRAO).map(migrarUsuario),
          usuarioAtualId: typeof parsed?.usuarioAtualId === 'string' ? parsed.usuarioAtualId : null,
          perfis: garantirPerfisPadrao(parsed?.perfis),
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
    notificacoesLidasIds: [],
    indicadores: indicadoresIniciais,
    eixosPDLS: eixosPDLSIniciais,
    indicadoresPDLS: indicadoresPDLSIniciais,
    objetosContratuais: OBJETOS_CONTRATUAIS_PADRAO,
    usuarios: USUARIOS_PADRAO,
    usuarioAtualId: null,
    perfis: PERFIS_PADRAO,
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
  /** Indicadores de Desempenho (PDLS) de um Macroindicador em um Eixo específico. */
  indicadoresPDLSDe: (macroindicadorId: string, eixoId: string) => IndicadorPDLS[];
  addIndicadorPDLS: (i: IndicadorPDLS) => void;
  updateIndicadorPDLS: (id: string, patch: Partial<IndicadorPDLS>) => void;
  removeIndicadorPDLS: (id: string) => void;
  /** Objetos contratuais cadastrados. */
  objetosContratuais: string[];
  addObjetoContratual: (nome: string) => void;
  removeObjetoContratual: (nome: string) => void;

  // ── Usuários, perfis de acesso e sessão (login local — sem backend, ver Usuario) ──
  usuarios: Usuario[];
  /** Usuário logado nesta sessão (null se ninguém logou ainda). */
  usuarioAtual: Usuario | null;
  /** Tenta logar por email+senha; retorna true se as credenciais existirem na lista de usuários. */
  login: (email: string, senha: string) => boolean;
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
  const [dados, setDados] = useState<DadosPersistidos>(() => carregarDadosIniciais());
  // "Ver como outro perfil" — só na sessão atual (não persiste), sempre volta a
  // mostrar o perfil real do usuário quando a página é recarregada.
  const [modoVisualizacao, setModoVisualizacao] = useState<string | null>(null);

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

  const addIndicador = (i: Indicador) => {
    setDados((prev) => ({ ...prev, indicadores: [...prev.indicadores, i] }));
  };

  const updateIndicador = (id: string, patch: Partial<Indicador>) => {
    setDados((prev) => ({
      ...prev,
      indicadores: prev.indicadores.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const removeIndicador = (id: string) => {
    setDados((prev) => ({
      ...prev,
      indicadores: prev.indicadores.filter((i) => i.id !== id),
      // Remove também os Indicadores de Desempenho (PDLS) que pertenciam a este macroindicador.
      indicadoresPDLS: prev.indicadoresPDLS.filter((p) => p.macroindicadorId !== id),
    }));
  };

  const updateEixoPDLS = (id: string, nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setDados((prev) => ({
      ...prev,
      eixosPDLS: prev.eixosPDLS.map((e) => (e.id === id ? { ...e, nome: limpo } : e)),
    }));
  };

  const addEixoPDLS = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setDados((prev) => {
      const proximoNumero = Math.max(0, ...prev.eixosPDLS.map((e) => e.numero)) + 1;
      const novo: EixoPDLS = { id: `eixo-custom-${Date.now()}`, numero: proximoNumero, nome: limpo };
      return { ...prev, eixosPDLS: [...prev.eixosPDLS, novo] };
    });
  };

  const removeEixoPDLS = (id: string): boolean => {
    if (dados.eixosPDLS.length <= 1) return false;
    // Um Aspecto de Sustentabilidade "usa" um eixo através de algum Indicador de
    // Desempenho (`IndicadorPDLS.eixoId`) ligado a ele — não tem mais um campo de
    // eixo direto no `Indicador` (ver comentário no tipo, em types/index.ts).
    const emUso = dados.ocorrencias.some((o) => o.eixoPDLSId === id) || dados.indicadoresPDLS.some((p) => p.eixoId === id);
    if (emUso) return false;
    setDados((prev) => ({ ...prev, eixosPDLS: prev.eixosPDLS.filter((e) => e.id !== id) }));
    return true;
  };

  const indicadoresPDLSDe = (macroindicadorId: string, eixoId: string) =>
    dados.indicadoresPDLS.filter((p) => p.macroindicadorId === macroindicadorId && p.eixoId === eixoId);

  const addIndicadorPDLS = (i: IndicadorPDLS) => {
    setDados((prev) => ({ ...prev, indicadoresPDLS: [...prev.indicadoresPDLS, i] }));
  };

  const updateIndicadorPDLS = (id: string, patch: Partial<IndicadorPDLS>) => {
    setDados((prev) => ({
      ...prev,
      indicadoresPDLS: prev.indicadoresPDLS.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const removeIndicadorPDLS = (id: string) => {
    setDados((prev) => ({ ...prev, indicadoresPDLS: prev.indicadoresPDLS.filter((p) => p.id !== id) }));
  };

  const addObjetoContratual = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    setDados((prev) =>
      prev.objetosContratuais.some((o) => o.toLowerCase() === limpo.toLowerCase())
        ? prev
        : { ...prev, objetosContratuais: [...prev.objetosContratuais, limpo] }
    );
  };

  const removeObjetoContratual = (nome: string) => {
    setDados((prev) => ({ ...prev, objetosContratuais: prev.objetosContratuais.filter((o) => o !== nome) }));
  };

  const usuarioAtual = dados.usuarios.find((u) => u.id === dados.usuarioAtualId) ?? null;

  const login = (email: string, senha: string): boolean => {
    const encontrado = dados.usuarios.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
    );
    if (!encontrado) return false;
    setDados((prev) => ({ ...prev, usuarioAtualId: encontrado.id }));
    setModoVisualizacao(null);
    return true;
  };

  const logout = () => {
    setDados((prev) => ({ ...prev, usuarioAtualId: null }));
    setModoVisualizacao(null);
  };

  const addUsuario = (u: Usuario) => {
    setDados((prev) => ({ ...prev, usuarios: [...prev.usuarios, u] }));
  };

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    setDados((prev) => ({
      ...prev,
      usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  };

  const removeUsuario = (id: string): boolean => {
    const alvo = dados.usuarios.find((u) => u.id === id);
    if (!alvo) return false;
    const outrosAdmins = dados.usuarios.some((u) => u.id !== id && u.perfilId === PERFIL_ADMIN_ID);
    if (alvo.perfilId === PERFIL_ADMIN_ID && !outrosAdmins) return false;
    setDados((prev) => ({
      ...prev,
      usuarios: prev.usuarios.filter((u) => u.id !== id),
      usuarioAtualId: prev.usuarioAtualId === id ? null : prev.usuarioAtualId,
    }));
    return true;
  };

  const addPerfil = (p: Perfil) => {
    setDados((prev) => ({ ...prev, perfis: [...prev.perfis, p] }));
  };

  const updatePerfil = (id: string, patch: Partial<Perfil>) => {
    setDados((prev) => ({
      ...prev,
      perfis: prev.perfis.map((p) => {
        if (p.id !== id) return p;
        // O perfil Administrador padrão nunca perde o acesso total — só o nome pode mudar.
        if (p.id === PERFIL_ADMIN_ID) return { ...p, ...patch, permissoes: p.permissoes, padrao: true };
        return { ...p, ...patch };
      }),
    }));
  };

  const removePerfil = (id: string): boolean => {
    const alvo = dados.perfis.find((p) => p.id === id);
    if (!alvo || alvo.padrao) return false;
    const emUso = dados.usuarios.some((u) => u.perfilId === id);
    if (emUso) return false;
    setDados((prev) => ({ ...prev, perfis: prev.perfis.filter((p) => p.id !== id) }));
    return true;
  };

  const ehAdministradorReal = usuarioAtual?.perfilId === PERFIL_ADMIN_ID;

  const perfilReal = dados.perfis.find((p) => p.id === usuarioAtual?.perfilId) ?? null;

  const perfilEfetivo: Perfil | null = !usuarioAtual
    ? null
    : ehAdministradorReal && modoVisualizacao
      ? dados.perfis.find((p) => p.id === modoVisualizacao) ?? perfilReal
      : perfilReal;

  const podeVer = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.ver;
  const podeCriar = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.criar;
  const podeEditar = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.editar;
  const podeExcluir = (pagina: PaginaKey): boolean => !!perfilEfetivo?.permissoes[pagina]?.excluir;

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
    }),
    [dados, notificacoes, usuarioAtual, modoVisualizacao, ehAdministradorReal, perfilEfetivo]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de um DataProvider.');
  return ctx;
}
