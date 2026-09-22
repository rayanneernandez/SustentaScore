import { useState, type FormEvent } from 'react';
import { Leaf, LogIn, Eye, EyeOff, Mail, Lock, Send, Loader2, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import loginVisual from '../assets/login-visual.png';

type Aba = 'senha' | 'codigo';

export default function Login() {
  const { login } = useData();
  const [aba, setAba] = useState<Aba>('senha');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  // 'inicial' -> clica -> 'verificando' (alguns instantes) -> 'verificado'.
  // Clicar de novo já verificado desmarca. Não é um captcha de verdade (não
  // detecta bot nenhum — isso exigiria um serviço externo tipo reCAPTCHA ou
  // Turnstile com chave própria), mas funciona de verdade como uma trava:
  // sem passar por "verificado" o formulário não deixa entrar.
  const [statusRobo, setStatusRobo] = useState<'inicial' | 'verificando' | 'verificado'>('inicial');

  const alternarRobo = () => {
    if (statusRobo === 'verificado') {
      setStatusRobo('inicial');
      return;
    }
    if (statusRobo === 'verificando') return;
    setStatusRobo('verificando');
    window.setTimeout(() => setStatusRobo('verificado'), 900);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (statusRobo !== 'verificado') {
      setErro('Confirme que você não é um robô antes de entrar.');
      return;
    }
    const ok = login(email, senha, manterConectado);
    setErro(ok ? '' : 'E-mail ou senha incorretos.');
  };

  return (
    <div className="login-page">
      {/* Painel visual com a identidade do SustentaScore — em telas estreitas
       * (ver @media max-width: 900px) fica empilhado acima do formulário. */}
      {/* Painel visual — a imagem exata que a usuária mandou (não uma
       * recriação em CSS). Em telas estreitas (ver @media max-width: 900px)
       * fica empilhado acima do formulário. */}
      <div className="login-visual">
        <img src={loginVisual} alt="" className="login-visual-img" />
      </div>

      <div className="login-form-panel">
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
          <p className="login-subtitle">Acesse o painel de avaliação de fornecedores e indicadores de sustentabilidade.</p>

          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'senha'}
              className={`login-tab ${aba === 'senha' ? 'login-tab--ativa' : ''}`}
              onClick={() => setAba('senha')}
            >
              Senha
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'codigo'}
              className={`login-tab ${aba === 'codigo' ? 'login-tab--ativa' : ''}`}
              onClick={() => setAba('codigo')}
            >
              Código por e-mail
            </button>
          </div>

          {aba === 'senha' ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group form-group--full">
                <label className="form-label">E-mail corporativo</label>
                <div className="input-com-icone input-com-icone--prefixo">
                  <Mail size={16} className="input-icone-prefixo" />
                  <input
                    className="form-input form-input--com-prefixo"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@sustentascore.br"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Senha</label>
                <div className="input-com-icone input-com-icone--prefixo">
                  <Lock size={16} className="input-icone-prefixo" />
                  <input
                    className="form-input form-input--com-prefixo"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="input-icone-btn"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="login-row-entre">
                <label className="login-checkbox-row">
                  <input
                    type="checkbox"
                    checked={manterConectado}
                    onChange={(e) => setManterConectado(e.target.checked)}
                  />
                  Manter conectado
                </label>
              </div>

              <button
                type="button"
                className={`login-robo-box login-robo-box--${statusRobo}`}
                onClick={alternarRobo}
                aria-pressed={statusRobo === 'verificado'}
              >
                <span className="login-robo-caixa">
                  {statusRobo === 'verificando' ? (
                    <Loader2 size={13} className="login-robo-spin" />
                  ) : statusRobo === 'verificado' ? (
                    <Check size={13} strokeWidth={3} />
                  ) : null}
                </span>
                {statusRobo === 'verificando' ? 'Verificando…' : statusRobo === 'verificado' ? 'Verificado' : 'Não sou um robô'}
              </button>

              {erro && <p className="form-hint form-hint--danger">{erro}</p>}
              <button className="btn-primary login-submit" type="submit">
                <LogIn size={16} /> Entrar
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group form-group--full">
                <label className="form-label">E-mail corporativo</label>
                <div className="input-com-icone input-com-icone--prefixo">
                  <Mail size={16} className="input-icone-prefixo" />
                  <input
                    className="form-input form-input--com-prefixo"
                    type="email"
                    placeholder="nome@sustentascore.br"
                    autoFocus
                  />
                </div>
              </div>

              <p className="form-hint form-hint--warning">
                Login por código de e-mail ainda não está disponível — em breve.
              </p>
              <button className="btn-primary login-submit" type="submit" disabled>
                <Send size={16} /> Enviar código de acesso
              </button>
            </form>
          )}

        </div>

        <div className="login-info-box">
          <p className="login-hint-title">Acesso de teste (pode editar/excluir em Usuários depois de entrar):</p>
          <p>Administrador — admin@sustentascore.br / admin123</p>
          <p>Colaborador — colaborador@sustentascore.br / colab123</p>
        </div>
      </div>
    </div>
  );
}
