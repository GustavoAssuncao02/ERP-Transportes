import { useEffect, useRef, useState } from 'react';
import vexoRevealFinalUrl from '../assets/brand/animations/vexo_reveal_square_final.png';
import vexoRevealUrl from '../assets/brand/animations/vexo_reveal_square.gif';
import vexoWordmarkRevealFinalUrl from '../assets/brand/animations/vexo_wordmark_reveal_final.png';
import vexoWordmarkRevealUrl from '../assets/brand/animations/vexo_wordmark_reveal.gif';
import { auditActions, recordAuditEvent } from '../services/auditLog.js';

export default function LoginPage() {
  const [frozenAnimations, setFrozenAnimations] = useState({
    logo: false,
    wordmark: false,
  });
  const freezeTimers = useRef({
    logo: null,
    wordmark: null,
  });

  useEffect(() => {
    scheduleFreeze('logo', 3300);
    scheduleFreeze('wordmark', 2550);

    return () => {
      Object.values(freezeTimers.current).forEach((timer) => window.clearTimeout(timer));
      freezeTimers.current = {
        logo: null,
        wordmark: null,
      };
    };
  }, []);

  function scheduleFreeze(key, delay) {
    if (freezeTimers.current[key]) return;

    freezeTimers.current[key] = window.setTimeout(() => {
      setFrozenAnimations((current) => ({
        ...current,
        [key]: true,
      }));
    }, delay);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('usuario') || '').trim();

    recordAuditEvent({
      module: 'Sistema',
      action: auditActions.login,
      entityType: 'sessao',
      entityId: username || 'usuario-local',
      entityLabel: username || 'Login local',
      summary: 'Login realizado',
      metadata: {
        username,
      },
    });
    window.location.assign('/');
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-logo-area">
          <div className={`login-logo-reveal login-animation-stack ${frozenAnimations.logo ? 'is-frozen' : ''}`}>
            <img className="login-animation-frame" src={vexoRevealFinalUrl} alt="" aria-hidden="true" />
            <img
              className="login-animation-frame login-animation-frame--gif"
              src={vexoRevealUrl}
              alt="Vexo ERP Logistico"
              onLoad={() => scheduleFreeze('logo', 3300)}
            />
          </div>
          <span className="login-logo-separator" aria-hidden="true" />
          <div className={`login-wordmark-reveal login-animation-stack ${frozenAnimations.wordmark ? 'is-frozen' : ''}`}>
            <img className="login-animation-frame" src={vexoWordmarkRevealFinalUrl} alt="" aria-hidden="true" />
            <img
              className="login-animation-frame login-animation-frame--gif"
              src={vexoWordmarkRevealUrl}
              alt="Vexo"
              onLoad={() => scheduleFreeze('wordmark', 2550)}
            />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h1 id="login-title">Bem-vindo ao Vexo ERP,</h1>
          <p>Entre com suas credenciais para acessar os recursos do sistema.</p>

          <label className="login-field">
            <span>Usuario</span>
            <input type="text" name="usuario" autoComplete="username" />
          </label>

          <label className="login-field">
            <span>Senha</span>
            <input type="password" name="senha" autoComplete="current-password" />
          </label>

          <a className="forgot-password" href="/recuperar-senha">
            Esqueceu a senha?
          </a>

          <button className="login-submit" type="submit">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
