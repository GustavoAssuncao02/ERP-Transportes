export default function DashboardSection({ title, children }) {
  return (
    <section className="dashboard-section" aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
      <h2 className="section-title" id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
        {title}
      </h2>
      <div className="section-divider" />
      {children}
    </section>
  );
}
