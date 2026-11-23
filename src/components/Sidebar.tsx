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
  ScrollText,
  HelpCircle,
  LogOut,
  Repeat,
  Sun,
  Moon,
  X,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { PaginaKey } from '../types';

// Estrutura de Sustentabilidade vem antes de Aspectos de Sustentabilidade —
// pedido da usuária: depois de escolher o Objeto Contratual, só os eixos
// daquele objeto ficam disponíveis, então faz mais sentido estruturar
// primeiro e só depois detalhar os aspectos, evitando poluir o fluxo.
const navOperacional: { to: string; label: string; icon: typeof Users; num: number; pagina: PaginaKey }[] = [
  { to: '/cadastro', label: 'Fornecedores', icon: Users, num: 1, pagina: 'cadastro' },
  { to: '/contratos', label: 'Contratos', icon: FileText, num: 2, pagina: 'contratos' },
  { to: '/estrutura-sustentabilidade', label: 'Estrutura de Sustentabilidade', icon: Layers, num: 3, pagina: 'cadastroPdls' },
  { to: '/indicadores', label: 'Aspectos de Sustentabilidade', icon: Leaf, num: 4, pagina: 'indicadores' },
  { to: '/ocorrencias', label: 'Registro de Ocorrências', icon: AlertTriangle, num: 5, pagina: 'ocorrencias' },
  { to: '/score', label: 'Cálculo do Score', icon: Calculator, num: 6, pagina: 'score' },
  { to: '/medicao', label: 'Medição e Pagamento', icon: ClipboardList, num: 7, pagina: 'medicao' },
];

const navGerencial: { to: string; label: string; icon: typeof Users; num: number; pagina: PaginaKey }[] = [
  { to: '/', label: 'Monitoramento e Painel Gerencial', icon: BarChart2, num: 8, pagina: 'dashboard' },
];

export default function Sidebar({
  open,
  onClose,
  recolhido,
  onAlternarRecolhido,
}: {
  open: boolean;
  onClose: () => void;
  /** Modo recolhido (só ícones) — vale só em telas largas; no celular o menu já abre/fecha por cima. */
  recolhido: boolean;
  onAlternarRecolhido: () => void;
}) {
  const { usuarioAtual, perfis, perfilEfetivo, podeVer, ehAdministradorReal, modoVisualizacao, setModoVisualizacao, logout } = useData();
  const { tema, alternarTema } = useTheme();

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}${recolhido ? ' sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={20} strokeWidth={1.8} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">SustentaScore</div>
          <div className="sidebar-logo-sub">Avaliação da Sustentabilidade dos Fornecedores</div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onAlternarRecolhido}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
        >
          {recolhido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
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
                title={label}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">{num}</span>
                <Icon size={16} strokeWidth={1.8} />
                <span className="sidebar-nav-label">{label}</span>
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
                title={label}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">{num}</span>
                <Icon size={16} strokeWidth={1.8} />
                <span className="sidebar-nav-label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Administração — Usuários e Perfis de Acesso são telas (e permissões) separadas agora */}
      {(podeVer('usuarios') || podeVer('perfis') || podeVer('logs')) && (
        <div className="sidebar-section">
          <span className="sidebar-section-label">ADMINISTRAÇÃO</span>
          <nav className="sidebar-nav">
            {podeVer('usuarios') && (
              <NavLink
                to="/usuarios"
                title="Usuários"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">9</span>
                <Users size={16} strokeWidth={1.8} />
                <span className="sidebar-nav-label">Usuários</span>
              </NavLink>
            )}
            {podeVer('perfis') && (
              <NavLink
                to="/perfis"
                title="Perfis de Acesso"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">10</span>
                <ShieldCheck size={16} strokeWidth={1.8} />
                <span className="sidebar-nav-label">Perfis de Acesso</span>
              </NavLink>
            )}
            {podeVer('logs') && (
              <NavLink
                to="/logs"
                title="Logs de Atividade"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-num">11</span>
                <ScrollText size={16} strokeWidth={1.8} />
                <span className="sidebar-nav-label">Logs de Atividade</span>
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
        <button className="sidebar-footer-btn" title="Ajuda">
          <HelpCircle size={16} strokeWidth={1.8} />
          <span className="sidebar-nav-label">Ajuda</span>
        </button>
        <button className="sidebar-footer-btn" onClick={logout} title="Sair do sistema">
          <LogOut size={16} strokeWidth={1.8} />
          <span className="sidebar-nav-label">Sair do sistema</span>
        </button>
      </div>
    </aside>
  );
}
