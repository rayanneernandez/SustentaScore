import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cadastro from './pages/Cadastro';
import Indicadores from './pages/Indicadores';
import EstruturaSustentabilidade from './pages/EstruturaSustentabilidade';
import Ocorrencias from './pages/Ocorrencias';
import CalculoScore from './pages/CalculoScore';
import MedicaoPagamento from './pages/MedicaoPagamento';
import Usuarios from './pages/Usuarios';
import Perfis from './pages/Perfis';
import Login from './pages/Login';
import { DataProvider, useData } from './context/DataContext';
import { PAGINAS_SISTEMA } from './config/sistema';
import type { PaginaKey } from './types';

/** Caminho da URL de cada tela — usado só para redirecionar quando uma rota é bloqueada. */
const ROTA_DE: Record<PaginaKey, string> = {
  dashboard: '/',
  cadastro: '/cadastro',
  indicadores: '/indicadores',
  cadastroPdls: '/estrutura-sustentabilidade',
  ocorrencias: '/ocorrencias',
  score: '/score',
  medicao: '/medicao',
  usuarios: '/usuarios',
  perfis: '/perfis',
};

/**
 * Bloqueia o acesso direto (por URL) a uma tela que o perfil efetivo não pode
 * ver — o menu lateral já esconde o link, mas alguém pode digitar a URL direto.
 * Manda para a primeira tela que o perfil pode ver, ou mostra uma mensagem de
 * acesso restrito se não houver nenhuma.
 */
function RotaProtegida({ pagina, children }: { pagina: PaginaKey; children: ReactElement }) {
  const { podeVer } = useData();
  if (podeVer(pagina)) return children;

  const primeiraPermitida = PAGINAS_SISTEMA.find((p) => podeVer(p.key));
  if (!primeiraPermitida) {
    return (
      <div className="page">
        <div className="empty-state">Seu perfil de acesso não tem permissão para ver nenhuma tela do sistema. Fale com um administrador.</div>
      </div>
    );
  }
  return <Navigate to={ROTA_DE[primeiraPermitida.key]} replace />;
}

function AppRoutes() {
  const { usuarioAtual } = useData();

  // Sem sessão local (ver aviso em Usuario/DataContext): mostra a tela de login
  // no lugar do sistema inteiro.
  if (!usuarioAtual) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<RotaProtegida pagina="dashboard"><Dashboard /></RotaProtegida>} />
        <Route path="cadastro" element={<RotaProtegida pagina="cadastro"><Cadastro /></RotaProtegida>} />
        <Route path="indicadores" element={<RotaProtegida pagina="indicadores"><Indicadores /></RotaProtegida>} />
        <Route path="estrutura-sustentabilidade" element={<RotaProtegida pagina="cadastroPdls"><EstruturaSustentabilidade /></RotaProtegida>} />
        <Route path="ocorrencias" element={<RotaProtegida pagina="ocorrencias"><Ocorrencias /></RotaProtegida>} />
        <Route path="score" element={<RotaProtegida pagina="score"><CalculoScore /></RotaProtegida>} />
        <Route path="medicao" element={<RotaProtegida pagina="medicao"><MedicaoPagamento /></RotaProtegida>} />
        <Route path="usuarios" element={<RotaProtegida pagina="usuarios"><Usuarios /></RotaProtegida>} />
        <Route path="perfis" element={<RotaProtegida pagina="perfis"><Perfis /></RotaProtegida>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}
