import ProgressBar from '../ui/ProgressBar';

export default function SavingsRatioPanel({ ratioFraction, label = 'Savings rate (last 90 days)' }) {
  if (ratioFraction == null) {
    return (
      <div className="savings-ratio-panel">
        <h3>{label}</h3>
        <p className="muted">Log income in the last 90 days to compute your savings rate.</p>
      </div>
    );
  }

  const pctDisplay = Math.round(ratioFraction * 1000) / 10;
  const clampedForBar = Math.max(0, Math.min(100, ratioFraction * 100));

  return (
    <div className="savings-ratio-panel">
      <h3>{label}</h3>
      <p className="savings-ratio-value">{pctDisplay}% of income saved</p>
      <ProgressBar value={clampedForBar} max={100} tone="income" />
      <p className="muted savings-ratio-hint">Aim for at least 20% as a healthy default target.</p>
    </div>
  );
}
