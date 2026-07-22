import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../utils/format';

export default function MonthlyBarChart({ monthlyTrend }) {
  const data =
    monthlyTrend?.map((m) => ({
      month: m.month,
      Income: Math.round(m.income * 100) / 100,
      Expenses: Math.round(m.expense * 100) / 100,
    })) || [];

  if (!data.length) {
    return <p className="muted chart-empty">Add transactions to see monthly income vs expenses.</p>;
  }

  return (
    <div className="chart-wrap chart-wrap-tall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ea" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend />
          <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#d97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
