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
        id: 'cadastrar-titulo-pagar',
        label: 'Cadastrar Título a pagar',
      },
      {
        id: 'relatorio-titulos-pagar',
        label: 'Relatório de títulos a pagar',
      },
      {
        id: 'baixa-titulos-pagar',
        label: 'Baixa de Títulos a pagar',
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
  {
    id: 'cancel-cte',
    label: 'Cancelar CT-e',
    active: false,
    closable: true,
  },
  {
    id: 'query-mdfe',
    label: 'Consultar MDF-e',
    active: false,
    closable: true,
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
