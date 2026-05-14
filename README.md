# ERP Transportes

Projeto separado em frontend React e backend Node.js com MySQL.

## Estrutura

- `frontend/`: aplicação React com Vite.
- `frontend/src/pages/`: telas principais da aplicação, como dashboard e login.
- `frontend/src/components/`: componentes reutilizáveis de interface.
- `frontend/src/assets/brand/`: logos e assets da marca Vexo.
- `frontend/src/assets/icons/modules/`: ícones dos módulos do sistema.
- `backend/`: API Node.js/Express preparada para MySQL.
- `backend/database/schema.sql`: script inicial para executar no MySQL Workbench.
- `site.html`: referência original da primeira tela.

## Comandos

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run db:test
```

Antes de iniciar o backend, crie um `backend/.env` com base em `backend/.env.example`.
