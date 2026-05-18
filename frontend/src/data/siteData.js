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
    id: 'recursos',
    label: 'Recursos',
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
        id: 'gerar-manifesto',
        label: 'Gerar Manifesto',
        pageId: 'generate-manifest',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    children: [
      {
        id: 'pagamento-avulso',
        label: 'Pagamento Avulso',
        pageId: 'one-off-payment',
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
            label: 'Exclusão de Títulos a Pagar',
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
    id: 'fiscal',
    label: 'Fiscal',
  },
  {
    id: 'sistema',
    label: 'Sistema',
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

export const quickQueryCards = Array.from({ length: 10 }, (_, index) => ({
  id: `quick-query-${index + 1}`,
  label: `Consulta rápida ${index + 1}`,
}));
