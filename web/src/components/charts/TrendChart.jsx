import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' });
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-pop">
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {monthLabel(label)}
      </p>
      <p className="font-display text-base font-semibold text-foreground">
        {formatter ? formatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
}

export function TrendChart({ data = [], dataKey, color = 'hsl(var(--primary))', formatter, height = 220 }) {
  const gradientId = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tickLine={false}
          axisLine={false}
          dy={6}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={48}
        />
        <Tooltip
          content={<CustomTooltip formatter={formatter} />}
          cursor={{ stroke: 'hsl(var(--primary) / 0.4)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))', fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
