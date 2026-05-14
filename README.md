# ERP Transportes

Projeto separado em frontend React e backend Node.js com MySQL.

## Estrutura

- `frontend/`: aplicação React com Vite.
- `backend/`: API Node.js/Express preparada para MySQL.
- `backend/database/schema.sql`: script inicial para executar no MySQL Workbench.
- `site.html`: referência original da tela.

## Comandos

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run db:test
```

Antes de iniciar o backend, crie um `backend/.env` com base em `backend/.env.example`.
