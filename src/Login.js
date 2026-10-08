import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login, setToken } from './api';
import LogoJAV from './LogoJAV';

function MiniWindow({ className, cells = 4 }) {
  return (
    <div className={`login-window ${className}`}>
      <div className="login-window-titlebar">
        <span className="login-window-dot" />
        <span className="login-window-dot" />
        <span className="login-window-dot" />
      </div>
      <div className="login-window-body">
        <span className="login-window-headline" />
        <div className="login-window-grid">
          {Array.from({ length: cells }).map((_, i) => (
            <span key={i} className="login-window-cell" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(username.trim(), password);
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split">
      <div className="login-split-left">
        <div className="login-split-decor" aria-hidden="true">
          <MiniWindow className="login-window-a" cells={4} />
          <MiniWindow className="login-window-b" cells={2} />
          <MiniWindow className="login-window-c" cells={6} />
        </div>
        <div className="login-split-brand">
          <h1>Checagem Manual</h1>
          <p>Registro diário de rondas e checagens de infraestrutura.</p>
        </div>
      </div>

      <div className="login-split-right">
        <div className="login-split-card">
          <LogoJAV tamanho={90} />

          <h2 className="login-split-title">Bem-vindo!</h2>
          <p className="login-split-subtitle">Acesse sua conta para continuar.</p>

          <form className="login-form-v2" onSubmit={handleSubmit}>
            <label htmlFor="username">Usuário</label>
            <div className="login-input-wrap">
              <User size={18} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoFocus
                required
              />
            </div>

            <label htmlFor="password">Senha</label>
            <div className="login-input-wrap">
              <Lock size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                'ENTRANDO...'
              ) : (
                <>
                  Acessar sistema <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-split-footer">
            <p>• J.A.V. Dev • © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
