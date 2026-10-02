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
  // Nas demais telas a faixa superior fica sem fundo próprio (ver `.topbar` no CSS): em
  // telas de desktop ela não ocupa espaço nenhum além do sino, que fica flutuando na
  // cor de fundo da própria tela, sem nenhuma faixa branca separada.
  const naDashboard = location.pathname === '/';

  return (
    <div className="app-shell">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      {menuAberto && <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />}
      <main className={`main-content ${notifAberto ? 'main-content--notif-open' : ''}`}>
        {/* Em telas de desktop a faixa superior não tem fundo próprio nem padding (ver
         * `.topbar` no CSS) — só o sino fica visível ali, flutuando na cor de fundo da
         * tela. No Dashboard o sino já aparece dentro do próprio cabeçalho da página (ao
         * lado de "Última atualização"), por isso some daqui. Em mobile ela continua com
         * o padding normal, porque o botão de abrir o menu lateral precisa desse espaço
         * em qualquer tela. */}
        <div className="topbar">
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
