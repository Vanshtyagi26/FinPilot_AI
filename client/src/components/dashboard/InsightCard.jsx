import './InsightCard.css';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';

const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' };
const PRIORITY_ICON = { high: AlertTriangle, medium: Bell, low: CheckCircle2 };

export default function InsightCard({ insight, onMarkRead }) {
  const Icon = PRIORITY_ICON[insight.priority] || Bell;
  return (
    <article className={`insight-card priority-${insight.priority} ${insight.read ? 'read' : ''}`}>
      <div className="insight-card-top">
        <span className="insight-priority">
          <Icon size={13} />
          {PRIORITY_LABEL[insight.priority] || insight.priority}
        </span>
        {!insight.read ? (
          <button type="button" className="insight-dismiss btn btn-ghost btn-sm" onClick={() => onMarkRead?.(insight._id)}>
            Mark read
          </button>
        ) : null}
      </div>
      <h3 className="insight-title">{insight.title}</h3>
      <p className="insight-message">{insight.message}</p>
      <span className="insight-type">{insight.insightType.replace(/_/g, ' ')}</span>
    </article>
  );
}
