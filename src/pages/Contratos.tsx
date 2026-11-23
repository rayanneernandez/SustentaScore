import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Paperclip, X } from 'lucide-react';
import { useData, statusVigencia, formatarDataBR } from '../context/DataContext';
import { capitalizarPalavras } from '../utils/texto';
import { BadgeVigencia, ModalContrato, ModalDetalheContrato } from '../components/ContratoModais';
import type { Contrato } from '../types';

/**
 * Aba Contratos — é aqui que os contratos são criados e editados (antes ficavam dentro de
 * cada Fornecedor). Mesmo formato da aba Fornecedores (busca + filtros + botão de novo
 * registro), mas com os contratos em tabela. Na aba Fornecedores o contrato continua
 * aparecendo, só para consulta.
 */
export default function Contratos() {
  const { contratos, fornecedores, podeCriar: podeCriarPagina, podeEditar: podeEditarPagina } = useData();
  const podeCriar = podeCriarPagina('contratos');
  const podeEditar = podeEditarPagina('contratos');

  const [busca, setBusca] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState('todas');
  const [objetoFiltro, setObjetoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [novoContrato, setNovoContrato] = useState(false);
  // Veio da aba Fornecedores pelo "Atribuir contrato": abre o Novo Contrato já com aquele fornecedor.
  const [fornecedorPreSelecionado, setFornecedorPreSelecionado] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  // Veio da aba Fornecedores pelo "Ver contratos": a lista já abre filtrada por aquele fornecedor.
  const [fornecedorFiltroId, setFornecedorFiltroId] = useState('');
  useEffect(() => {
    const st = location.state as { novoContratoFornecedorId?: string; filtrarFornecedorId?: string; abrirContratoId?: string } | null;
    if (st?.novoContratoFornecedorId) {
      setFornecedorPreSelecionado(st.novoContratoFornecedorId);
      setNovoContrato(true);
      navigate(location.pathname, { replace: true, state: null });
    } else if (st?.abrirContratoId) {
      // Veio do modal "Ver detalhes" do fornecedor: abre direto o detalhe daquele contrato.
      setContratoDetalheId(st.abrirContratoId);
      navigate(location.pathname, { replace: true, state: null });
    } else if (st?.filtrarFornecedorId) {
      setFornecedorFiltroId(st.filtrarFornecedorId);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);
  const fornecedorFiltro = fornecedores.find((f) => f.id === fornecedorFiltroId);
  const fornecedorDoNovo = fornecedores.find((f) => f.id === fornecedorPreSelecionado);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [contratoDetalheId, setContratoDetalheId] = useState<string | null>(null);

  const contratoDetalhe = contratos.find((c) => c.id === contratoDetalheId) ?? null;

  const unidades = useMemo(
    () => [...new Set(contratos.map((c) => c.unidade).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [contratos],
  );
  const objetos = useMemo(
    () => [...new Set(contratos.map((c) => c.objeto).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [contratos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contratos
      .filter((c) => {
        const matchBusca =
          !termo || c.numero.toLowerCase().includes(termo) || c.fornecedorNome.toLowerCase().includes(termo);
        const matchUnidade = unidadeFiltro === 'todas' || c.unidade === unidadeFiltro;
        const matchObjeto = objetoFiltro === 'todos' || c.objeto === objetoFiltro;
        const matchStatus = statusFiltro === 'todos' || c.status === statusFiltro;
        const matchFornecedor = !fornecedorFiltroId || c.fornecedorId === fornecedorFiltroId;
        return matchBusca && matchUnidade && matchObjeto && matchStatus && matchFornecedor;
      })
      .sort(
        (a, b) =>
          a.fornecedorNome.localeCompare(b.fornecedorNome, 'pt-BR') || a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true }),
      );
  }, [contratos, busca, unidadeFiltro, objetoFiltro, statusFiltro, fornecedorFiltroId]);

  const temFiltro = busca.trim() !== '' || unidadeFiltro !== 'todas' || objetoFiltro !== 'todos' || statusFiltro !== 'todos' || fornecedorFiltroId !== '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Contratos</h1>
          <p className="page-subtitle">Contratos dos fornecedores — cadastro, vigência e aspectos de sustentabilidade de cada um.</p>
        </div>
      </div>

      <div className="search-bar-row">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por número do contrato ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="search-input"
          />
        </div>
        <select className="filter-select-input" value={unidadeFiltro} onChange={(e) => setUnidadeFiltro(e.target.value)}>
          <option value="todas">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select className="filter-select-input" value={objetoFiltro} onChange={(e) => setObjetoFiltro(e.target.value)}>
          <option value="todos">Todos os objetos</option>
          {objetos.map((o) => (
            <option key={o} value={o}>{capitalizarPalavras(o)}</option>
          ))}
        </select>
        <select
          className="filter-select-input"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativo' | 'inativo')}
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Somente ativos</option>
          <option value="inativo">Somente inativos</option>
        </select>
        {podeCriar && (
          <button
            className="btn-primary"
            onClick={() => setNovoContrato(true)}
            disabled={fornecedores.length === 0}
            title={fornecedores.length === 0 ? 'Cadastre um fornecedor primeiro' : undefined}
          >
            <Plus size={16} />
            Novo Contrato
          </button>
        )}
      </div>

      {fornecedorFiltro && (
        <div className="contratos-filtro-fornecedor">
          <span>Mostrando só os contratos de <strong>{fornecedorFiltro.nome}</strong></span>
          <button type="button" className="supplier-ver-contratos-btn" onClick={() => setFornecedorFiltroId('')}>
            <X size={13} /> Ver todos os contratos
          </button>
        </div>
      )}

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table contratos-table">
            <thead>
              <tr>
                <th>Nº Contrato</th>
                <th>Fornecedor</th>
                <th>Objeto</th>
                <th>Unidade Administrativa</th>
                <th>Vigência</th>
                <th>Status</th>
                <th className="text-center">Score</th>
                {podeEditar && <th className="contratos-table-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="contratos-table-row" onClick={() => setContratoDetalheId(c.id)}>
                  <td>
                    <div className="data-table-nome">
                      <span className={`status-dot-only status-dot-only--${c.faixa}`} title={`Score: ${c.score} pontos`} />
                      {c.numero}
                      {!!c.anexos?.length && (
                        <span className="contract-item-anexo-icon" title={`${c.anexos.length} anexo(s)`}>
                          <Paperclip size={12} /> {c.anexos.length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{c.fornecedorNome}</td>
                  <td>{c.objeto ? capitalizarPalavras(c.objeto) : '—'}</td>
                  <td>{c.unidade || '—'}</td>
                  <td>{statusVigencia(c) ? <BadgeVigencia contrato={c} /> : c.vigenciaFim ? `Até ${formatarDataBR(c.vigenciaFim)}` : '—'}</td>
                  <td>
                    <span className={`contract-status contract-status--${c.status}`}>
                      {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`contract-item-score-total contract-item-score-total--${c.faixa} contratos-table-score`}>
                      <span className="contract-item-score-total-value">{c.score}</span>
                      <span className="contract-item-score-total-label">pontos</span>
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="contratos-table-acoes">
                      <button
                        className="indicator-action-btn"
                        title="Editar dados do contrato"
                        onClick={(e) => { e.stopPropagation(); setContratoEditando(c); }}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={podeEditar ? 8 : 7} className="table-empty-state">
                    {contratos.length === 0
                      ? 'Nenhum contrato cadastrado ainda.'
                      : temFiltro
                        ? 'Nenhum contrato encontrado para os filtros atuais.'
                        : 'Nenhum contrato encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="form-hint form-hint--muted">
            {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}{temFiltro ? ` de ${contratos.length}` : ''}
          </span>
        </div>
      </div>

      {novoContrato && (
        <ModalContrato
          fornecedores={fornecedores}
          fornecedorId={fornecedorDoNovo?.id ?? ''}
          fornecedorNome={fornecedorDoNovo?.nome ?? ''}
          onClose={() => { setNovoContrato(false); setFornecedorPreSelecionado(''); }}
        />
      )}

      {contratoEditando && (
        <ModalContrato
          fornecedores={fornecedores}
          fornecedorId={contratoEditando.fornecedorId}
          fornecedorNome={contratoEditando.fornecedorNome}
          contratoParaEditar={contratoEditando}
          onClose={() => setContratoEditando(null)}
        />
      )}

      {contratoDetalhe && (
        <ModalDetalheContrato
          contrato={contratoDetalhe}
          onClose={() => setContratoDetalheId(null)}
          onEditar={(c) => { setContratoDetalheId(null); setContratoEditando(c); }}
        />
      )}
    </div>
  );
}
