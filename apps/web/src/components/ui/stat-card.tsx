interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: string;
}

export function StatCard({ label, value, icon, trend, color = 'var(--color-accent-blue)' }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        {icon && <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs" style={{ color: trend.positive ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>vs last month</span>
        </div>
      )}
    </div>
  );
}
