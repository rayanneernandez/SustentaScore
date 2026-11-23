import { Fragment, useMemo, useState } from 'react';
import { X, Phone, MapPin, FileText, Pencil, Paperclip, ExternalLink } from 'lucide-react';
import { useData, formatarDataBR } from '../context/DataContext';
import { BadgeVigencia } from './ContratoModais';
import Paginacao from './Paginacao';
import { capitalizarPalavras, rotuloAutoria } from '../utils/texto';
import { exibirCNPJ } from '../utils/cnpj';
import { faixaDoScore, pagamentoDaFaixa, periodoParaChave, rotuloMesAtual } from '../utils/score';
import type { Fornecedor } from '../types';

type Aba = 'informacoes' | 'contratos' | 'ocorrencias';

/**
 * Modal "Ver detalhes" do fornecedor, em 3 abas:
 *  - Informações: dados cadastrais + pontuação (geral e por unidade administrativa);
 *  - Contratos: todos os contratos do fornecedor com a pontuação de cada um (clicar abre o contrato na aba Contratos);
 *  - Ocorrências: todas as ocorrências do fornecedor, com filtro por contrato.
 */
export default function ModalDetalheFornecedor({
  fornecedor,
  onClose,
  onEditar,
  onAbrirContrato,
}: {
  fornecedor: Fornecedor;
  onClose: () => void;
  /** Só informado quando o usuário pode editar fornecedores. */
  onEditar?: () => void;
  onAbrirContrato: (contratoId: string) => void;
}) {
  const { contratos, ocorrencias, medicoes, scoreFornecedor } = useData();
  const [aba, setAba] = useState<Aba>('informacoes');
  const [contratoFiltro, setContratoFiltro] = useState('todos');
  const [histPagina, setHistPagina] = useState(1);
  const [histMes, setHistMes] = useState('todos');
  const [histContrato, setHistContrato] = useState('todos');

  const contratosForn = useMemo(
    () =>
      contratos
        .filter((c) => c.fornecedorId === fornecedor.id)
        .sort((a, b) => (a.status === b.status ? 0 : a.status === 'ativo' ? -1 : 1) || a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true })),
    [contratos, fornecedor.id],
  );
  const ativos = contratosForn.filter((c) => c.status === 'ativo');
  const inativos = contratosForn.filter((c) => c.status === 'inativo');

  const score = scoreFornecedor(fornecedor.id);
  const faixa = score !== null ? faixaDoScore(score) : null;

  const scorePorUnidade = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    for (const c of ativos) {
      if (!c.unidade) continue;
      const atual = mapa.get(c.unidade) ?? { total: 0, qtd: 0 };
      atual.total += c.score;
      atual.qtd += 1;
      mapa.set(c.unidade, atual);
    }
    return Array.from(mapa.entries()).map(([unidade, { total, qtd }]) => ({ unidade, media: Math.round(total / qtd), qtd }));
  }, [ativos]);

  // Mês a que a pontuação se refere (o score reinicia em 500 todo mês), por extenso: "novembro de 2026".
  const nomeMesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Histórico mensal do fornecedor: média da pontuação dos contratos dele que tiveram medição em cada mês
  // (inclui contratos hoje inativos, que estavam ativos naquele mês).
  const historicoMensal = useMemo(() => {
    const porNumero = new Map(contratosForn.map((c) => [c.id, c.numero]));
    const porPeriodo = new Map<string, { contratoId: string; contrato: string; score: number; ocorrencias: number }[]>();
    for (const m of medicoes) {
      if (!porNumero.has(m.contratoId)) continue;
      const lista = porPeriodo.get(m.periodo) ?? [];
      lista.push({ contratoId: m.contratoId, contrato: porNumero.get(m.contratoId) as string, score: m.score, ocorrencias: m.ocorrencias });
      porPeriodo.set(m.periodo, lista);
    }
    return [...porPeriodo.entries()]
      .sort((a, b) => periodoParaChave(b[0]) - periodoParaChave(a[0]))
      .map(([periodo, itens]) => ({ periodo, itens: itens.sort((x, y) => x.contrato.localeCompare(y.contrato, 'pt-BR', { numeric: true })) }));
  }, [medicoes, contratosForn]);

  // Filtros do histórico mensal: por mês e por contrato. Sem filtro de contrato, cada mês mostra a média do
  // fornecedor e, logo abaixo, uma linha por contrato; escolhendo um contrato, só as linhas dele.
  const gruposHistorico = historicoMensal
    .filter((h) => histMes === 'todos' || h.periodo === histMes)
    .map((h) => {
      const itens = h.itens.filter((i) => histContrato === 'todos' || i.contratoId === histContrato);
      const media = itens.length ? Math.round(itens.reduce((t, i) => t + i.score, 0) / itens.length) : 0;
      return { periodo: h.periodo, itens, media, faixa: faixaDoScore(media), ocorrencias: itens.reduce((t, i) => t + i.ocorrencias, 0) };
    })
    .filter((g) => g.itens.length > 0);

  // Paginação por mês: cada página mostra alguns meses inteiros (a média + os contratos de cada mês).
  const MESES_POR_PAGINA = 3;
  const totalPaginasHist = Math.max(1, Math.ceil(gruposHistorico.length / MESES_POR_PAGINA));
  const paginaHistAtual = Math.min(histPagina, totalPaginasHist);
  const gruposDaPagina = gruposHistorico.slice((paginaHistAtual - 1) * MESES_POR_PAGINA, paginaHistAtual * MESES_POR_PAGINA);

  const ocorrenciasForn = useMemo(
    () =>
      ocorrencias
        .filter((o) => o.fornecedorId === fornecedor.id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [ocorrencias, fornecedor.id],
  );
  const ocorrenciasFiltradas = ocorrenciasForn.filter((o) => contratoFiltro === 'todos' || o.contratoId === contratoFiltro);
  const totalDeducao = ocorrenciasFiltradas.reduce((s, o) => s + (o.tipoRegistro === 'treinamento' ? 0 : o.deducao), 0);
  const numeroDoContrato = (id: string) => contratos.find((c) => c.id === id)?.numero ?? '—';

  const abas: { key: Aba; label: string; qtd?: number }[] = [
    { key: 'informacoes', label: 'Informações e pontuação' },
    { key: 'contratos', label: 'Contratos', qtd: contratosForn.length },
    { key: 'ocorrencias', label: 'Ocorrências', qtd: ocorrenciasForn.length },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{fornecedor.nome}</h2>
            <p className="modal-subtitle" style={{ margin: '2px 0 0' }}>CNPJ: {exibirCNPJ(fornecedor.cnpj)}</p>
          </div>
          <div className="detail-block-row" style={{ flexWrap: 'nowrap' }}>
            {onEditar && (
              <button className="btn-icon" onClick={onEditar}>
                <Pencil size={14} /> Editar fornecedor
              </button>
            )}
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="forn-tabs" role="tablist">
          {abas.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={aba === a.key}
              className={`forn-tab ${aba === a.key ? 'forn-tab--ativa' : ''}`}
              onClick={() => setAba(a.key)}
            >
              {a.label}{a.qtd !== undefined ? ` (${a.qtd})` : ''}
            </button>
          ))}
        </div>

        {aba === 'informacoes' && (
          <div className="forn-aba">
            <div className="forn-score-box">
              <div className={`forn-score-valor forn-score-valor--${faixa ?? 'sem'}`}>
                {score ?? '—'}
                <span>{score !== null ? `pontos · ${rotuloMesAtual()}` : 'sem contrato ativo'}</span>
              </div>
              <div className="forn-score-texto">
                <strong>Pontuação do fornecedor · {nomeMesAtual}</strong>
                <span>
                  {score !== null
                    ? `Média dos ${ativos.length} contrato${ativos.length !== 1 ? 's' : ''} ativo${ativos.length !== 1 ? 's' : ''} em ${rotuloMesAtual()} · faixa de pagamento ${pagamentoDaFaixa(faixa!)}% da NF`
                    : 'O fornecedor só tem pontuação quando possui contrato ativo.'}
                </span>
              </div>
            </div>

            <div className="forn-historico">
              <div className="forn-historico-topo">
                <span className="supplier-score-unidade-titulo">Histórico mensal da pontuação</span>
                {historicoMensal.length > 0 && (
                  <div className="forn-historico-filtros">
                    <select className="filter-select-plain" value={histMes} onChange={(e) => { setHistMes(e.target.value); setHistPagina(1); }} aria-label="Filtrar por mês">
                      <option value="todos">Todos os meses</option>
                      {historicoMensal.map((h) => (
                        <option key={h.periodo} value={h.periodo}>{h.periodo}</option>
                      ))}
                    </select>
                    <select className="filter-select-plain" value={histContrato} onChange={(e) => { setHistContrato(e.target.value); setHistPagina(1); }} aria-label="Filtrar por contrato">
                      <option value="todos">Todos os contratos</option>
                      {contratosForn.map((c) => (
                        <option key={c.id} value={c.id}>{c.numero}{c.status === 'inativo' ? ' (inativo)' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {historicoMensal.length === 0 ? (
                <p className="empty-state-sm" style={{ margin: 0 }}>Ainda não há meses medidos para este fornecedor.</p>
              ) : gruposHistorico.length === 0 ? (
                <p className="empty-state-sm" style={{ margin: 0 }}>Nenhum registro com esses filtros.</p>
              ) : (
                <div className="forn-historico-scroll">
                  <table className="data-table forn-historico-tabela">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>Contrato</th>
                        <th className="text-center">Pontuação</th>
                        <th>Pagamento da NF</th>
                        <th className="text-center">Ocorrências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruposDaPagina.map((g) => (
                        <Fragment key={g.periodo}>
                          {histContrato === 'todos' && (
                            <tr className="forn-historico-resumo">
                              <td><strong>{g.periodo}</strong></td>
                              <td><strong>Média do fornecedor</strong></td>
                              <td className="text-center">
                                <span className={`contract-item-score-total contract-item-score-total--${g.faixa} contratos-table-score`}>
                                  <span className="contract-item-score-total-value">{g.media}</span>
                                </span>
                              </td>
                              <td><strong>{pagamentoDaFaixa(g.faixa)}%</strong></td>
                              <td className="text-center"><strong>{g.ocorrencias}</strong></td>
                            </tr>
                          )}
                          {g.itens.map((i) => (
                            <tr key={`${g.periodo}-${i.contratoId}`} className="forn-historico-linha">
                              <td>{histContrato === 'todos' ? '' : g.periodo}</td>
                              <td className={histContrato === 'todos' ? 'forn-historico-contrato-recuo' : ''}>Contrato {i.contrato}</td>
                              <td className="text-center">{i.score}</td>
                              <td>{pagamentoDaFaixa(faixaDoScore(i.score))}%</td>
                              <td className="text-center">{i.ocorrencias}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Paginacao
                pagina={paginaHistAtual}
                totalPaginas={totalPaginasHist}
                onMudar={setHistPagina}
                rotuloItens={`${gruposHistorico.length} meses`}
              />
              <p className="form-hint form-hint--muted" style={{ marginTop: 6 }}>
                A média de cada mês considera os contratos do fornecedor que tiveram medição naquele mês.
              </p>
            </div>

            {scorePorUnidade.length > 1 && (
              <div className="supplier-score-unidade">
                <span className="supplier-score-unidade-titulo">Pontuação por unidade administrativa</span>
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

            <div className="forn-info-grid">
              <div>
                <span className="detail-label">Nome</span>
                <span className="detail-value">{fornecedor.nome}</span>
              </div>
              <div>
                <span className="detail-label">CNPJ</span>
                <span className="detail-value">{exibirCNPJ(fornecedor.cnpj)}</span>
              </div>
              <div>
                <span className="detail-label">Telefone</span>
                <span className="detail-value">{fornecedor.telefone ? <><Phone size={12} /> {fornecedor.telefone}</> : '—'}</span>
              </div>
              <div>
                <span className="detail-label">Endereço</span>
                <span className="detail-value">{fornecedor.endereco ? <><MapPin size={12} /> {fornecedor.endereco}</> : '—'}</span>
              </div>
              <div>
                <span className="detail-label">Contratos</span>
                <span className="detail-value">
                  {contratosForn.length} no total · {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
                  {inativos.length > 0 ? ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
              <div>
                <span className="detail-label">Ocorrências registradas</span>
                <span className="detail-value">{ocorrenciasForn.length}</span>
              </div>
              {fornecedor.observacao && (
                <div className="forn-info-full">
                  <span className="detail-label">Observação</span>
                  <span className="detail-value">{fornecedor.observacao}</span>
                </div>
              )}
              <div className="forn-info-full">
                <span className="detail-label">Anexos{fornecedor.anexos?.length ? ` (${fornecedor.anexos.length})` : ''}</span>
                {fornecedor.anexos?.length ? (
                  <div className="anexo-list">
                    {fornecedor.anexos.map((a) => (
                      <div key={a.id} className="anexo-item">
                        <Paperclip size={13} />
                        <a className="anexo-item-nome anexo-item-link" href={a.url} target="_blank" rel="noreferrer" download={a.nome}>
                          {a.nome} <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="detail-value">Nenhum anexo{onEditar ? ' — use "Editar fornecedor" para anexar.' : '.'}</span>
                )}
              </div>
              {rotuloAutoria(fornecedor.criadoPor, fornecedor.criadoEm) && (
                <div className="forn-info-full">
                  <span className="autoria-linha">{rotuloAutoria(fornecedor.criadoPor, fornecedor.criadoEm)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'contratos' && (
          <div className="forn-aba">
            {contratosForn.length === 0 ? (
              <p className="empty-state-sm">Este fornecedor ainda não tem contratos.</p>
            ) : (
              <>
                <p className="form-hint form-hint--muted" style={{ marginTop: 0 }}>Clique em um contrato para abrir os detalhes dele na aba Contratos.</p>
                <div className="contract-list">
                  {contratosForn.map((c) => (
                    <div key={c.id} className="contract-item" onClick={() => onAbrirContrato(c.id)}>
                      <div className="contract-item-icon">
                        <FileText size={15} strokeWidth={1.5} />
                      </div>
                      <div className="contract-item-body">
                        <div className="contract-item-num">
                          <span className={`status-dot-only status-dot-only--${c.faixa}`} title={`Score: ${c.score} pontos`} />
                          {c.numero}
                          <span className={`contract-status contract-status--${c.status}`}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <div className="contract-item-meta">
                          {[c.objeto ? capitalizarPalavras(c.objeto) : null, c.unidade].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <BadgeVigencia contrato={c} />
                      <div className={`contract-item-score-total contract-item-score-total--${c.faixa}`}>
                        <span className="contract-item-score-total-value">{c.score}</span>
                        <span className="contract-item-score-total-label">pontos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {aba === 'ocorrencias' && (
          <div className="forn-aba">
            <div className="forn-ocorr-filtro">
              <select className="filter-select-plain" value={contratoFiltro} onChange={(e) => setContratoFiltro(e.target.value)}>
                <option value="todos">Todos os contratos</option>
                {contratosForn.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero}{c.status === 'inativo' ? ' (inativo)' : ''}</option>
                ))}
              </select>
              <span className="occurrence-count">
                {ocorrenciasFiltradas.length} registro{ocorrenciasFiltradas.length !== 1 ? 's' : ''}
                {totalDeducao > 0 ? ` · -${totalDeducao} pts no total` : ''}
              </span>
            </div>

            {ocorrenciasFiltradas.length === 0 ? (
              <p className="empty-state-sm">Nenhuma ocorrência registrada{contratoFiltro !== 'todos' ? ' para este contrato' : ' para este fornecedor'}.</p>
            ) : (
              <div className="occurrence-list">
                {ocorrenciasFiltradas.map((o) => {
                  const treinamento = o.tipoRegistro === 'treinamento';
                  return (
                    <div key={o.id} className="occurrence-item forn-ocorr-item">
                      <div className="occurrence-item-left">
                        <span className="occurrence-date">{formatarDataBR(o.data)}</span>
                        <span className="badge badge--outline">{numeroDoContrato(o.contratoId)}</span>
                        <span className="occurrence-desc">
                          {o.descricao}
                          {o.indicadorNome ? <span className="text-muted"> · {o.indicadorNome}</span> : null}
                        </span>
                      </div>
                      <div className="occurrence-item-right">
                        {treinamento ? <span className="occurrence-sem-deducao">Sem dedução</span> : <span className="occurrence-deducao">-{o.deducao}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
