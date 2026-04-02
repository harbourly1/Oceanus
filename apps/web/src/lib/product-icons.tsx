import {
  Package, Ship, Scale, Sailboat, Waves, Zap, Container,
  type LucideIcon,
} from 'lucide-react';

export const PRODUCT_ICON_MAP: Record<string, LucideIcon> = {
  Package,
  Ship,
  Scale,
  Sailboat,
  Waves,
  Zap,
  Container,
};

export function ProductIcon({ iconKey, size = 16, className }: { iconKey?: string; size?: number; className?: string }) {
  if (!iconKey) return null;
  const Icon = PRODUCT_ICON_MAP[iconKey];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
