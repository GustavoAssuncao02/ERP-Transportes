# Deploy no SaveInCloud

Este projeto foi ajustado para subir como uma aplicacao Node.js unica.

## Comandos do painel

- Install command: `npm install`
- Build command: opcional, `npm run build`
- Start command: `npm start`
- Health check: `/health`, `/api/health` ou `/`

O `npm install` da raiz instala `backend/`, instala `frontend/` com dependencias de build e gera `frontend/dist`.
O `npm start` inicia o Express e serve o frontend compilado junto com a API.

## Variaveis recomendadas

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
DB_ENABLED=false
```

Use `DB_ENABLED=true` apenas quando houver MySQL configurado.

## Erro de VCS do painel

`The [ jem vcs update ] operation has failed: Authentication failed or url is incorrect`

Esse erro acontece antes da aplicacao iniciar. Normalmente significa que o SaveInCloud/Jelastic nao conseguiu acessar o repositorio Git.

Confira no painel:

- URL HTTPS do repositorio, sem espacos e sem URL local.
- Repositorio publico ou credenciais/token validos se for privado.
- Branch correta.
- Permissao do token para leitura do repositorio.
- Se estiver usando GitHub privado, prefira um Personal Access Token no lugar da senha.

Depois que o VCS conseguir baixar o codigo, os scripts padrao acima cuidam da instalacao, build e start.
