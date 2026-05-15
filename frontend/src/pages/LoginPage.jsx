import { useEffect, useRef, useState } from 'react';
import vexoRevealFinalUrl from '../assets/brand/animations/vexo_reveal_square_final.png';
import vexoRevealUrl from '../assets/brand/animations/vexo_reveal_square.gif';
import vexoWordmarkRevealFinalUrl from '../assets/brand/animations/vexo_wordmark_reveal_final.png';
import vexoWordmarkRevealUrl from '../assets/brand/animations/vexo_wordmark_reveal.gif';

export default function LoginPage() {
  const [logoSource, setLogoSource] = useState(vexoRevealUrl);
  const [wordmarkSource, setWordmarkSource] = useState(vexoWordmarkRevealUrl);
  const freezeTimers = useRef({
    logo: null,
    wordmark: null,
  });

  useEffect(() => {
    scheduleFreeze('logo', setLogoSource, vexoRevealFinalUrl, 3400);
    scheduleFreeze('wordmark', setWordmarkSource, vexoWordmarkRevealFinalUrl, 2650);

    return () => {
      Object.values(freezeTimers.current).forEach((timer) => window.clearTimeout(timer));
      freezeTimers.current = {
        logo: null,
        wordmark: null,
      };
    };
  }, []);

  function scheduleFreeze(key, setSource, finalSource, delay) {
    if (freezeTimers.current[key]) return;

    freezeTimers.current[key] = window.setTimeout(() => {
      setSource(finalSource);
    }, delay);
  }

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-logo-area">
          <img
            className="login-logo login-logo-reveal"
            src={logoSource}
            alt="Vexo ERP Logistico"
            onLoad={() => scheduleFreeze('logo', setLogoSource, vexoRevealFinalUrl, 3400)}
          />
          <img
            className="login-wordmark-reveal"
            src={wordmarkSource}
            alt="Vexo"
            onLoad={() => scheduleFreeze('wordmark', setWordmarkSource, vexoWordmarkRevealFinalUrl, 2650)}
          />
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
