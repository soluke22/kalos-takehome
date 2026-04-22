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
    <div className="h-80 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 10, left: -10, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 12 }} tickMargin={8} />
          <YAxis yAxisId="lbs" tick={{ fill: '#334155', fontSize: 12 }} width={48} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fill: '#334155', fontSize: 12 }} width={40} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue = Number(value);
              const seriesName = typeof name === 'string' ? name : 'Metric';
              const suffix = seriesName.toLowerCase().includes('body fat') ? '%' : ' lbs';
              return [`${numericValue.toFixed(1)}${suffix}`, seriesName];
            }}
          />
          <Legend verticalAlign="top" height={28} iconType="circle" />
          <Line
            yAxisId="lbs"
            type="monotone"
            dataKey="weightLbs"
            stroke="#1d4ed8"
            strokeWidth={2}
            name="Weight"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="bodyFatPct"
            stroke="#dc2626"
            strokeWidth={2}
            name="Body Fat"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="lbs"
            type="monotone"
            dataKey="leanMassLbs"
            stroke="#059669"
            strokeWidth={2}
            name="Lean Mass"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
