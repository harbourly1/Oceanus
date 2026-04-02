import { clsx } from 'clsx';

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  className?: string;
}

export function Badge({ label, color, bg, className }: BadgeProps) {
  return (
    <span
      className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  config: { label: string; color: string; bg: string };
  className?: string;
}

export function StatusBadge({ config, className }: StatusBadgeProps) {
  return <Badge label={config.label} color={config.color} bg={config.bg} className={className} />;
}

interface WideStatusBadgeProps {
  label: string;
  color: string;
  bg: string;
}

export function WideStatusBadge({ label, color, bg }: WideStatusBadgeProps) {
  return (
    <span
      className="block w-full text-center px-3 py-1.5 rounded-md text-xs font-semibold"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}
