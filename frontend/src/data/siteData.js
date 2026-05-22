export const navigationItems = [
  {
    id: 'gestao',
    label: 'Gestão',
    children: [
      {
        id: 'unidade',
        label: 'Unidade',
        pageId: 'unit-registration',
      },
      {
        id: 'fornecedor',
        label: 'Fornecedor',
        pageId: 'supplier-registration',
      },
      {
        id: 'seguros',
        label: 'Seguros',
        pageId: 'insurance-registration',
      },
      {
        id: 'gestao-galpao',
        label: 'Gestão de Galpão',
        pageId: 'warehouse-management',
      },
      {
        id: 'cadastrar-veiculo',
        label: 'Cadastrar Veículo',
        pageId: 'vehicle-registration',
      },
      {
        id: 'cadastrar-motorista',
        label: 'Cadastrar Motorista',
        pageId: 'driver-registration',
      },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    children: [
      {
        id: 'emitir-cte',
        label: 'Emitir CT-e',
        pageId: 'issue-cte',
      },
      {
        id: 'ordem-coleta',
        label: 'Ordem de Coleta',
        pageId: 'collection-order',
      },
      {
        id: 'criar-minuta',
        label: 'Criar Minuta',
        pageId: 'create-minuta',
      },
      {
        id: 'gerar-manifesto',
        label: 'Gerar Manifesto',
        pageId: 'generate-manifest',
      },
      {
        id: 'gestao-frota',
        label: 'Gestão de Frota',
        pageId: 'fleet-management',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    children: [
      {
        id: 'tesouraria',
        label: 'Tesouraria',
        children: [
          {
            id: 'banco',
            label: 'Banco',
            pageId: 'bank-management',
          },
          {
            id: 'movimentacao',
            label: 'Movimentação',
            pageId: 'one-off-payment',
          },
        ],
      },
      {
        id: 'prestacao-conta',
        label: 'Prestacao de conta',
        pageId: 'driver-accountability',
      },
      {
        id: 'consultar-lancamentos',
        label: 'Consultar Lançamentos',
        pageId: 'registered-launches',
      },
      {
        id: 'contas-a-pagar',
        label: 'Contas a Pagar',
        children: [
          {
            id: 'programacao-conta-pagar',
            label: 'Programação de Contas a Pagar',
            pageId: 'accounts-payable-schedule',
          },
          {
            id: 'cadastro-contas-pagar',
            label: 'Cadastro de Contas a Pagar',
            pageId: 'accounts-payable',
          },
          {
            id: 'exclusao-titulos-pagar',
            label: 'Exclusão de Lançamentos a Pagar',
            pageId: 'accounts-payable-deletion',
          },
          {
            id: 'relatorio-contas-pagar',
            label: 'Relatório de Contas a Pagar',
            pageId: 'accounts-payable-report',
          },
          {
            id: 'baixa-contas-pagar',
            label: 'Baixa de Contas a Pagar',
            pageId: 'accounts-payable-settlement',
          },
        ],
      },
      {
        id: 'contas-a-receber',
        label: 'Contas a Receber',
        children: [
          {
            id: 'dashboard-contas-receber',
            label: 'Dashboard de Contas a Receber',
            pageId: 'accounts-receivable-dashboard',
          },
          {
            id: 'cadastrar-titulo-receber',
            label: 'Cadastrar Título a Receber',
            pageId: 'accounts-receivable',
          },
          {
            id: 'relatorio-contas-receber',
            label: 'Relatorio de Contas a Receber',
            pageId: 'accounts-receivable-report',
          },
          {
            id: 'baixa-titulos-receber',
            label: 'Baixa de Títulos a Receber',
            pageId: 'accounts-receivable-settlement',
          },
        ],
      },
      {
        id: 'estorno-baixa',
        label: 'Estorno de Baixa',
        pageId: 'settlement-reversal',
      },
      {
        id: 'business-intelligence',
        label: 'Business Intelligence',
        pageId: 'business-intelligence',
      },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    children: [
      {
        id: 'usuarios',
        label: 'Usuários',
        pageId: 'user-management',
      },
      {
        id: 'gerenciar-atalhos-inicio',
        label: 'Gerenciar Atalhos de Início',
        pageId: 'home-shortcuts',
      },
      {
        id: 'configuracao-galpao',
        label: 'Configuração de Galpão',
        pageId: 'warehouse-settings',
      },
      {
        id: 'ultimas-atualizacoes',
        label: 'Últimas Atualizações',
        pageId: 'system-updates',
      },
    ],
  },
];

export const companyDetails = [
  {
    id: 'company',
    icon: 'monitor',
    label: 'JTD Transportes LTDA',
  },
  {
    id: 'user',
    icon: 'user',
    label: '134 - camila.aguiar',
  },
  {
    id: 'validity',
    icon: 'calendar',
    label: 'Val. 04/06/2026',
  },
];

export const tabs = [
  {
    id: 'home',
    label: 'Tela Principal',
    active: true,
    icon: 'home',
  },
];

export const quickAccessCards = [
  {
    id: 'quick-accounts-payable',
    label: 'Cadastro de Contas a Pagar',
    pageId: 'accounts-payable',
    icon: 'finance',
  },
  {
    id: 'quick-registered-launches',
    label: 'Consultar Lançamentos',
    pageId: 'registered-launches',
    icon: 'finance',
  },
  {
    id: 'quick-payable-schedule',
    label: 'Programação de Contas a Pagar',
    pageId: 'accounts-payable-schedule',
    icon: 'finance',
  },
  {
    id: 'quick-payable-settlement',
    label: 'Baixa de Contas a Pagar',
    pageId: 'accounts-payable-settlement',
    icon: 'finance',
  },
  {
    id: 'quick-payable-report',
    label: 'Relatório de Contas a Pagar',
    pageId: 'accounts-payable-report',
    icon: 'finance',
  },
];
