'use client';

import { getFormDataGroups, type FormDataGroupResult } from '@/lib/form-data-config';

interface FormDataDisplayProps {
  productType: string;
  formData: Record<string, unknown>;
  variant?: 'card' | 'compact';
}

export function FormDataDisplay({ productType, formData, variant = 'card' }: FormDataDisplayProps) {
  if (!formData || Object.keys(formData).length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
        No form data available
      </p>
    );
  }

  const groups = getFormDataGroups(productType, formData);

  if (groups.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
        No form data available
      </p>
    );
  }

  if (variant === 'compact') {
    return <CompactView groups={groups} />;
  }

  return <CardView groups={groups} />;
}

// ---------------------------------------------------------------------------
// Card variant — for Sales lead detail page (row-based layout)
// ---------------------------------------------------------------------------

function CardView({ groups }: { groups: FormDataGroupResult[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 pb-1"
            style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-default)' }}
          >
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.fields.map((f) => (
              <div key={f.label} className="flex justify-between py-1.5">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {f.label}
                </span>
                <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: 'var(--color-text-primary)' }}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant — for UW queue / in-progress pages (grid layout)
// ---------------------------------------------------------------------------

function CompactView({ groups }: { groups: FormDataGroupResult[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.title}>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {group.title}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {group.fields.map((f) => (
              <div key={f.label}>
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {f.label}
                </span>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
