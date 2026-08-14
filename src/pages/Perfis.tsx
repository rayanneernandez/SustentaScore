import { useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { PAGINAS_SISTEMA, PERFIL_ADMIN_ID } from '../data/mockData';
import type { Perfil, PaginaKey } from '../types';

function permissoesVazias(): Perfil['permissoes'] {
  return PAGINAS_SISTEMA.reduce(
    (acc, p) => ({ ...acc, [p.key]: { ver: false, criar: false, editar: false, excluir: false } }),
    {} as Perfil['permissoes'],
  );
}

type CampoPermissao = 'ver' | 'criar' | 'editar' | 'excluir';

export default function Perfis() {
  const {
    usuarios,
    perfis,
    podeVer,
    podeCriar: podeCriarPagina,
    podeEditar: podeEditarPagina,
    podeExcluir: podeExcluirPagina,
    addPerfil,
    updatePerfil,
    removePerfil,
  } = useData();
  const podeCriar = podeCriarPagina('perfis');
  const podeEditar = podeEditarPagina('perfis');
  const podeExcluir = podeExcluirPagina('perfis');

  const [showModal, setShowModal] = useState(false);
  const [perfilEditando, setPerfilEditando] = useState<Perfil | null>(null);
  const [nomeForm, setNomeForm] = useState('');
  const [permissoesForm, setPermissoesForm] = useState<Perfil['permissoes']>(permissoesVazias());
  const [erro, setErro] = useState('');

  if (!podeVer('perfis')) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Perfis de Acesso</h1>
            <p className="page-subtitle">Acesso restrito.</p>
          </div>
        </div>
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver esta tela.</div>
      </div>
    );
  }

  const usuariosNoPerfil = (id: string) => usuarios.filter((u) => u.perfilId === id).length;
  const perfilBloqueado = perfilEditando?.id === PERFIL_ADMIN_ID;

  const abrirNovo = () => {
    setPerfilEditando(null);
    setNomeForm('');
    setPermissoesForm(permissoesVazias());
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (p: Perfil) => {
    setPerfilEditando(p);
    setNomeForm(p.nome);
    setPermissoesForm(p.permissoes);
    setErro('');
    setShowModal(true);
  };

  const handleToggle = (pagina: PaginaKey, campo: CampoPermissao) => {
    if (perfilEditando?.id === PERFIL_ADMIN_ID) return;
    setPermissoesForm((prev) => {
      const atual = prev[pagina];
      const novoValor = !atual[campo];
      if (campo === 'ver') {
        // Desmarcar "ver" desliga as outras 3 (não faz sentido criar/editar/excluir sem ver a tela).
        return { ...prev, [pagina]: { ver: novoValor, criar: novoValor && atual.criar, editar: novoValor && atual.editar, excluir: novoValor && atual.excluir } };
      }
      // Marcar criar/editar/excluir liga "ver" automaticamente.
      return { ...prev, [pagina]: { ...atual, ver: novoValor ? true : atual.ver, [campo]: novoValor } };
    });
  };

  const handleSalvar = () => {
    if (perfilBloqueado) {
      setShowModal(false);
      return;
    }
    if (!nomeForm.trim()) {
      setErro('Dê um nome ao perfil.');
      return;
    }
    if (perfilEditando) {
      updatePerfil(perfilEditando.id, { nome: nomeForm.trim(), permissoes: permissoesForm });
    } else {
      addPerfil({ id: `perfil${Date.now()}`, nome: nomeForm.trim(), permissoes: permissoesForm });
    }
    setShowModal(false);
  };

  const handleRemover = (id: string) => {
    const ok = removePerfil(id);
    if (!ok) setErro('Não é possível excluir um perfil padrão, nem um perfil que ainda tem usuário atribuído a ele.');
    else setErro('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Perfis de Acesso</h1>
          <p className="page-subtitle">Quais telas cada perfil vê, e onde ele pode criar, editar ou excluir.</p>
        </div>
        {podeCriar && (
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus size={16} /> Novo perfil
          </button>
        )}
      </div>

      <p className="form-hint form-hint--muted section-card-hint">
        Administrador tem acesso total e não pode ser alterado — garante que sempre exista um caminho de acesso ao
        sistema. Os demais perfis podem ser criados livremente.
      </p>

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Perfil</th>
                <th>Usuários</th>
                <th>Telas com acesso</th>
                {(podeEditar || podeExcluir) && <th className="data-table-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => {
                const telasComVer = PAGINAS_SISTEMA.filter((pg) => p.permissoes[pg.key]?.ver).length;
                const qtdUsuarios = usuariosNoPerfil(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="data-table-nome">
                        {p.nome}
                        {p.padrao && <span className="badge badge--outline">Padrão</span>}
                      </div>
                    </td>
                    <td>{qtdUsuarios}</td>
                    <td>{telasComVer} de {PAGINAS_SISTEMA.length}</td>
                    {(podeEditar || podeExcluir) && (
                      <td className="data-table-acoes">
                        {podeEditar && (
                          <button
                            className="indicator-action-btn"
                            title={p.id === PERFIL_ADMIN_ID ? 'Ver permissões' : 'Editar permissões'}
                            onClick={() => abrirEditar(p)}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {podeExcluir && !p.padrao && (
                          <button
                            className="indicator-action-btn indicator-action-btn--delete"
                            title="Excluir perfil"
                            onClick={() => handleRemover(p.id)}
                            disabled={qtdUsuarios > 0}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {erro && <p className="form-hint form-hint--danger" style={{ marginTop: 10 }}>{erro}</p>}
      </div>

      {/* ── Modal: Novo/Editar perfil ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--lg modal--scroll" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {perfilEditando
                  ? perfilBloqueado ? `Permissões — ${perfilEditando.nome}` : `Editar perfil — ${perfilEditando.nome}`
                  : 'Novo perfil'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group form-group--full">
              <label className="form-label">Nome do perfil *</label>
              <input
                className="form-input"
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                disabled={perfilBloqueado}
                placeholder="Ex: Fiscal Sênior"
              />
            </div>

            <p className="form-section-title">Telas e permissões</p>
            {perfilBloqueado && (
              <p className="form-hint form-hint--muted" style={{ marginTop: -4 }}>
                O perfil Administrador sempre tem acesso total a todas as telas — não pode ser restringido, para
                sempre existir um caminho de acesso completo ao sistema.
              </p>
            )}

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tela</th>
                    <th className="perm-grid-col">Ver</th>
                    <th className="perm-grid-col">Criar</th>
                    <th className="perm-grid-col">Editar</th>
                    <th className="perm-grid-col">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {PAGINAS_SISTEMA.map((pg) => {
                    const perm = permissoesForm[pg.key] ?? { ver: false, criar: false, editar: false, excluir: false };
                    return (
                      <tr key={pg.key}>
                        <td>{pg.label}</td>
                        {(['ver', 'criar', 'editar', 'excluir'] as CampoPermissao[]).map((campo) => (
                          <td key={campo} className="perm-grid-col">
                            <input
                              type="checkbox"
                              className="perm-grid-checkbox"
                              checked={perfilBloqueado || perm[campo]}
                              disabled={perfilBloqueado}
                              onChange={() => handleToggle(pg.key, campo)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {erro && <p className="form-hint form-hint--danger">{erro}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                {perfilBloqueado ? 'Fechar' : 'Cancelar'}
              </button>
              {!perfilBloqueado && (
                <button className="btn-primary" onClick={handleSalvar}>Salvar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
