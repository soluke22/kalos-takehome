'use client';

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

type TrendPoint = {
  label: string;
  weightLbs: number;
  bodyFatPct: number;
  leanMassLbs: number;
};

export function TrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 12 }} />
          <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weightLbs" stroke="#1d4ed8" strokeWidth={2} name="Weight (lbs)" />
          <Line type="monotone" dataKey="bodyFatPct" stroke="#dc2626" strokeWidth={2} name="Body Fat (%)" />
          <Line type="monotone" dataKey="leanMassLbs" stroke="#059669" strokeWidth={2} name="Lean Mass (lbs)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

