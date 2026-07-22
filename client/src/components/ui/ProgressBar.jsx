import './ProgressBar.css';

export default function ProgressBar({ value, max = 100, label, tone = 'default' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 1000) / 10) : 0;
  return (
    <div className={`progress-bar-wrap tone-${tone}`}>
      {label ? <div className="progress-bar-label">{label}</div> : null}
      <div className="progress-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-bar-meta">{pct}%</div>
    </div>
  );
}
