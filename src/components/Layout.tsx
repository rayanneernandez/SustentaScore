import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      {menuAberto && <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />}
      <main className={`main-content ${notifAberto ? 'main-content--notif-open' : ''}`}>
        <div className="topbar">
          <button className="topbar-menu-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <NotificationBell aberto={notifAberto} onAbrirChange={setNotifAberto} />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
