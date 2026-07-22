export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title || subtitle || action ? (
        <header className="card-head">
          <div>
            {title ? <h3 className="card-title">{title}</h3> : null}
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
