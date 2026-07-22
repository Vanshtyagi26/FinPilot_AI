import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../../utils/format';

const COLORS = ['#0d9488', '#059669', '#d97706', '#ea580c', '#7c3aed', '#2563eb', '#64748b', '#db2777'];

export default function CategoryExpenseChart({ rows }) {
  if (!rows?.length) {
    return <p className="muted chart-empty">No expense categories in the last 90 days.</p>;
  }

  const data = rows.slice(0, 8).map((r) => ({ name: r.category, value: r.amount }));

  return (
    <div className="chart-wrap chart-wrap-pie">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatMoney(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
