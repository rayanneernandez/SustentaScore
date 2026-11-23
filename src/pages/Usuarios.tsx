import { useState } from 'react';
import { Plus, ShieldCheck, User, Trash2, Pencil, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { PERFIL_ADMIN_ID, PERFIL_COLABORADOR_ID } from '../config/sistema';
import type { Usuario } from '../types';

const formUsuarioVazio = { nome: '', email: '', senha: '', cargo: '', perfilId: '', contratosPermitidos: [] as string[] };

export default function Usuarios() {
  const {
    usuarios,
    usuarioAtual,
    contratos,
    perfis,
    podeVer,
    podeCriar: podeCriarPagina,
    podeEditar: podeEditarPagina,
    podeExcluir: podeExcluirPagina,
    addUsuario,
    updateUsuario,
    removeUsuario,
  } = useData();
  const podeCriar = podeCriarPagina('usuarios');
  const podeEditar = podeEditarPagina('usuarios');
  const podeExcluir = podeExcluirPagina('usuarios');

  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formUsuario, setFormUsuario] = useState(formUsuarioVazio);
  const [erroUsuario, setErroUsuario] = useState('');
  const [buscaContrato, setBuscaContrato] = useState('');

  if (!podeVer('usuarios')) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title-serif">Usuários</h1>
            <p className="page-subtitle">Acesso restrito.</p>
          </div>
        </div>
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver esta tela.</div>
      </div>
    );
  }

  const nomePerfilDe = (id: string) => perfis.find((p) => p.id === id)?.nome ?? '—';

  const abrirNovoUsuario = () => {
    setUsuarioEditando(null);
    setFormUsuario({ ...formUsuarioVazio, perfilId: PERFIL_COLABORADOR_ID });
    setBuscaContrato('');
    setErroUsuario('');
    setShowModalUsuario(true);
  };

  const abrirEditarUsuario = (u: Usuario) => {
    setUsuarioEditando(u);
    setFormUsuario({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo ?? '', perfilId: u.perfilId, contratosPermitidos: u.contratosPermitidos ?? [] });
    setBuscaContrato('');
    setErroUsuario('');
    setShowModalUsuario(true);
  };

  const handleSalvarUsuario = () => {
    if (!formUsuario.nome.trim() || !formUsuario.email.trim() || !formUsuario.perfilId) {
      setErroUsuario('Preencha nome, e-mail e perfil.');
      return;
    }
    const emailEmUso = usuarios.some(
      (u) => u.email.trim().toLowerCase() === formUsuario.email.trim().toLowerCase() && u.id !== usuarioEditando?.id,
    );
    if (emailEmUso) {
      setErroUsuario('Já existe um usuário com esse e-mail.');
      return;
    }
    // Quem edita pode não enxergar todos os contratos: os que ele não vê ficam como estavam.
    const idsQueEuEnxergo = new Set(contratos.map((c) => c.id));
    const contratosPermitidos = [
      ...(usuarioEditando?.contratosPermitidos ?? []).filter((id) => !idsQueEuEnxergo.has(id)),
      ...formUsuario.contratosPermitidos.filter((id) => idsQueEuEnxergo.has(id)),
    ];
    if (usuarioEditando) {
      updateUsuario(usuarioEditando.id, {
        contratosPermitidos,
        nome: formUsuario.nome.trim(),
        email: formUsuario.email.trim(),
        cargo: formUsuario.cargo.trim() || undefined,
        perfilId: formUsuario.perfilId,
        ...(formUsuario.senha.trim() ? { senha: formUsuario.senha.trim() } : {}),
      });
    } else {
      if (!formUsuario.senha.trim()) {
        setErroUsuario('Defina uma senha para o novo usuário.');
        return;
      }
      addUsuario({
        id: `u${Date.now()}`,
        nome: formUsuario.nome.trim(),
        email: formUsuario.email.trim(),
        senha: formUsuario.senha.trim(),
        cargo: formUsuario.cargo.trim() || undefined,
        perfilId: formUsuario.perfilId,
        ...(contratosPermitidos.length ? { contratosPermitidos } : {}),
      });
    }
    setShowModalUsuario(false);
  };

  const handleRemoverUsuario = (id: string) => {
    const ok = removeUsuario(id);
    if (!ok) setErroUsuario('Não é possível remover o único usuário com o perfil Administrador.');
    else setErroUsuario('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title-serif">Usuários</h1>
          <p className="page-subtitle">Quem pode acessar o sistema, com qual cargo e qual perfil de acesso.</p>
        </div>
        {podeCriar && (
          <button className="btn-primary" onClick={abrirNovoUsuario}>
            <Plus size={16} /> Novo usuário
          </button>
        )}
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Perfil</th>
                {(podeEditar || podeExcluir) && <th className="data-table-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="data-table-nome">
                      <span className={`data-table-icon ${u.perfilId === PERFIL_ADMIN_ID ? 'data-table-icon--admin' : ''}`}>
                        {u.perfilId === PERFIL_ADMIN_ID ? <ShieldCheck size={14} /> : <User size={14} />}
                      </span>
                      {u.nome}
                      {u.id === usuarioAtual?.id && <span className="badge badge--outline">Você</span>}
                    </div>
                  </td>
                  <td>{u.cargo || '—'}</td>
                  <td className="data-table-email">{u.email}</td>
                  <td>
                    <span className={`badge ${u.perfilId === PERFIL_ADMIN_ID ? 'badge--green' : 'badge--gray'}`}>
                      {nomePerfilDe(u.perfilId)}
                    </span>
                    {u.perfilId !== PERFIL_ADMIN_ID && !!u.contratosPermitidos?.length && (
                      <span className="usuario-restrito" title="Este usuário só enxerga os contratos marcados no cadastro dele.">
                        Só {u.contratosPermitidos.length} contrato{u.contratosPermitidos.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  {(podeEditar || podeExcluir) && (
                    <td className="data-table-acoes">
                      {podeEditar && (
                        <button className="indicator-action-btn" title="Editar usuário" onClick={() => abrirEditarUsuario(u)}>
                          <Pencil size={14} />
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          className="indicator-action-btn indicator-action-btn--delete"
                          title="Remover usuário"
                          onClick={() => handleRemoverUsuario(u.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {erroUsuario && <p className="form-hint form-hint--danger" style={{ marginTop: 10 }}>{erroUsuario}</p>}
      </div>

      {/* ── Modal: Novo/Editar usuário ── */}
      {showModalUsuario && (
        <div className="modal-overlay" onClick={() => setShowModalUsuario(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{usuarioEditando ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button className="modal-close" onClick={() => setShowModalUsuario(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group form-group--full">
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={formUsuario.nome}
                onChange={(e) => setFormUsuario((p) => ({ ...p, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Cargo</label>
              <input
                className="form-input"
                placeholder="Ex: Fiscal de Contrato"
                value={formUsuario.cargo}
                onChange={(e) => setFormUsuario((p) => ({ ...p, cargo: e.target.value }))}
              />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">E-mail *</label>
              <input
                className="form-input"
                type="email"
                value={formUsuario.email}
                onChange={(e) => setFormUsuario((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">
                {usuarioEditando ? 'Nova senha (deixe em branco para manter a atual)' : 'Senha *'}
              </label>
              <input
                className="form-input"
                type="password"
                value={formUsuario.senha}
                onChange={(e) => setFormUsuario((p) => ({ ...p, senha: e.target.value }))}
              />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Perfil *</label>
              <select
                className="form-input"
                value={formUsuario.perfilId}
                onChange={(e) => setFormUsuario((p) => ({ ...p, perfilId: e.target.value }))}
              >
                <option value="" disabled>Selecione...</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            {formUsuario.perfilId !== PERFIL_ADMIN_ID && (
              <div className="form-group form-group--full">
                <label className="form-label">Contratos que este usuário acompanha (opcional)</label>
                <span className="form-hint form-hint--muted">
                  Sem nenhum marcado, ele vê todos os contratos. Marcando, ele só enxerga esses contratos, os fornecedores
                  deles e as ocorrências, medições e scores deles. As telas que ele acessa continuam definidas pelo perfil.
                </span>
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  placeholder="Buscar por nº do contrato, fornecedor ou objeto..."
                  value={buscaContrato}
                  onChange={(e) => setBuscaContrato(e.target.value)}
                />
                <div className="usuario-contratos-lista">
                  {contratos
                    .filter((c) => `${c.numero} ${c.fornecedorNome} ${c.objeto ?? ''}`.toLowerCase().includes(buscaContrato.trim().toLowerCase()))
                    .map((c) => (
                      <label key={c.id} className="usuario-contratos-item">
                        <input
                          type="checkbox"
                          checked={formUsuario.contratosPermitidos.includes(c.id)}
                          onChange={(e) =>
                            setFormUsuario((p) => ({
                              ...p,
                              contratosPermitidos: e.target.checked
                                ? [...p.contratosPermitidos, c.id]
                                : p.contratosPermitidos.filter((id) => id !== c.id),
                            }))
                          }
                        />
                        <span>
                          <strong>{c.numero}</strong> · {c.fornecedorNome}
                          {c.objeto ? <span className="usuario-contratos-objeto"> — {c.objeto}</span> : null}
                          {c.status === 'inativo' ? <span className="usuario-contratos-objeto"> (inativo)</span> : null}
                        </span>
                      </label>
                    ))}
                  {contratos.length === 0 && <p className="form-hint form-hint--muted">Nenhum contrato cadastrado ainda.</p>}
                </div>
                <div className="usuario-contratos-rodape">
                  <span>
                    {formUsuario.contratosPermitidos.length === 0
                      ? 'Nenhum marcado: vê todos os contratos.'
                      : `${formUsuario.contratosPermitidos.length} contrato${formUsuario.contratosPermitidos.length !== 1 ? 's' : ''} marcado${formUsuario.contratosPermitidos.length !== 1 ? 's' : ''}.`}
                  </span>
                  {formUsuario.contratosPermitidos.length > 0 && (
                    <button type="button" className="link-btn" onClick={() => setFormUsuario((p) => ({ ...p, contratosPermitidos: [] }))}>
                      Limpar seleção
                    </button>
                  )}
                </div>
              </div>
            )}

            {erroUsuario && <p className="form-hint form-hint--danger">{erroUsuario}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModalUsuario(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSalvarUsuario}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
