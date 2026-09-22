import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Recycle, Droplets, Zap, Leaf, Wind, Users, X, Filter, FileText, ClipboardCheck, ArrowRight, Paperclip,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Indicador, UnidadeMedidaPDLS } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  recycle: <Recycle size={16} strokeWidth={1.5} />,
  droplets: <Droplets size={16} strokeWidth={1.5} />,
  zap: <Zap size={16} strokeWidth={1.5} />,
  leaf: <Leaf size={16} strokeWidth={1.5} />,
  wind: <Wind size={16} strokeWidth={1.5} />,
  users: <Users size={16} strokeWidth={1.5} />,
};

const unidadeMedidaLabel: Record<UnidadeMedidaPDLS, string> = {
  percentual: 'Percentual',
  quantidade: 'Quantidade',
  conformidade: 'Conformidade',
  outro: 'Outro',
};

/**
 * Tela só de VISUALIZAÇÃO/seleção — filtra e mostra os Aspectos de Sustentabilidade
 * já cadastrados, e o detalhe de cada um (Eixos PDLS + Indicadores de Desempenho já
 * ligados a ele, e os contratos vinculados). Todo o CADASTRO (criar/editar/excluir
 * Aspecto, Eixo PDLS ou Indicador de Desempenho) foi movido para a tela "Estrutura
 * de Sustentabilidade" (`EstruturaSustentabilidade.tsx`) — a usuária achou confuso
 * ter esse cadastro misturado aqui dentro do detalhe de um Aspecto, junto com o que
 * é só consulta. Ver `types/index.ts` (comentário em `Indicador`) e README_HANDOFF.md.
 *
 * Volta a ser um grid de cards (a usuária testou a versão em lista/acordeão de uma
 * rodada anterior e preferiu cards) — mas cada card só mostra o ícone, o nome e as
 * badges (objeto + quantidade de Eixos PDLS), sem a descrição. Isso é o que resolve
 * a reclamação original (cards muito "expandidos" na tela, todos abertos ao mesmo
 * tempo): a descrição completa, os Eixos PDLS/Indicadores e os contratos vinculados
 * só aparecem no modal de detalhe, ao clicar num card.
 */
export default function Indicadores() {
  const { contratos, indicadores: lista, eixosPDLS, indicadoresPDLSDe, podeVer } = useData();
  const podeVerCadastroPDLS = podeVer('cadastroPdls');
  const location = useLocation();
  const navigate = useNavigate();

  const [detalhe, setDetalhe] = useState<Indicador | null>(null);
  const [filtroEixo, setFiltroEixo] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Ao salvar as Observações (passo 5) na "Estrutura de Sustentabilidade", a usuária é
  // trazida direto pra cá com o modal do Aspecto correspondente já aberto — pra confirmar
  // visualmente o que acabou de salvar, sem precisar procurar o card de novo. O
  // `navigate(..., { replace: true, state: null })` consome esse estado uma única vez —
  // sem isso, voltar pra esta tela pelo botão "Voltar" do navegador reabriria o modal.
  useEffect(() => {
    const abrirAspectoId = (location.state as { abrirAspectoId?: string } | null)?.abrirAspectoId;
    if (!abrirAspectoId) return;
    const ind = lista.find((i) => i.id === abrirAspectoId);
    if (ind) setDetalhe(ind);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, lista, navigate]);

  const tiposDisponiveis = useMemo(
    () => Array.from(new Set(lista.map((i) => i.tipo))).sort(),
    [lista]
  );

  /** Os "Eixos PDLS deste Aspecto" são só os que têm pelo menos um Indicador de
   * Desempenho cadastrado pra ele — não existe mais um Eixo PDLS "principal" fixo
   * no Aspecto (ver comentário no tipo `Indicador`). */
  const eixosDoAspecto = (ind: Indicador) =>
    eixosPDLS.filter((eixo) => indicadoresPDLSDe(ind.id, eixo.id).length > 0);

  /** Indicadores de Desempenho do Aspecto sem vinculação com nenhum Eixo PDLS
   * (`eixoId` indefinido) — exigências contratuais/legais que o documento de
   * origem já marca assim (ver comentário em `IndicadorPDLS`, types/index.ts). */
  const semVinculoDoAspecto = (ind: Indicador) => indicadoresPDLSDe(ind.id, null);

  const listaFiltrada = lista.filter((i) => {
    if (filtroEixo === 'sem-vinculo' && semVinculoDoAspecto(i).length === 0) return false;
    else if (filtroEixo !== 'todos' && filtroEixo !== 'sem-vinculo' && eixosDoAspecto(i).every((e) => e.id !== filtroEixo)) return false;
    if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    return true;
  });

  /** Um contrato é considerado vinculado ao macroindicador quando o objeto contratual
   * dele corresponde ao objeto contratual do macroindicador e o contrato está ativo. */
  const contratosDoIndicador = (ind: Indicador) =>
    contratos.filter((c) => c.status === 'ativo' && c.objeto === ind.tipo);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Aspectos de Sustentabilidade</h1>
          <p className="page-subtitle">Aspectos de sustentabilidade vinculados aos contratos.</p>
        </div>
        {podeVerCadastroPDLS && (
          <Link to="/estrutura-sustentabilidade" className="btn-primary">
            Estrutura de Sustentabilidade
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* Filtros — só consulta, o cadastro de Aspecto/Eixo/Indicador é em Estrutura de Sustentabilidade */}
      <div className="occurrence-filters">
        <Filter size={14} className="text-muted" />
        <select className="filter-select-plain" value={filtroEixo} onChange={(e) => setFiltroEixo(e.target.value)}>
          <option value="todos">Todos os Eixos PDLS</option>
          {eixosPDLS.map((e) => (
            <option key={e.id} value={e.id}>Eixo {e.numero} – {e.nome}</option>
          ))}
          <option value="sem-vinculo">Sem vinculação direta ao PDLS</option>
        </select>
        <select className="filter-select-plain" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os objetos</option>
          {tiposDisponiveis.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="occurrence-count">
          {listaFiltrada.length} aspecto{listaFiltrada.length !== 1 ? 's' : ''} de sustentabilidade
        </span>
      </div>

      <div className="indicators-grid">
        {listaFiltrada.map((ind) => {
          const eixos = eixosDoAspecto(ind);
          const semVinculo = semVinculoDoAspecto(ind);
          const totalIndicadores = eixos.length + (semVinculo.length > 0 ? 1 : 0);
          return (
            <div key={ind.id} className="indicator-card" onClick={() => setDetalhe(ind)}>
              <div className="indicator-card-top">
                <div className="indicator-card-badges">
                  <span className="badge badge--outline">{ind.tipo}</span>
                  {totalIndicadores === 0 ? (
                    <span className="badge badge--outline">Sem Eixo PDLS cadastrado</span>
                  ) : (
                    <>
                      {eixos.length > 0 && (
                        <span className="badge badge--outline">{eixos.length} Eixo{eixos.length !== 1 ? 's' : ''} PDLS</span>
                      )}
                      {semVinculo.length > 0 && <span className="badge badge--outline">Sem vinculação ao PDLS</span>}
                    </>
                  )}
                </div>
              </div>
              <div className="indicator-card-heading" style={{ marginBottom: 0 }}>
                <div className="indicator-card-icon">
                  {iconMap[ind.icone] || <Leaf size={16} />}
                </div>
                <h3 className="indicator-card-name">{ind.nome}</h3>
              </div>
            </div>
          );
        })}
        {listaFiltrada.length === 0 && (
          <p className="empty-state-sm">Nenhum aspecto de sustentabilidade encontrado para o filtro atual.</p>
        )}
      </div>

      {/* Modal Detalhe — só leitura: descrição, Eixos PDLS + Indicadores de Desempenho já cadastrados, e contratos vinculados */}
      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{detalhe.nome}</h2>
              <button className="modal-close" onClick={() => setDetalhe(null)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">{detalhe.descricao}</p>
            <div className="indicator-card-badges" style={{ marginBottom: 0 }}>
              <span className="badge badge--outline">{detalhe.tipo}</span>
            </div>

            <div className="detail-block">
              <span className="detail-label">Eixos PDLS e Indicadores de Desempenho</span>
              {eixosDoAspecto(detalhe).length === 0 && semVinculoDoAspecto(detalhe).length === 0 ? (
                <p className="empty-state-sm">
                  Nenhum Eixo PDLS cadastrado para este aspecto ainda.
                  {podeVerCadastroPDLS && (
                    <> Cadastre em <Link to="/estrutura-sustentabilidade">Estrutura de Sustentabilidade</Link>.</>
                  )}
                </p>
              ) : (
                <>
                {eixosDoAspecto(detalhe).map((eixo) => (
                  <div key={eixo.id} style={{ marginTop: 14 }}>
                    <span className="eixo-nome-atual">Eixo {eixo.numero} – {eixo.nome}</span>
                    <div className="pdls-list" style={{ marginTop: 8 }}>
                      {indicadoresPDLSDe(detalhe.id, eixo.id).map((p) => (
                        <div key={p.id} className="pdls-card">
                          <div className="pdls-card-top">
                            <span className="pdls-card-nome">{p.nome}</span>
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
                          {(p.observacoes || (p.anexos && p.anexos.length > 0)) && (
                            <div className="pdls-meios">
                              <span className="pdls-meios-titulo"><Paperclip size={13} /> Observações</span>
                              {p.observacoes && <p className="pdls-card-muted" style={{ marginTop: 4 }}>{p.observacoes}</p>}
                              {p.anexos && p.anexos.length > 0 && (
                                <div className="anexo-list" style={{ marginTop: 6 }}>
                                  {p.anexos.map((anexo) => (
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
                      ))}
                    </div>
                  </div>
                ))}
                {semVinculoDoAspecto(detalhe).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span className="eixo-nome-atual">Sem vinculação direta ao PDLS</span>
                    <div className="pdls-list" style={{ marginTop: 8 }}>
                      {semVinculoDoAspecto(detalhe).map((p) => (
                        <div key={p.id} className="pdls-card">
                          <div className="pdls-card-top">
                            <span className="pdls-card-nome">{p.nome}</span>
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
                          {(p.observacoes || (p.anexos && p.anexos.length > 0)) && (
                            <div className="pdls-meios">
                              <span className="pdls-meios-titulo"><Paperclip size={13} /> Observações</span>
                              {p.observacoes && <p className="pdls-card-muted" style={{ marginTop: 4 }}>{p.observacoes}</p>}
                              {p.anexos && p.anexos.length > 0 && (
                                <div className="anexo-list" style={{ marginTop: 6 }}>
                                  {p.anexos.map((anexo) => (
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
                      ))}
                    </div>
                  </div>
                )}
                </>
              )}
            </div>

            <div className="detail-block">
              <span className="detail-label">Contratos vinculados</span>
              {contratosDoIndicador(detalhe).length === 0 ? (
                <p className="empty-state-sm">Nenhum contrato ativo com este objeto contratual.</p>
              ) : (
                <div className="contract-list" style={{ marginTop: 8 }}>
                  {contratosDoIndicador(detalhe).map((c) => (
                    <div key={c.id} className="contract-item contract-item--static">
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
                        </div>
                        <div className="contract-item-meta">
                          {[c.fornecedorNome, c.unidade].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
