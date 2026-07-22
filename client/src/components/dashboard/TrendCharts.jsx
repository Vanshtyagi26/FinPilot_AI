import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '../../utils/format';

export default function TrendCharts({ monthlyTrend, weeklyTrend }) {
  const [tab, setTab] = useState('monthly');

  const monthlyData =
    monthlyTrend?.map((m) => ({
      label: m.month,
      Income: m.income,
      Expenses: m.expense,
      Net: m.net,
    })) || [];

  const weeklyData =
    weeklyTrend?.map((w) => ({
      label: w.weekStart,
      Income: w.income,
      Expenses: w.expense,
      Net: w.net,
    })) || [];

  const data = tab === 'monthly' ? monthlyData : weeklyData;
  const empty = !data.length;

  return (
    <div>
      <div className="chart-tabs" role="tablist">
        <button type="button" className={tab === 'monthly' ? 'chart-tab active' : 'chart-tab'} onClick={() => setTab('monthly')}>
          Monthly trends
        </button>
        <button type="button" className={tab === 'weekly' ? 'chart-tab active' : 'chart-tab'} onClick={() => setTab('weekly')}>
          Weekly trends
        </button>
      </div>
      {empty ? (
        <p className="muted chart-empty">Add more transactions to see {tab} trends.</p>
      ) : (
        <div className="chart-wrap chart-wrap-tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ea" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="Income" stroke="#059669" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#d97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net" stroke="#0d9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
