# Deploy no SaveInCloud

Este projeto foi ajustado para subir como uma aplicacao Node.js unica.

## Comandos do painel

- Install command: `npm install`
- Build command: opcional, `npm run build`
- Start command: `npm start`
- Health check: `/health`, `/api/health` ou `/`

O `npm install` da raiz instala `backend/`, instala `frontend/` com dependencias de build e gera `frontend/dist`.
O `npm start` inicia o Express e serve o frontend compilado junto com a API.

Se o painel estiver apontando para a pasta `backend/`, tambem funciona: o `postinstall` do backend tenta gerar `../frontend/dist` automaticamente.

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

## Raiz retornando 404

Se `https://seu-ambiente/` retornar 404, o backend subiu sem encontrar `frontend/dist/index.html`.

Confira:

- O repositorio enviado contem as pastas `backend/` e `frontend/`.
- O comando de instalacao rodou com scripts habilitados, sem `--ignore-scripts`.
- O log do deploy mostra `vite build` gerando `frontend/dist`.
- O start command esta como `npm start` na raiz ou `npm start` dentro de `backend/`.
