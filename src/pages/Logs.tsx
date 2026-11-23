import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { AcaoLog, LogAtividade } from '../types';

const PASSO = 500;

const ROTULO_ACAO: Record<AcaoLog, string> = {
  criou: 'Criou',
  editou: 'Editou',
  excluiu: 'Excluiu',
  entrou: 'Entrou',
  saiu: 'Saiu',
};

const CLASSE_ACAO: Record<AcaoLog, string> = {
  criou: 'badge--green',
  editou: 'badge--blue',
  excluiu: 'log-badge--excluiu',
  entrou: 'badge--gray',
  saiu: 'badge--gray',
};

const formatarDataHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Logs() {
  const { podeVer, carregarLogs, usuarios: usuariosCadastrados } = useData();
  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [limite, setLimite] = useState(PASSO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const [usuarioSel, setUsuarioSel] = useState('Todos');
  const [acaoSel, setAcaoSel] = useState('Todas');
  const [entidadeSel, setEntidadeSel] = useState('Todos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(
    async (qtd: number) => {
      setCarregando(true);
      setErro('');
      try {
        setLogs(await carregarLogs(qtd));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErro(
          /relation|does not exist|schema cache|logs/i.test(msg)
            ? 'Não foi possível ler os logs. A tabela "logs" ainda não existe no Supabase — rode o SQL de criação da tabela e atualize esta tela.'
            : `Não foi possível carregar os logs: ${msg}`,
        );
      } finally {
        setCarregando(false);
      }
    },
    [carregarLogs],
  );

  useEffect(() => {
    void carregar(limite);
  }, [carregar, limite]);

  // O log guarda o nome que o usuário tinha na hora; se ele foi renomeado depois, mostra o nome atual
  // (pelo id). Usuário já excluído continua com o nome gravado.
  const nomeDoUsuario = useCallback(
    (l: LogAtividade) => usuariosCadastrados.find((u) => u.id === l.usuarioId)?.nome ?? l.usuarioNome,
    [usuariosCadastrados],
  );

  const usuarios = useMemo(() => ['Todos', ...Array.from(new Set(logs.map(nomeDoUsuario))).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [logs, nomeDoUsuario]);
  const entidades = useMemo(() => ['Todos', ...Array.from(new Set(logs.map((l) => l.entidade))).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [logs]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const inicio = de ? new Date(`${de}T00:00:00`).getTime() : null;
    const fim = ate ? new Date(`${ate}T23:59:59.999`).getTime() : null;
    return logs.filter((l) => {
      if (usuarioSel !== 'Todos' && nomeDoUsuario(l) !== usuarioSel) return false;
      if (acaoSel !== 'Todas' && l.acao !== acaoSel) return false;
      if (entidadeSel !== 'Todos' && l.entidade !== entidadeSel) return false;
      const t = new Date(l.criadoEm).getTime();
      if (inicio !== null && t < inicio) return false;
      if (fim !== null && t > fim) return false;
      if (termo) {
        const texto = normalizar(
          `${l.descricao} ${nomeDoUsuario(l)} ${l.entidade} ${(l.detalhes ?? []).map((d) => `${d.campo} ${d.de ?? ''} ${d.para ?? ''}`).join(' ')}`,
        );
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
  }, [logs, usuarioSel, acaoSel, entidadeSel, de, ate, busca, nomeDoUsuario]);

  const alternar = (id: string) =>
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  if (!podeVer('logs')) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Logs de Atividade</h1>
            <p className="page-subtitle">Acesso restrito.</p>
          </div>
        </div>
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver esta tela.</div>
      </div>
    );
  }

  const haFiltro = usuarioSel !== 'Todos' || acaoSel !== 'Todas' || entidadeSel !== 'Todos' || de || ate || busca;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Logs de Atividade</h1>
          <p className="page-subtitle">Tudo o que cada usuário criou, editou e excluiu no sistema, com data e hora.</p>
        </div>
        <button className="btn-secondary" onClick={() => void carregar(limite)} disabled={carregando}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      <div className="filters-bar logs-filtros">
        <div className="filter-group logs-busca">
          <label className="filter-label">Buscar</label>
          <div className="logs-busca-campo">
            <Search size={14} />
            <input className="filter-select-input" placeholder="Fornecedor, contrato, usuário…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Usuário</label>
          <select className="filter-select-input" value={usuarioSel} onChange={(e) => setUsuarioSel(e.target.value)}>
            {usuarios.map((u) => (
              <option key={u} value={u}>{u === 'Todos' ? 'Todos os usuários' : u}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Ação</label>
          <select className="filter-select-input" value={acaoSel} onChange={(e) => setAcaoSel(e.target.value)}>
            <option value="Todas">Todas as ações</option>
            {(Object.keys(ROTULO_ACAO) as AcaoLog[]).map((a) => (
              <option key={a} value={a}>{ROTULO_ACAO[a]}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Tipo de registro</label>
          <select className="filter-select-input" value={entidadeSel} onChange={(e) => setEntidadeSel(e.target.value)}>
            {entidades.map((e) => (
              <option key={e} value={e}>{e === 'Todos' ? 'Todos os tipos' : e}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">De</label>
          <input type="date" className="filter-select-input" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Até</label>
          <input type="date" className="filter-select-input" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      {erro && <p className="form-hint form-hint--danger">{erro}</p>}

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table logs-tabela">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Tipo</th>
                <th>O que foi feito</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const temDetalhes = !!l.detalhes?.length;
                const aberto = abertos.has(l.id);
                return (
                  <Fragment key={l.id}>
                    <tr>
                      <td className="logs-data">{formatarDataHora(l.criadoEm)}</td>
                      <td>{nomeDoUsuario(l)}</td>
                      <td><span className={`badge ${CLASSE_ACAO[l.acao]}`}>{ROTULO_ACAO[l.acao]}</span></td>
                      <td>{l.entidade}</td>
                      <td>
                        <div className="logs-descricao">
                          <span>{l.descricao}</span>
                          {temDetalhes && (
                            <button className="logs-detalhes-btn" onClick={() => alternar(l.id)} aria-expanded={aberto}>
                              {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {aberto ? 'Ocultar' : 'Ver o que mudou'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {temDetalhes && aberto && (
                      <tr className="logs-linha-detalhes">
                        <td colSpan={5}>
                          <ul className="logs-detalhes">
                            {l.detalhes!.map((d, i) => (
                              <li key={i}>
                                <strong>{d.campo}:</strong>{' '}
                                {d.de !== undefined ? (
                                  <>
                                    <span className="logs-de">{d.de}</span> → <span className="logs-para">{d.para}</span>
                                  </>
                                ) : (
                                  <span className="logs-para">{d.para}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!carregando && !erro && filtrados.length === 0 && (
          <div className="empty-state">
            {logs.length === 0
              ? 'Ainda não há nenhum registro. As ações feitas a partir de agora aparecem aqui.'
              : 'Nenhum registro encontrado com esses filtros.'}
          </div>
        )}
        {carregando && <div className="empty-state">Carregando…</div>}
      </div>

      <div className="logs-rodape">
        <span>
          {filtrados.length} registro(s){haFiltro ? ' com os filtros aplicados' : ''} · {logs.length} carregado(s)
        </span>
        {logs.length >= limite && !carregando && (
          <button className="btn-secondary btn-secondary--sm" onClick={() => setLimite((l) => l + PASSO)}>
            Carregar mais antigos
          </button>
        )}
      </div>
    </div>
  );
}
