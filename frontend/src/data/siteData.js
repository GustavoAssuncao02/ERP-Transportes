export const navigationItems = [
  {
    id: 'base',
    label: 'Base',
  },
  {
    id: 'recursos',
    label: 'Recursos',
  },
  {
    id: 'operacao',
    label: 'Operacao',
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
        label: 'Consultar Lancamentos',
        pageId: 'registered-launches',
      },
      {
        id: 'contas-a-pagar',
        label: 'Contas a Pagar',
        children: [
          {
            id: 'programacao-conta-pagar',
            label: 'Programacao de Contas a Pagar',
            pageId: 'accounts-payable-schedule',
          },
          {
            id: 'cadastro-contas-pagar',
            label: 'Cadastro de Contas a Pagar',
            pageId: 'accounts-payable',
          },
          {
            id: 'relatorio-contas-pagar',
            label: 'Relatorio de Contas a Pagar',
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
    label: 'Consultar Lancamentos',
    pageId: 'registered-launches',
    icon: 'finance',
  },
  {
    id: 'quick-payable-schedule',
    label: 'Programacao de Contas a Pagar',
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
    label: 'Relatorio de Contas a Pagar',
    pageId: 'accounts-payable-report',
    icon: 'finance',
  },
];

export const quickQueryCards = Array.from({ length: 10 }, (_, index) => ({
  id: `quick-query-${index + 1}`,
  label: `Consulta rapida ${index + 1}`,
}));
