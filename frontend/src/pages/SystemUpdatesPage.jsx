const systemUpdates = [
  {
    id: '2026-05-18-navigation',
    date: '18/05/2026',
    title: 'Navegação e tela inicial',
    items: [
      'Nova tela para gerenciar os atalhos do Acesso rápido.',
      'Menu Sistema com acesso a atalhos e últimas atualizações.',
      'Botão para fechar todas as abas abertas de uma vez.',
      'Barra horizontal na área de abas para navegar quando houver muitas telas abertas.',
    ],
  },
  {
    id: '2026-05-18-operation',
    date: '18/05/2026',
    title: 'Operação fiscal',
    items: [
      'Emissão de CT-e com validação de veículo, motorista e documentos fiscais.',
      'Ordem de Coleta com pesquisa de remetente, destinatário, motorista e veículo.',
      'Gerar Manifesto com número pesquisável e anexação de CT-e ao final do formulário.',
    ],
  },
  {
    id: '2026-05-18-management',
    date: '18/05/2026',
    title: 'Gestão cadastral',
    items: [
      'Cadastros de Unidade, Fornecedor, Veículo e Motorista no menu Gestão.',
      'Pesquisa por lupa nos principais campos cadastrais.',
      'CNAE de Unidade salvo no sistema e atualizado periodicamente.',
    ],
  },
];

export default function SystemUpdatesPage() {
  return (
    <section className="system-updates-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Últimas Atualizações</h1>
          <p className="page-kicker">Histórico de melhorias e ajustes recentes do sistema</p>
        </div>
      </header>

      <section className="registered-launches-panel updates-panel" aria-labelledby="updates-title">
        <div className="registered-launches-header">
          <h2 id="updates-title">Atualizações do sistema</h2>
          <div>
            <span>{systemUpdates.length} publicação(ões)</span>
          </div>
        </div>

        <div className="updates-list">
          {systemUpdates.map((update) => (
            <article className="update-entry" key={update.id}>
              <time dateTime={update.date.split('/').reverse().join('-')}>{update.date}</time>
              <div>
                <h3>{update.title}</h3>
                <ul>
                  {update.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
