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
    label: 'Operação',
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
        id: 'cadastro-contas-pagar',
        label: 'Cadastro de Contas a Pagar',
        pageId: 'accounts-payable',
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
      {
        id: 'business-intelligence',
        label: 'Business Intelligence',
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

export const quickAccessCards = Array.from({ length: 5 }, (_, index) => ({
  id: `quick-access-${index + 1}`,
  label: `Acesso rápido ${index + 1}`,
}));

export const quickQueryCards = Array.from({ length: 10 }, (_, index) => ({
  id: `quick-query-${index + 1}`,
  label: `Consulta rápida ${index + 1}`,
}));
