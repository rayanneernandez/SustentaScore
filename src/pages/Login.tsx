import { useState, type FormEvent } from 'react';
import { Leaf, LogIn } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function Login() {
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = login(email, senha);
    setErro(ok ? '' : 'E-mail ou senha incorretos.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="sidebar-logo-icon">
            <Leaf size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="login-logo-title">SustentaScore</div>
            <div className="login-logo-sub">Avaliação de Fornecedores</div>
          </div>
        </div>

        <h1 className="login-heading">Entrar no sistema</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group form-group--full">
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              required
            />
          </div>
          <div className="form-group form-group--full">
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {erro && <p className="form-hint form-hint--danger">{erro}</p>}
          <button className="btn-primary login-submit" type="submit">
            <LogIn size={16} /> Entrar
          </button>
        </form>

        <div className="login-hint">
          <p className="login-hint-title">Acesso de teste (protótipo ainda sem banco de dados):</p>
          <p>Administrador — admin@sustentascore.gov.br / admin123</p>
          <p>Colaborador — colaborador@sustentascore.gov.br / colab123</p>
        </div>
      </div>
    </div>
  );
}
