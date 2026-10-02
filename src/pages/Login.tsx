import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn, Eye, EyeOff, Mail, Lock, Send, Loader2, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import loginVisual from '../assets/login-visual.png';

type Aba = 'senha' | 'codigo';

export default function Login() {
  const { login, enviarCodigoLogin, confirmarCodigoLogin } = useData();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('senha');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);

  // ── Login por código de e-mail ─────────────────────────────────
  const [emailCodigo, setEmailCodigo] = useState('');
  const [etapaCodigo, setEtapaCodigo] = useState<'email' | 'codigo'>('email');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [erroCodigo, setErroCodigo] = useState('');
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [confirmandoCodigo, setConfirmandoCodigo] = useState(false);
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
    // Sempre cai no Monitoramento e Painel Gerencial ("/") ao logar — sem isso,
    // se a URL na hora do login era de outra tela (ex: um link direto, ou a
    // aba que já estava aberta numa página quando a sessão expirou), o app
    // renderiza direto aquela tela em vez do painel principal, porque o
    // gate de autenticação em App.tsx só troca o que é mostrado, nunca a
    // URL — pedido explícito da usuária: sempre entrar pelo painel gerencial.
    if (ok) navigate('/', { replace: true });
  };

  const handleEnviarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailCodigo.trim() || enviandoCodigo) return;
    setEnviandoCodigo(true);
    setErroCodigo('');
    const resultado = await enviarCodigoLogin(emailCodigo);
    setEnviandoCodigo(false);
    if (resultado.ok) {
      setEtapaCodigo('codigo');
    } else {
      setErroCodigo(resultado.erro ?? 'Não foi possível enviar o código. Tente novamente.');
    }
  };

  const handleConfirmarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    if (!codigoDigitado.trim() || confirmandoCodigo) return;
    setConfirmandoCodigo(true);
    setErroCodigo('');
    const resultado = await confirmarCodigoLogin(emailCodigo, codigoDigitado, manterConectado);
    setConfirmandoCodigo(false);
    if (resultado.ok) {
      // Mesmo pedido de sempre cair no Monitoramento e Painel Gerencial — ver
      // comentário equivalente em `handleSubmit`, acima.
      navigate('/', { replace: true });
    } else {
      setErroCodigo(resultado.erro ?? 'Código inválido ou expirado.');
    }
  };

  const voltarParaEmailCodigo = () => {
    setEtapaCodigo('email');
    setCodigoDigitado('');
    setErroCodigo('');
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
              <div className="login-logo-sub">Avaliação da Sustentabilidade dos Fornecedores</div>
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
                    placeholder="nome@gmail.com"
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
          ) : etapaCodigo === 'email' ? (
            <form className="login-form" onSubmit={handleEnviarCodigo}>
              <div className="form-group form-group--full">
                <label className="form-label">E-mail corporativo</label>
                <div className="input-com-icone input-com-icone--prefixo">
                  <Mail size={16} className="input-icone-prefixo" />
                  <input
                    className="form-input form-input--com-prefixo"
                    type="email"
                    value={emailCodigo}
                    onChange={(e) => setEmailCodigo(e.target.value)}
                    placeholder="nome@gmail.com"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <p className="form-hint form-hint--muted">
                Enviamos um código de 6 dígitos pro e-mail informado, válido só para quem já está cadastrado em Usuários.
              </p>
              {erroCodigo && <p className="form-hint form-hint--danger">{erroCodigo}</p>}
              <button className="btn-primary login-submit" type="submit" disabled={enviandoCodigo}>
                {enviandoCodigo ? <Loader2 size={16} className="login-robo-spin" /> : <Send size={16} />}
                {enviandoCodigo ? 'Enviando…' : 'Enviar código de acesso'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleConfirmarCodigo}>
              <div className="form-group form-group--full">
                <label className="form-label">Código recebido por e-mail</label>
                <p className="form-hint form-hint--muted" style={{ marginTop: -2 }}>
                  Enviado para <strong>{emailCodigo}</strong>.
                </p>
                <div className="input-com-icone input-com-icone--prefixo">
                  <Lock size={16} className="input-icone-prefixo" />
                  <input
                    className="form-input form-input--com-prefixo"
                    type="text"
                    inputMode="numeric"
                    value={codigoDigitado}
                    onChange={(e) => setCodigoDigitado(e.target.value)}
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {erroCodigo && <p className="form-hint form-hint--danger">{erroCodigo}</p>}
              <button className="btn-primary login-submit" type="submit" disabled={confirmandoCodigo}>
                {confirmandoCodigo ? <Loader2 size={16} className="login-robo-spin" /> : <LogIn size={16} />}
                {confirmandoCodigo ? 'Confirmando…' : 'Confirmar código'}
              </button>
              <button type="button" className="login-tab" style={{ marginTop: 4 }} onClick={voltarParaEmailCodigo}>
                Usar outro e-mail / reenviar código
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
