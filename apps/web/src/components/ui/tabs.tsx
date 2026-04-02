'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          )}
          style={{
            background: activeTab === tab.id ? 'var(--color-bg-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{
                background: activeTab === tab.id ? 'var(--color-accent-blue)' : 'var(--color-bg-hover)',
                color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
