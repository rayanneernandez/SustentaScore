import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

/** Contexto disponível para toda página renderizada dentro do `<Outlet />` — hoje só o
 * sino de notificações, para páginas que queiram posicioná-lo dentro do próprio cabeçalho
 * (ver `Dashboard.tsx`) em vez de usar o sino padrão que fica na faixa superior (`.topbar`). */
export interface LayoutContext {
  notifAberto: boolean;
  setNotifAberto: (aberto: boolean) => void;
}

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const location = useLocation();
  // O Dashboard tem seu próprio cabeçalho com "Última atualização" e posiciona o sino ali
  // ao lado — nesse caso a faixa superior (.topbar) não repete o sino, só o menu mobile.
  const naDashboard = location.pathname === '/';

  return (
    <div className="app-shell">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      {menuAberto && <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />}
      <main className={`main-content ${notifAberto ? 'main-content--notif-open' : ''}`}>
        {/* No Dashboard, o sino já aparece dentro do próprio cabeçalho da página (ao lado
         * de "Última atualização") — em telas de desktop a faixa superior fica sem nenhum
         * conteúdo visível ali, então usa a classe `topbar--dashboard` pra não sobrar
         * espaço vazio acima do cabeçalho. Em mobile ela continua com o padding normal,
         * porque o botão de abrir o menu lateral precisa desse espaço em qualquer tela. */}
        <div className={`topbar ${naDashboard ? 'topbar--dashboard' : ''}`}>
          <button className="topbar-menu-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          {!naDashboard && <NotificationBell aberto={notifAberto} onAbrirChange={setNotifAberto} />}
        </div>
        <Outlet context={{ notifAberto, setNotifAberto } satisfies LayoutContext} />
      </main>
    </div>
  );
}
