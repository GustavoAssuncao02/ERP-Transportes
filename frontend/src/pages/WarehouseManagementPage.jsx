export default function WarehouseManagementPage() {
  return (
    <section className="warehouse-management-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gestão de Galpão</h1>
          <p className="page-kicker">Controle operacional dos galpões e áreas de armazenagem</p>
        </div>
      </header>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="warehouse-management-title">
        <div className="registered-launches-header">
          <h2 id="warehouse-management-title">Galpões cadastrados</h2>
          <div>
            <span>0 galpão(ões)</span>
          </div>
        </div>

        <div className="empty-list">Nenhum galpão cadastrado</div>
      </section>
    </section>
  );
}
