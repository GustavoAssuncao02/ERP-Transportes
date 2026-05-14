import vexoLogoHorizontalUrl from '../assets/vexo_logo_horizontal.svg';

export default function LoginPage() {
  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-logo-area">
          <img className="login-logo" src={vexoLogoHorizontalUrl} alt="Vexo ERP Logístico" />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h1 id="login-title">Bem-vindo ao Vexo ERP,</h1>
          <p>Entre com suas credenciais para acessar os recursos do sistema.</p>

          <label className="login-field">
            <span>Usuário</span>
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
