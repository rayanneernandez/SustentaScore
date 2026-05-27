import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cadastro from './pages/Cadastro';
import Indicadores from './pages/Indicadores';
import Ocorrencias from './pages/Ocorrencias';
import CalculoScore from './pages/CalculoScore';
import MedicaoPagamento from './pages/MedicaoPagamento';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="indicadores" element={<Indicadores />} />
          <Route path="ocorrencias" element={<Ocorrencias />} />
          <Route path="score" element={<CalculoScore />} />
          <Route path="medicao" element={<MedicaoPagamento />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
