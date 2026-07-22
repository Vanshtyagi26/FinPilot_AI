import { Link } from 'react-router-dom';
import ProgressBar from '../ui/ProgressBar';
import { formatMoney } from '../../utils/format';

export default function GoalSnapshot({ goals }) {
  const top = (goals || []).slice(0, 3);

  return (
    <div className="goal-snapshot">
      <div className="goal-snapshot-head">
        <h2>Goals</h2>
        <Link to="/goals" className="link-more">
          Manage
        </Link>
      </div>
      {!top.length ? (
        <p className="muted">No goals yet. Create one to track progress and unlock smarter alerts.</p>
      ) : (
        <ul className="goal-snapshot-list">
          {top.map((g) => (
            <li key={g._id}>
              <div className="goal-snapshot-row">
                <span className="goal-title">{g.title}</span>
                <span className="goal-amounts">
                  {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
                </span>
              </div>
              <ProgressBar value={g.currentAmount} max={g.targetAmount} tone="income" />
              <p className="goal-pace muted">{g.paceNote}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
