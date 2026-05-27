import { NavLink } from 'react-router-dom';
import {
  Users,
  Leaf,
  AlertTriangle,
  Calculator,
  ClipboardList,
  BarChart2,
  HelpCircle,
  LogOut,
} from 'lucide-react';

const navOperacional = [
  { to: '/cadastro', label: 'Cadastro', icon: Users, num: 1 },
  { to: '/indicadores', label: 'Indicadores de Sustentabilidade', icon: Leaf, num: 2 },
  { to: '/ocorrencias', label: 'Registro de Ocorrências', icon: AlertTriangle, num: 3 },
  { to: '/score', label: 'Cálculo do Score', icon: Calculator, num: 4 },
  { to: '/medicao', label: 'Medição e Pagamento', icon: ClipboardList, num: 5 },
];

const navGerencial = [
  { to: '/', label: 'Monitoramento e Painel Gerencial', icon: BarChart2, num: 6 },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={20} strokeWidth={1.8} />
        </div>
        <div>
          <div className="sidebar-logo-title">SustentaScore</div>
          <div className="sidebar-logo-sub">Avaliação de Fornecedores</div>
        </div>
      </div>

      {/* Ambiente Operacional */}
      <div className="sidebar-section">
        <span className="sidebar-section-label">AMBIENTE OPERACIONAL</span>
        <nav className="sidebar-nav">
          {navOperacional.map(({ to, label, icon: Icon, num }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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

      {/* Ambiente Gerencial */}
      <div className="sidebar-section">
        <span className="sidebar-section-label">AMBIENTE GERENCIAL</span>
        <nav className="sidebar-nav">
          {navGerencial.map(({ to, label, icon: Icon, num }) => (
            <NavLink
              key={to}
              to={to}
              end
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

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-footer-btn">
          <HelpCircle size={16} strokeWidth={1.8} />
          <span>Ajuda</span>
        </button>
        <button className="sidebar-footer-btn">
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
