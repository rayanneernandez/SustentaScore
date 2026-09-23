import { NavLink } from 'react-router-dom';
import {
  Users,
  Leaf,
  Layers,
  AlertTriangle,
  Calculator,
  ClipboardList,
  BarChart2,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Repeat,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { PaginaKey } from '../types';

const navOperacional: { to: string; label: string; icon: typeof Users; num: number; pagina: PaginaKey }[] = [
  { to: '/cadastro', label: 'Fornecedores', icon: Users, num: 1, pagina: 'cadastro' },
  { to: '/indicadores', label: 'Aspectos de Sustentabilidade', icon: Leaf, num: 2, pagina: 'indicadores' },
  { to: '/estrutura-sustentabilidade', label: 'Estrutura de Sustentabilidade', icon: Layers, num: 3, pagina: 'cadastroPdls' },
  { to: '/ocorrencias', label: 'Registro de Ocorrências', icon: AlertTriangle, num: 4, pagina: 'ocorrencias' },
  { to: '/score', label: 'Cálculo do Score', icon: Calculator, num: 5, pagina: 'score' },
  { to: '/medicao', label: 'Medição e Pagamento', icon: ClipboardList, num: 6, pagina: 'medicao' },
];

const navGerencial: { to: string; label: string; icon: typeof Users; num: number; pagina: PaginaKey }[] = [
  { to: '/', label: 'Monitoramento e Painel Gerencial', icon: BarChart2, num: 7, pagina: 'dashboard' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuarioAtual, perfis, perfilEfetivo, podeVer, ehAdministradorReal, modoVisualizacao, setModoVisualizacao, logout } = useData();
  const { tema, alternarTema } = useTheme();

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={20} strokeWidth={1.8} />
        </div>
        <div>
          <div className="sidebar-logo-title">SustentaScore</div>
          <div className="sidebar-logo-sub">Avaliação de Fornecedores</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>

      {/* Ambiente Operacional */}
      {navOperacional.some((item) => podeVer(item.pagina)) && (
        <div className="sidebar-section">
          <span className="sidebar-section-label">AMBIENTE OPERACIONAL</span>
          <nav className="sidebar-nav">
            {navOperacional.filter((item) => podeVer(item.pagina)).map(({ to, label, icon: Icon, num }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">{num}</span>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Ambiente Gerencial */}
      {navGerencial.some((item) => podeVer(item.pagina)) && (
        <div className="sidebar-section">
          <span className="sidebar-section-label">AMBIENTE GERENCIAL</span>
          <nav className="sidebar-nav">
            {navGerencial.filter((item) => podeVer(item.pagina)).map(({ to, label, icon: Icon, num }) => (
              <NavLink
                key={to}
                to={to}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">{num}</span>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Administração — Usuários e Perfis de Acesso são telas (e permissões) separadas agora */}
      {(podeVer('usuarios') || podeVer('perfis')) && (
        <div className="sidebar-section">
          <span className="sidebar-section-label">ADMINISTRAÇÃO</span>
          <nav className="sidebar-nav">
            {podeVer('usuarios') && (
              <NavLink
                to="/usuarios"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">8</span>
                <Users size={16} strokeWidth={1.8} />
                <span>Usuários</span>
              </NavLink>
            )}
            {podeVer('perfis') && (
              <NavLink
                to="/perfis"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">9</span>
                <ShieldCheck size={16} strokeWidth={1.8} />
                <span>Perfis de Acesso</span>
              </NavLink>
            )}
          </nav>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-theme-toggle">
          <button
            type="button"
            className={`sidebar-theme-btn ${tema === 'claro' ? 'sidebar-theme-btn--ativo' : ''}`}
            onClick={() => tema !== 'claro' && alternarTema()}
          >
            <Sun size={13} /> Claro
          </button>
          <button
            type="button"
            className={`sidebar-theme-btn ${tema === 'escuro' ? 'sidebar-theme-btn--ativo' : ''}`}
            onClick={() => tema !== 'escuro' && alternarTema()}
          >
            <Moon size={13} /> Escuro
          </button>
        </div>
        {usuarioAtual && (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <span className="sidebar-user-nome">{usuarioAtual.nome}</span>
              {/* O nome do perfil já aparece escrito no botão de alternar (abaixo) quando ele
                  existe — a badge só aparece pra quem não tem esse botão (perfil único ou não é
                  Administrador), senão ficaria repetido. */}
              {!(ehAdministradorReal && perfis.length > 1) && (
                <span className="badge badge--gray sidebar-user-badge">
                  {perfilEfetivo?.nome ?? '—'}
                </span>
              )}
            </div>
            {ehAdministradorReal && perfis.length > 1 && (
              <button
                type="button"
                className="sidebar-role-toggle"
                title="Alternar perfil de visualização"
                onClick={() => {
                  const opcoes: (string | null)[] = [
                    null,
                    ...perfis.filter((p) => p.id !== usuarioAtual.perfilId).map((p) => p.id),
                  ];
                  const indiceAtual = opcoes.indexOf(modoVisualizacao);
                  const proximo = opcoes[(indiceAtual + 1) % opcoes.length];
                  setModoVisualizacao(proximo);
                }}
              >
                <Repeat size={14} />
                <span>{perfilEfetivo?.nome ?? '—'}</span>
              </button>
            )}
          </div>
        )}
        <button className="sidebar-footer-btn">
          <HelpCircle size={16} strokeWidth={1.8} />
          <span>Ajuda</span>
        </button>
        <button className="sidebar-footer-btn" onClick={logout}>
          <LogOut size={16} strokeWidth={1.8} />
          <span>Sair do sistema</span>
        </button>
        <div className="sidebar-footer-brand">
          <Leaf size={12} />
          <span>SustentaScore – Sistema Digital de Monitoramento e Avaliação do Desempenho de Fornecedores na Sustentabilidade</span>
        </div>
      </div>
    </aside>
  );
}
