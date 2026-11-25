import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  dbContratos, dbEixosPDLS, dbFornecedores, dbIndicadores, dbIndicadoresPDLS,
  dbMedicoes, dbNotificacoesLidas, dbObjetosContratuais, dbOcorrencias,
  dbLogs, dbPerfis, dbScoreHistorico, dbUsuarios,
} from '../lib/db';
import { supabase, supabaseConfigurado } from '../lib/supabaseClient';
import { anoMesAtual, aplicarOcorrenciaEmMesPassado, calcularScoreMesAtual, medicoesDosMesesAnteriores, prepararMedicaoMesAtual, rotuloDoAnoMes, rotuloMesAtual } from '../utils/score';
import { PERFIS_PADRAO, PERFIL_ADMIN_ID, PERFIL_COLABORADOR_ID, permissoesTotais } from '../config/sistema';
import type {
  Contrato,
  EixoPDLS,
  Fornecedor,
  HistoricoEvento,
  HistoricoTipo,
  AcaoLog,
  LogAtividade,
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

/** Nome legível de cada campo do fornecedor, para a tela de Logs. */
const ROTULO_CAMPO_FORNECEDOR: Record<string, string> = {
  nome: 'Nome',
  cnpj: 'CNPJ',
  telefone: 'Telefone',
  endereco: 'Endereço',
  observacao: 'Observações',
  anexos: 'Anexos',
};

function textoDoValor(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '(vazio)';
  if (Array.isArray(valor)) return valor.length === 0 ? '(nenhum)' : `${valor.length} arquivo(s)`;
  return String(valor);
}

/** Compara o que mudou entre o registro antigo e o patch (só os campos informados em `rotulos`). */
function diferencas<T extends object>(
  antes: T | undefined,
  patch: Partial<T>,
  rotulos: Record<string, string>,
): NonNullable<LogAtividade['detalhes']> {
  const lista: NonNullable<LogAtividade['detalhes']> = [];
  for (const [campo, rotulo] of Object.entries(rotulos)) {
    if (!(campo in patch)) continue;
    const novo = (patch as Record<string, unknown>)[campo];
    const velho = antes ? (antes as Record<string, unknown>)[campo] : undefined;
    const igual = JSON.stringify(velho ?? null) === JSON.stringify(novo ?? null);
    if (igual) continue;
    if (Array.isArray(novo) || Array.isArray(velho)) {
      const nomes = (v: unknown) => (Array.isArray(v) ? v.map((a) => (a as { nome?: string }).nome ?? '?') : []);
      const antigos = nomes(velho);
      const novos = nomes(novo);
      const adicionados = novos.filter((n) => !antigos.includes(n));
      const removidos = antigos.filter((n) => !novos.includes(n));
      const partes = [
        adicionados.length ? `adicionou ${adicionados.join(', ')}` : '',
        removidos.length ? `removeu ${removidos.join(', ')}` : '',
      ].filter(Boolean);
      lista.push({ campo: rotulo, para: partes.join('; ') || 'alterado' });
    } else {
      lista.push({ campo: rotulo, de: textoDoValor(velho), para: textoDoValor(novo) });
    }
  }
  return lista;
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
  // Perfis criados antes da aba Contratos não têm a permissão 'contratos': herdam a de
  // Fornecedores (quem criava/editava contrato lá continua podendo, agora na nova aba).
  const perfis = perfisCarregados.map((p) => {
    if (p.permissoes?.contratos || !p.permissoes) return p;
    const herdada = p.permissoes.cadastro ?? { ver: false, criar: false, editar: false, excluir: false };
    const atualizado: Perfil = { ...p, permissoes: { ...p.permissoes, contratos: { ...herdada } } };
    sincronizar(dbPerfis.atualizar(p.id, { permissoes: atualizado.permissoes }), `permissão Contratos do perfil ${p.nome}`);
    return atualizado;
  });
  // O perfil Administrador sempre enxerga a aba Logs (criada depois dos perfis já existentes).
  for (let i = 0; i < perfis.length; i++) {
    const p = perfis[i];
    if (p.id === PERFIL_ADMIN_ID && p.permissoes && !p.permissoes.logs) {
      const atualizado: Perfil = { ...p, permissoes: { ...p.permissoes, logs: permissoesTotais(true).logs } };
      perfis[i] = atualizado;
      sincronizar(dbPerfis.atualizar(p.id, { permissoes: atualizado.permissoes }), 'permissão Logs do perfil Administrador');
    }
  }
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
 * Garante que o score/faixa/pagamento de cada contrato ATIVO reflita as
 * Ocorrências do mês corrente assim que os dados carregam — cobre tanto o caso
 * de "virou o mês e ninguém registrou nada ainda, o score precisa voltar pra
 * 500" quanto o de um contrato cujo score ainda não refletia Ocorrências já
 * registradas antes dessa funcionalidade existir (pedido explícito da
 * usuária: ocorrências com dedução têm que descontar do score do contrato).
 * Contratos inativos nunca são tocados aqui — o score deles fica congelado
 * como histórico (ver comentários em `scoreFornecedor` e nas telas de Score).
 * Só grava no Supabase os contratos cujo valor realmente mudou.
 */
function reconciliarScoresDoMes(carregados: DadosCarregados): DadosCarregados {
  let medicoes = carregados.medicoes;

  const contratos = carregados.contratos.map((c) => {
    if (c.status !== 'ativo') return c;
    const resultado = calcularScoreMesAtual(c.id, carregados.ocorrencias);

    const preparada = prepararMedicaoMesAtual(c.id, resultado, medicoes);
    if (preparada?.nova && preparada.medicaoCompleta) {
      const novaMedicao = preparada.medicaoCompleta;
      medicoes = [...medicoes, novaMedicao];
      sincronizar(dbMedicoes.inserir(novaMedicao), `criar medição do mês do contrato ${c.id}`);
    } else if (preparada && !preparada.nova && preparada.patch) {
      const idMedicao = preparada.id;
      const patchMedicao = preparada.patch;
      medicoes = medicoes.map((m) => (m.id === idMedicao ? { ...m, ...patchMedicao } : m));
      sincronizar(dbMedicoes.atualizar(idMedicao, patchMedicao), `atualizar medição do mês do contrato ${c.id}`);
    }

    if (c.score === resultado.score && c.faixa === resultado.faixa && c.pagamento === resultado.pagamento) return c;
    sincronizar(
      dbContratos.atualizar(c.id, { score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento }),
      `recalcular score do mês do contrato ${c.id}`,
    );
    return { ...c, score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento };
  });

  return { ...carregados, contratos, medicoes };
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

/** Por quantos dias um alerta de treinamento (aspecto de desempenho coletivo) continua aparecendo no sino. */
const DIAS_ALERTA_TREINAMENTO = 60;

/**
 * Alertas de "necessidade de treinamento": cada registro do tipo Treinamento ligado a
 * um Aspecto de desempenho coletivo (`Indicador.impactoColetivo` — água, energia,
 * resíduos) gera um alerta de campanha de redução de recursos, em vez de descontar
 * pontos do fornecedor (pedido da Vanessa: esses indicadores refletem a unidade toda).
 * Só considera registros recentes, pra o sino não acumular alertas antigos pra sempre.
 */
function gerarNotificacoesTreinamento(
  ocorrencias: Ocorrencia[],
  indicadores: Indicador[],
): Array<Omit<Notificacao, 'lida'>> {
  const coletivos = new Set(indicadores.filter((i) => i.impactoColetivo).map((i) => i.id));
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_ALERTA_TREINAMENTO);
  const limiteIso = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;

  return ocorrencias
    .filter((o) => o.tipoRegistro === 'treinamento' && !!o.indicadorId && coletivos.has(o.indicadorId) && o.data >= limiteIso)
    .map((o) => ({
      id: `treinamento:${o.id}`,
      tipo: 'treinamento',
      titulo: `Campanha de treinamento recomendada — ${o.indicadorNome ?? 'Meta da Unidade'}`,
      descricao: `${o.fornecedorNome}: ${o.descricao} (${formatarDataBR(o.data)}). Meta da Unidade — sem desconto de IMR.`,
      urgencia: 'media' as const,
      link: '/ocorrencias',
    }));
}

/** Nos últimos quantos dias do mês o sino avisa que o valor da nota ainda não foi informado. */
const DIAS_AVISO_FIM_MES = 5;

/**
 * Aviso de "mês sem movimentação": perto do fim do mês, cada contrato ativo cuja Medição do mês
 * ainda está sem o valor da NF gera um alerta no sino (some quando o valor é informado). O id leva
 * o mês, então marcar como lida vale só para aquele mês.
 */
function gerarNotificacoesNotaPendente(contratos: Contrato[], medicoes: Medicao[]): Array<Omit<Notificacao, 'lida'>> {
  const hoje = new Date();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = ultimoDia - hoje.getDate();
  if (diasRestantes >= DIAS_AVISO_FIM_MES) return [];

  const anoMes = anoMesAtual();
  const periodo = rotuloMesAtual();
  const primeiroDia = `${anoMes}-01`;
  const ultimoDiaIso = `${anoMes}-${String(ultimoDia).padStart(2, '0')}`;
  const resultado: Array<Omit<Notificacao, 'lida'>> = [];
  for (const c of contratos) {
    if (c.status !== 'ativo') continue;
    // Contrato que ainda não começou ou já terminou antes deste mês não tem nota para informar.
    const inicio = c.vigenciaInicio;
    const fim = c.vigenciaFim ?? c.vigencia;
    if (inicio && inicio > ultimoDiaIso) continue;
    if (fim && fim < primeiroDia) continue;
    const medicao = medicoes.find((m) => m.contratoId === c.id && m.periodo.toLowerCase() === periodo);
    if (medicao && medicao.valor > 0) continue;
    resultado.push({
      id: `nota-pendente:${c.id}:${anoMes}`,
      tipo: 'nota-pendente',
      titulo: `Valor da nota de ${periodo} não informado — contrato ${c.numero}`,
      descricao: `${c.fornecedorNome}: ${diasRestantes === 0 ? 'o mês termina hoje' : `faltam ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} para o mês terminar`} e o valor da NF ainda não foi preenchido em Medição e Pagamento.`,
      urgencia: 'media',
      link: '/medicao',
    });
  }
  return resultado;
}

const ORDEM_URGENCIA: Record<Notificacao['urgencia'], number> = { alta: 0, media: 1, baixa: 2 };

// ── Contexto ─────────────────────────────────────────────────────
interface DataContextValue {
  fornecedores: Fornecedor[];
  contratos: Contrato[];
  addFornecedor: (f: Fornecedor) => void;
  /** Lê do banco os registros mais recentes da aba Logs (quem fez o quê, de todos os usuários). */
  carregarLogs: (limite: number) => Promise<LogAtividade[]>;
  /** Fornecedor já cadastrado com este CNPJ (confere nesta tela e direto no banco), ou null. */
  buscarFornecedorPorCnpj: (cnpj: string, ignorarId?: string) => Promise<Fornecedor | null>;
  /** Contrato já cadastrado com este número (confere nesta tela e direto no banco), ou null. */
  buscarContratoPorNumero: (numero: string, ignorarId?: string, fornecedorId?: string, ano?: string) => Promise<Contrato | null>;
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
  /** Edita uma medição já existente — hoje só o valor da NF do mês (`valor`), informado pelo gestor. */
  updateMedicao: (id: string, patch: Partial<Medicao>) => void;
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
  /**
   * Cria um novo Eixo PDLS. Se `numero` não for informado, usa o próximo número
   * disponível (não precisa mais ficar só nos 6 originais) — mas o número pode
   * ser escolhido manualmente (ex: pra reaproveitar o "slot" de um eixo oficial
   * ainda sem nome, como Eixo 2/4/5). Ver uso em `EstruturaSustentabilidade.tsx`.
   */
  addEixoPDLS: (nome: string, numero?: number) => void;
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
  /** Login por código de e-mail — passo 1: envia um código de 6 dígitos pro
   * e-mail informado via Supabase Auth (OTP). Só funciona pra e-mail já
   * cadastrado em Usuários (não cria usuário novo, nem no Supabase Auth nem
   * no sistema) — por isso o retorno distingue "e-mail não encontrado" de
   * falha no envio. */
  enviarCodigoLogin: (email: string) => Promise<{ ok: boolean; erro?: string }>;
  /** Login por código de e-mail — passo 2: confere o código digitado contra
   * o que o Supabase mandou; se bater, loga o usuário correspondente (mesmo
   * fluxo de sessão do `login` por senha). */
  confirmarCodigoLogin: (email: string, codigo: string, manterConectado: boolean) => Promise<{ ok: boolean; erro?: string }>;
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
        if (!cancelado) setDados(reconciliarScoresDoMes(carregados));
      })
      .catch((erro: Error) => {
        if (!cancelado) setErroCarregamento(erro.message);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // ── Fornecedores ────────────────────────────────────────────────
  /** Carimbo automático de autoria: quem (usuário logado) e quando — só preenche o que ainda não veio. */
  const carimboAutoria = () => ({ criadoPor: usuarioAtual?.nome, criadoEm: new Date().toISOString() });

  /** Grava no histórico de atividades (aba Logs) quem fez o quê. Nunca trava a tela: se falhar, só avisa no console. */
  const registrarLog = (
    acao: AcaoLog,
    entidade: string,
    descricao: string,
    opcoes: { entidadeId?: string; detalhes?: LogAtividade['detalhes']; usuario?: Usuario | null } = {},
  ) => {
    const autor = opcoes.usuario ?? usuarioAtual;
    const log: LogAtividade = {
      id: `log${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      usuarioId: autor?.id,
      usuarioNome: autor?.nome ?? 'Sistema',
      acao,
      entidade,
      entidadeId: opcoes.entidadeId,
      descricao,
      detalhes: opcoes.detalhes && opcoes.detalhes.length ? opcoes.detalhes : undefined,
      criadoEm: new Date().toISOString(),
    };
    sincronizar(dbLogs.inserir(log), `registrar log: ${descricao}`);
  };

  /** Lê os logs mais recentes direto do banco (a tela de Logs sempre mostra o que está salvo, de todos os usuários). */
  const carregarLogs = (limite: number) => dbLogs.listarRecentes(limite);

  const normalizarNumeroContrato = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
  const digitosCnpj = (c: string) => c.replace(/\D/g, '');

  const buscarFornecedorPorCnpj = async (cnpj: string, ignorarId?: string): Promise<Fornecedor | null> => {
    const digitos = digitosCnpj(cnpj);
    if (digitos.length !== 14) return null;
    const mesmo = (f: Fornecedor) => f.id !== ignorarId && digitosCnpj(f.cnpj) === digitos;
    const local = (dados?.fornecedores ?? []).find(mesmo);
    if (local) return local;
    try {
      const formatado = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
      return (await dbFornecedores.buscarPorCnpj(formatado, digitos)).find(mesmo) ?? null;
    } catch (e) {
      console.error('Não foi possível conferir o CNPJ no banco:', e);
      return null;
    }
  };

  // O mesmo número pode se repetir (em outro fornecedor ou em outro ano). Só é duplicado o contrato
  // com o mesmo fornecedor + número + ano.
  const buscarContratoPorNumero = async (numero: string, ignorarId?: string, fornecedorId?: string, ano?: string): Promise<Contrato | null> => {
    const alvo = normalizarNumeroContrato(numero);
    if (!alvo) return null;
    const mesmo = (c: Contrato) =>
      c.id !== ignorarId &&
      normalizarNumeroContrato(c.numero) === alvo &&
      (!fornecedorId || c.fornecedorId === fornecedorId) &&
      (c.ano ?? '').trim() === (ano ?? '').trim();
    const local = (dados?.contratos ?? []).find(mesmo);
    if (local) return local;
    try {
      return (await dbContratos.buscarPorNumero(numero)).find(mesmo) ?? null;
    } catch (e) {
      console.error('Não foi possível conferir o número do contrato no banco:', e);
      return null;
    }
  };

  const addFornecedor = (fornecedor: Fornecedor) => {
    const f: Fornecedor = { ...carimboAutoria(), ...fornecedor };
    setDados((prev) => (prev ? { ...prev, fornecedores: [...prev.fornecedores, f] } : prev));
    sincronizar(dbFornecedores.inserir(f), `novo fornecedor ${f.nome}`);
    registrarLog('criou', 'Fornecedor', `Cadastrou o fornecedor ${f.nome} (CNPJ ${f.cnpj}).`, { entidadeId: f.id });
  };

  const updateFornecedor = (id: string, patch: Partial<Fornecedor>) => {
    const antes = dados?.fornecedores.find((f) => f.id === id);
    const detalhes = diferencas(antes, patch, ROTULO_CAMPO_FORNECEDOR);
    if (detalhes.length) {
      registrarLog('editou', 'Fornecedor', `Editou o fornecedor ${antes?.nome ?? id}.`, { entidadeId: id, detalhes });
    }
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
    const autor = usuarioAtual?.nome;
    const eventos = c.historico?.length ? c.historico : [novoEvento('criacao', 'Contrato cadastrado no sistema.')];
    const contratoComHistorico: Contrato = {
      ...carimboAutoria(),
      ...c,
      alertaDiasAntes: c.alertaDiasAntes ?? ALERTA_DIAS_PADRAO,
      historico: eventos.map((ev) => (ev.autor || !autor ? ev : { ...ev, autor })),
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
    // Quem acompanha só alguns contratos: o contrato que ele mesmo cadastra entra na lista dele,
    // senão sumiria da tela logo após salvar.
    if (usuarioAtual && !ehAdministradorReal && usuarioAtual.contratosPermitidos?.length) {
      updateUsuario(usuarioAtual.id, { contratosPermitidos: [...usuarioAtual.contratosPermitidos, c.id] });
    }
    // O mês corrente já nasce registrado no histórico (Cálculo do Score e Medição e Pagamento),
    // mesmo sem nenhuma ocorrência — 500 pontos / 100%. A medição só é gravada depois do contrato
    // (ela referencia o contrato no banco).
    const medicaoInicial =
      contratoComHistorico.status === 'ativo'
        ? prepararMedicaoMesAtual(
            contratoComHistorico.id,
            calcularScoreMesAtual(contratoComHistorico.id, dados?.ocorrencias ?? []),
            dados?.medicoes ?? [],
          )
        : null;
    // Contrato que começou antes de ser cadastrado: já nasce com os meses anteriores no histórico
    // (500 pontos, sem ocorrências), para poder lançar ocorrências e o valor da nota neles.
    const mesesAnteriores =
      contratoComHistorico.status === 'ativo'
        ? medicoesDosMesesAnteriores(contratoComHistorico, dados?.medicoes ?? [], dados?.ocorrencias ?? [])
        : [];
    const medicoesNovas: Medicao[] = [
      ...mesesAnteriores,
      ...(medicaoInicial?.nova && medicaoInicial.medicaoCompleta ? [medicaoInicial.medicaoCompleta] : []),
    ];
    if (medicoesNovas.length > 0) {
      setDados((prev) => (prev ? { ...prev, medicoes: [...prev.medicoes, ...medicoesNovas] } : prev));
      sincronizar(
        dbContratos.inserir(contratoComHistorico).then(() => dbMedicoes.inserirVarias(medicoesNovas)),
        `novo contrato ${c.numero} (com as medições dos meses)`,
      );
    } else {
      sincronizar(dbContratos.inserir(contratoComHistorico), `novo contrato ${c.numero}`);
    }
    registrarLog('criou', 'Contrato', `Cadastrou o contrato ${c.numero} do fornecedor ${c.fornecedorNome}.`, { entidadeId: c.id });
    const fornecedorAtual = dados?.fornecedores.find((f) => f.id === c.fornecedorId);
    if (fornecedorAtual) {
      sincronizar(
        dbFornecedores.atualizar(c.fornecedorId, { contratos: fornecedorAtual.contratos + 1 }),
        `atualizar contagem de contratos do fornecedor ${c.fornecedorId}`,
      );
    }
  };

  const updateContrato: DataContextValue['updateContrato'] = (id, patch, evento) => {
    // O evento "ocorrencia" é só o reflexo automático de uma ocorrência (que já tem o seu próprio log).
    if (evento && evento.tipo !== 'ocorrencia') {
      const contratoAtual = dados?.contratos.find((c) => c.id === id);
      registrarLog('editou', 'Contrato', `Contrato ${contratoAtual?.numero ?? id}: ${evento.descricao}`, { entidadeId: id });
    }
    // O evento novo é montado aqui (e não dentro do setDados): o atualizador do React pode rodar
    // só depois, e aí o histórico novo não chegaria a ser gravado no banco.
    const contratoAntes = dados?.contratos.find((c) => c.id === id);
    const eventoNovo: HistoricoEvento | undefined = evento
      ? { ...novoEvento(evento.tipo, evento.descricao), autor: usuarioAtual?.nome }
      : undefined;
    const historicoNovo: HistoricoEvento[] | undefined =
      eventoNovo && contratoAntes ? [...(contratoAntes.historico ?? []), eventoNovo] : undefined;
    setDados((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contratos: prev.contratos.map((c) => {
          if (c.id !== id) return c;
          const historico = eventoNovo ? [...(c.historico ?? []), eventoNovo] : c.historico;
          return { ...c, ...patch, historico };
        }),
      };
    });
    // Mudou a vigência (início/fim): garante as medições dos meses anteriores que ainda não existem.
    if (contratoAntes && ('vigenciaInicio' in patch || 'vigenciaFim' in patch)) {
      const contratoDepois = { ...contratoAntes, ...patch };
      if (contratoDepois.status === 'ativo') {
        const faltantes = medicoesDosMesesAnteriores(contratoDepois, dados?.medicoes ?? [], dados?.ocorrencias ?? []);
        if (faltantes.length > 0) {
          setDados((prev) => (prev ? { ...prev, medicoes: [...prev.medicoes, ...faltantes] } : prev));
          sincronizar(dbMedicoes.inserirVarias(faltantes), `criar medições dos meses anteriores do contrato ${id}`);
        }
      }
    }
    const patchBanco = historicoNovo !== undefined ? { ...patch, historico: historicoNovo } : patch;
    if (Object.keys(patchBanco).length > 0) {
      sincronizar(dbContratos.atualizar(id, patchBanco), `editar contrato ${id}`);
    }
  };

  // Usam só os contratos que o usuário enxerga (quem acompanha poucos contratos vê o score só deles).
  const contratosDoFornecedor = (fornecedorId: string) =>
    (visivel?.contratos ?? dados?.contratos ?? []).filter((c) => c.fornecedorId === fornecedorId);

  const contratosAtivosDoFornecedor = (fornecedorId: string) =>
    (visivel?.contratos ?? dados?.contratos ?? []).filter((c) => c.fornecedorId === fornecedorId && c.status === 'ativo');

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
  const updateMedicao = (id: string, patch: Partial<Medicao>) => {
    const antesMedicao = dados?.medicoes.find((m) => m.id === id);
    const contratoDaMedicao = dados?.contratos.find((c) => c.id === antesMedicao?.contratoId);
    const detalhesMedicao = diferencas(antesMedicao, patch, { status: 'Status do pagamento', valor: 'Valor', pagamento: '% de pagamento' });
    if (detalhesMedicao.length) {
      registrarLog(
        'editou',
        'Medição e Pagamento',
        `Alterou a medição ${antesMedicao?.periodo ?? ''} do contrato ${contratoDaMedicao?.numero ?? antesMedicao?.contratoId ?? id}.`,
        { entidadeId: id, detalhes: detalhesMedicao },
      );
    }
    setDados((prev) =>
      prev ? { ...prev, medicoes: prev.medicoes.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : prev,
    );
    sincronizar(dbMedicoes.atualizar(id, patch), `editar medição ${id}`);
  };

  const addOcorrencia = (ocorrencia: Ocorrencia) => {
    const o: Ocorrencia = { ...carimboAutoria(), ...ocorrencia };
    setDados((prev) => (prev ? { ...prev, ocorrencias: [o, ...prev.ocorrencias] } : prev));
    sincronizar(dbOcorrencias.inserir(o), `nova ocorrência ${o.id}`);
    registrarLog(
      'criou',
      'Ocorrência',
      `Registrou uma ocorrência ${o.tipoRegistro === 'treinamento' ? 'sem dedução' : 'com dedução'} para ${o.fornecedorNome}${o.indicadorNome ? ` (${o.indicadorNome})` : ''}.`,
      { entidadeId: o.id },
    );

    // A data informada pelo fiscal manda: a dedução cai no mês DA DATA da ocorrência. Se for um mês
    // que já passou, mexe só na Medição daquele mês (o score do mês corrente não muda).
    const mesOcorrencia = (o.data || '').slice(0, 7);
    if (o.tipoRegistro !== 'treinamento' && /^\d{4}-\d{2}$/.test(mesOcorrencia) && mesOcorrencia !== anoMesAtual()) {
      const doMes = [o, ...(dados?.ocorrencias ?? [])].filter(
        (x) => x.contratoId === o.contratoId && x.tipoRegistro !== 'treinamento' && (x.data || '').startsWith(mesOcorrencia),
      );
      const aplicada = aplicarOcorrenciaEmMesPassado(o.contratoId, mesOcorrencia, o.deducao || 0, doMes, dados?.medicoes ?? []);
      let scoreDoMes: number;
      if (aplicada.nova) {
        const novaMedicao = aplicada.medicaoCompleta;
        scoreDoMes = novaMedicao.score;
        setDados((prev) => (prev ? { ...prev, medicoes: [...prev.medicoes, novaMedicao] } : prev));
        sincronizar(dbMedicoes.inserir(novaMedicao), `criar medição de ${novaMedicao.periodo} do contrato ${o.contratoId}`);
      } else {
        const { id: idMedicao, patch: patchMedicao } = aplicada;
        scoreDoMes = patchMedicao.score ?? 0;
        setDados((prev) =>
          prev ? { ...prev, medicoes: prev.medicoes.map((m) => (m.id === idMedicao ? { ...m, ...patchMedicao } : m)) } : prev,
        );
        sincronizar(dbMedicoes.atualizar(idMedicao, patchMedicao), `atualizar medição de ${rotuloDoAnoMes(mesOcorrencia)} do contrato ${o.contratoId}`);
      }
      updateContrato(o.contratoId, {}, {
        tipo: 'ocorrencia',
        descricao: `Nova ocorrência registrada em ${rotuloDoAnoMes(mesOcorrencia)}: -${o.deducao} ponto${o.deducao === 1 ? '' : 's'}. Score de ${rotuloDoAnoMes(mesOcorrencia)} atualizado para ${scoreDoMes}.`,
      });
      return;
    }

    // Toda Ocorrência "com dedução" desconta na hora o score do mês corrente do
    // contrato — o score reinicia em 500 todo mês (pedido explícito da usuária,
    // ver `calcularScoreMesAtual`). Ocorrências do tipo 'treinamento' nunca
    // descontam, mas mesmo assim recalculamos pra manter tudo consistente caso
    // o contador de ocorrências do mês volte a ser exibido em algum lugar.
    const ocorrenciasAtualizadas = [o, ...(dados?.ocorrencias ?? [])];
    const resultado = calcularScoreMesAtual(o.contratoId, ocorrenciasAtualizadas);

    // A Medição do mês corrente também é criada/atualizada na hora — pedido
    // explícito da usuária: o histórico precisa ficar registrado de verdade,
    // não só calculado pra exibir (ver `prepararMedicaoMesAtual`).
    const preparada = prepararMedicaoMesAtual(o.contratoId, resultado, dados?.medicoes ?? []);
    if (preparada?.nova && preparada.medicaoCompleta) {
      const novaMedicao = preparada.medicaoCompleta;
      setDados((prev) => (prev ? { ...prev, medicoes: [...prev.medicoes, novaMedicao] } : prev));
      sincronizar(dbMedicoes.inserir(novaMedicao), `criar medição do mês do contrato ${o.contratoId}`);
    } else if (preparada && !preparada.nova && preparada.patch) {
      const idMedicao = preparada.id;
      const patchMedicao = preparada.patch;
      setDados((prev) =>
        prev ? { ...prev, medicoes: prev.medicoes.map((m) => (m.id === idMedicao ? { ...m, ...patchMedicao } : m)) } : prev,
      );
      sincronizar(dbMedicoes.atualizar(idMedicao, patchMedicao), `atualizar medição do mês do contrato ${o.contratoId}`);
    }

    updateContrato(
      o.contratoId,
      { score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento },
      o.tipoRegistro === 'treinamento'
        ? undefined
        : {
            tipo: 'ocorrencia',
            descricao: `Nova ocorrência registrada: -${o.deducao} ponto${o.deducao === 1 ? '' : 's'}. Score do mês atualizado para ${resultado.score} (dedução total do mês: -${resultado.deducaoTotal}).`,
          },
    );
  };

  // ── Aspectos de Sustentabilidade (Indicador) ──────────────────
  const addIndicador = (i: Indicador) => {
    setDados((prev) => (prev ? { ...prev, indicadores: [...prev.indicadores, i] } : prev));
    sincronizar(dbIndicadores.inserir(i), `novo aspecto ${i.nome}`);
    registrarLog('criou', 'Aspecto de Sustentabilidade', `Criou o aspecto ${i.nome}.`, { entidadeId: i.id });
  };

  const updateIndicador = (id: string, patch: Partial<Indicador>) => {
    const indAntes = dados?.indicadores.find((i) => i.id === id);
    registrarLog('editou', 'Aspecto de Sustentabilidade', `Editou o aspecto ${patch.nome ?? indAntes?.nome ?? id}.`, {
      entidadeId: id,
      detalhes: diferencas(indAntes, patch, { nome: 'Nome' }),
    });
    setDados((prev) =>
      prev ? { ...prev, indicadores: prev.indicadores.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : prev,
    );
    sincronizar(dbIndicadores.atualizar(id, patch), `editar aspecto ${id}`);
  };

  const removeIndicador = (id: string) => {
    registrarLog('excluiu', 'Aspecto de Sustentabilidade', `Excluiu o aspecto ${dados?.indicadores.find((i) => i.id === id)?.nome ?? id}.`, { entidadeId: id });
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
    const eixoAntes = dados?.eixosPDLS.find((e) => e.id === id);
    registrarLog('editou', 'Eixo PDLS', `Renomeou o eixo ${eixoAntes?.numero ?? ''} para "${limpo}".`, {
      entidadeId: id,
      detalhes: [{ campo: 'Nome', de: eixoAntes?.nome, para: limpo }],
    });
    setDados((prev) =>
      prev ? { ...prev, eixosPDLS: prev.eixosPDLS.map((e) => (e.id === id ? { ...e, nome: limpo } : e)) } : prev,
    );
    sincronizar(dbEixosPDLS.atualizar(id, { nome: limpo }), `renomear eixo ${id}`);
  };

  const addEixoPDLS = (nome: string, numero?: number) => {
    const limpo = nome.trim();
    if (!limpo || !dados) return;
    const numeroFinal = numero ?? Math.max(0, ...dados.eixosPDLS.map((e) => e.numero)) + 1;
    const novo: EixoPDLS = { id: `eixo-custom-${Date.now()}`, numero: numeroFinal, nome: limpo };
    setDados((prev) => (prev ? { ...prev, eixosPDLS: [...prev.eixosPDLS, novo] } : prev));
    sincronizar(dbEixosPDLS.inserir(novo), `novo eixo ${limpo}`);
    registrarLog('criou', 'Eixo PDLS', `Criou o eixo ${numeroFinal} — ${limpo}.`, { entidadeId: novo.id });
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
    registrarLog('excluiu', 'Eixo PDLS', `Excluiu o eixo ${dados.eixosPDLS.find((e) => e.id === id)?.nome ?? id}.`, { entidadeId: id });
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
    registrarLog('criou', 'Indicador de Desempenho', `Criou o indicador de desempenho ${i.nome}.`, { entidadeId: i.id });
  };

  const updateIndicadorPDLS = (id: string, patch: Partial<IndicadorPDLS>) => {
    const pdlsAntes = dados?.indicadoresPDLS.find((p) => p.id === id);
    registrarLog('editou', 'Indicador de Desempenho', `Editou o indicador de desempenho ${patch.nome ?? pdlsAntes?.nome ?? id}.`, {
      entidadeId: id,
      detalhes: diferencas(pdlsAntes, patch, { nome: 'Nome' }),
    });
    setDados((prev) =>
      prev
        ? { ...prev, indicadoresPDLS: prev.indicadoresPDLS.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
        : prev,
    );
    sincronizar(dbIndicadoresPDLS.atualizar(id, patch), `editar indicador de desempenho ${id}`);
  };

  const removeIndicadorPDLS = (id: string) => {
    registrarLog('excluiu', 'Indicador de Desempenho', `Excluiu o indicador de desempenho ${dados?.indicadoresPDLS.find((p) => p.id === id)?.nome ?? id}.`, { entidadeId: id });
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
    registrarLog('criou', 'Objeto Contratual', `Criou o objeto contratual ${limpo}.`);
  };

  const removeObjetoContratual = (nome: string) => {
    setDados((prev) => (prev ? { ...prev, objetosContratuais: prev.objetosContratuais.filter((o) => o !== nome) } : prev));
    sincronizar(dbObjetosContratuais.remover(nome), `excluir objeto contratual ${nome}`);
    registrarLog('excluiu', 'Objeto Contratual', `Excluiu o objeto contratual ${nome}.`);
  };

  // ── Usuários e sessão ──────────────────────────────────────────
  const usuarioAtual = dados?.usuarios.find((u) => u.id === usuarioAtualId) ?? null;

  /** Grava a sessão (usuarioAtualId + local/sessionStorage) depois que as
   * credenciais — senha ou código por e-mail — já foram conferidas. Reaproveitado
   * pelos dois fluxos de login pra não duplicar a lógica de sessão. */
  const concluirLogin = (encontrado: Usuario, manterConectado: boolean) => {
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
    registrarLog('entrou', 'Sessão', 'Entrou no sistema.', { usuario: encontrado });
  };

  const login = (email: string, senha: string, manterConectado: boolean): boolean => {
    const encontrado = dados?.usuarios.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha,
    );
    if (!encontrado) return false;
    concluirLogin(encontrado, manterConectado);
    return true;
  };

  const enviarCodigoLogin = async (email: string): Promise<{ ok: boolean; erro?: string }> => {
    const emailLimpo = email.trim().toLowerCase();
    const encontrado = dados?.usuarios.find((u) => u.email.toLowerCase() === emailLimpo);
    if (!encontrado) {
      return { ok: false, erro: 'Esse e-mail não está cadastrado no sistema.' };
    }
    // `shouldCreateUser: false` impede que um e-mail qualquer (mesmo sem conta
    // aqui) crie um usuário novo no Supabase Auth só por tentar o login —
    // login por código só vale pra quem já está cadastrado em Usuários.
    const { error } = await supabase.auth.signInWithOtp({
      email: emailLimpo,
      options: { shouldCreateUser: false },
    });
    if (error) {
      return { ok: false, erro: 'Não foi possível enviar o código agora. Tente novamente em instantes.' };
    }
    return { ok: true };
  };

  const confirmarCodigoLogin = async (
    email: string,
    codigo: string,
    manterConectado: boolean,
  ): Promise<{ ok: boolean; erro?: string }> => {
    const emailLimpo = email.trim().toLowerCase();
    const { error } = await supabase.auth.verifyOtp({ email: emailLimpo, token: codigo.trim(), type: 'email' });
    if (error) {
      return { ok: false, erro: 'Código inválido ou expirado.' };
    }
    // O app tem sua própria sessão (usuarioAtualId + local/sessionStorage) —
    // a sessão do Supabase Auth só serviu pra conferir o código, não
    // precisamos dela depois disso.
    await supabase.auth.signOut();
    const encontrado = dados?.usuarios.find((u) => u.email.toLowerCase() === emailLimpo);
    if (!encontrado) {
      return { ok: false, erro: 'Esse e-mail não está cadastrado no sistema.' };
    }
    concluirLogin(encontrado, manterConectado);
    return { ok: true };
  };

  const logout = () => {
    registrarLog('saiu', 'Sessão', 'Saiu do sistema.');
    setUsuarioAtualId(null);
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
    setModoVisualizacao(null);
  };

  const addUsuario = (u: Usuario) => {
    setDados((prev) => (prev ? { ...prev, usuarios: [...prev.usuarios, u] } : prev));
    sincronizar(dbUsuarios.inserir(u), `novo usuário ${u.email}`);
    registrarLog('criou', 'Usuário', `Criou o usuário ${u.nome} (${u.email}).`, { entidadeId: u.id });
  };

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    const usuarioAntes = dados?.usuarios.find((u) => u.id === id);
    const detalhesUsuario = diferencas(usuarioAntes, patch, { nome: 'Nome', email: 'E-mail', cargo: 'Cargo', perfilId: 'Perfil' });
    if (patch.contratosPermitidos !== undefined) {
      const antes = [...(usuarioAntes?.contratosPermitidos ?? [])].sort().join(',');
      const depois = [...patch.contratosPermitidos].sort().join(',');
      if (antes !== depois) {
        const rotulo = (n: number) => (n === 0 ? 'todos os contratos' : `${n} contrato${n !== 1 ? 's' : ''}`);
        detalhesUsuario.push({
          campo: 'Contratos que acompanha',
          de: rotulo(usuarioAntes?.contratosPermitidos?.length ?? 0),
          para: rotulo(patch.contratosPermitidos.length),
        });
      }
    }
    // A senha nunca é gravada no log — só o aviso de que foi trocada.
    if (patch.senha !== undefined && patch.senha !== usuarioAntes?.senha) detalhesUsuario.push({ campo: 'Senha', para: 'alterada' });
    for (const d of detalhesUsuario) {
      if (d.campo === 'Perfil') {
        d.de = dados?.perfis.find((p) => p.id === usuarioAntes?.perfilId)?.nome ?? d.de;
        d.para = dados?.perfis.find((p) => p.id === patch.perfilId)?.nome ?? d.para;
      }
    }
    if (detalhesUsuario.length) {
      registrarLog('editou', 'Usuário', `Editou o usuário ${usuarioAntes?.nome ?? id}.`, { entidadeId: id, detalhes: detalhesUsuario });
    }
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
    registrarLog('excluiu', 'Usuário', `Excluiu o usuário ${alvo.nome} (${alvo.email}).`, { entidadeId: id });
    return true;
  };

  // ── Perfis de acesso ────────────────────────────────────────────
  const addPerfil = (p: Perfil) => {
    setDados((prev) => (prev ? { ...prev, perfis: [...prev.perfis, p] } : prev));
    sincronizar(dbPerfis.inserir(p), `novo perfil ${p.nome}`);
    registrarLog('criou', 'Perfil de Acesso', `Criou o perfil de acesso ${p.nome}.`, { entidadeId: p.id });
  };

  const updatePerfil = (id: string, patch: Partial<Perfil>) => {
    const perfilAntes = dados?.perfis.find((p) => p.id === id);
    registrarLog('editou', 'Perfil de Acesso', `Editou o perfil de acesso ${patch.nome ?? perfilAntes?.nome ?? id}${patch.permissoes ? ' (permissões)' : ''}.`, {
      entidadeId: id,
      detalhes: diferencas(perfilAntes, patch, { nome: 'Nome' }),
    });
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
    registrarLog('excluiu', 'Perfil de Acesso', `Excluiu o perfil de acesso ${alvo.nome}.`, { entidadeId: id });
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

  /** Dados já limitados aos contratos que o usuário logado acompanha (ver `Usuario.contratosPermitidos`).
   * Sem limite (lista vazia) ou sendo Administrador, devolve tudo. As gravações continuam usando
   * `dados` inteiro — só o que as telas enxergam é filtrado. */
  const visivel = useMemo(() => {
    if (!dados) return null;
    const permitidos = usuarioAtual?.contratosPermitidos ?? [];
    if (ehAdministradorReal || permitidos.length === 0) {
      return { contratos: dados.contratos, fornecedores: dados.fornecedores, ocorrencias: dados.ocorrencias, medicoes: dados.medicoes };
    }
    const ids = new Set(permitidos);
    const contratos = dados.contratos.filter((c) => ids.has(c.id));
    const fornecedoresDosContratos = new Set(contratos.map((c) => c.fornecedorId));
    const fornecedoresComContrato = new Set(dados.contratos.map((c) => c.fornecedorId));
    return {
      contratos,
      // Também aparece o fornecedor que o próprio usuário cadastrou e ainda não tem contrato.
      fornecedores: dados.fornecedores.filter(
        (f) => fornecedoresDosContratos.has(f.id) || (!fornecedoresComContrato.has(f.id) && !!usuarioAtual && f.criadoPor === usuarioAtual.nome),
      ),
      ocorrencias: dados.ocorrencias.filter((o) => !!o.contratoId && ids.has(o.contratoId)),
      medicoes: dados.medicoes.filter((m) => ids.has(m.contratoId)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, usuarioAtualId, ehAdministradorReal]);

  const notificacoes = useMemo<Notificacao[]>(() => {
    if (!dados || !visivel) return [];
    const base = [
      ...gerarNotificacoesVigencia(visivel.contratos),
      ...gerarNotificacoesTreinamento(visivel.ocorrencias, dados.indicadores),
      // Só para quem pode abrir a Medição e Pagamento (é lá que o valor é informado).
      ...(perfilEfetivo?.permissoes.medicao?.ver ? gerarNotificacoesNotaPendente(visivel.contratos, visivel.medicoes) : []),
    ];
    return base
      .map((n) => ({ ...n, lida: dados.notificacoesLidasIds.includes(n.id) }))
      .sort((a, b) => {
        if (a.lida !== b.lida) return a.lida ? 1 : -1;
        return ORDEM_URGENCIA[a.urgencia] - ORDEM_URGENCIA[b.urgencia];
      });
  }, [dados, visivel, perfilEfetivo]);

  const value = useMemo<DataContextValue | null>(() => {
    if (!dados || !visivel) return null;
    return {
      fornecedores: visivel.fornecedores,
      contratos: visivel.contratos,
      addFornecedor,
      carregarLogs,
      buscarFornecedorPorCnpj,
      buscarContratoPorNumero,
      updateFornecedor,
      addContrato,
      updateContrato,
      contratosDoFornecedor,
      contratosAtivosDoFornecedor,
      scoreFornecedor,
      notificacoes,
      marcarNotificacaoLida,
      marcarTodasNotificacoesLidas,
      ocorrencias: visivel.ocorrencias,
      addOcorrencia,
      medicoes: visivel.medicoes,
      updateMedicao,
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
      enviarCodigoLogin,
      confirmarCodigoLogin,
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
  }, [dados, visivel, notificacoes, usuarioAtualId, modoVisualizacao]);

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
