'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, FileText, Shield, Loader2 } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/use-api';

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useGlobalSearch(debouncedQuery);

  const leads = data?.leads || [];
  const customers = data?.customers || [];
  const policies = data?.policies || [];
  const hasResults = leads.length > 0 || customers.length > 0 || policies.length > 0;
  const showDropdown = isOpen && debouncedQuery.length >= 2;

  // Outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useCallback((path: string) => {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    router.push(path);
  }, [router]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { if (debouncedQuery.length >= 2) setIsOpen(true); }}
          placeholder="Search leads, customers, policies..."
          className="w-full pl-9 pr-16 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: 'var(--color-bg-input, var(--color-bg-hover))',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); } }}
        />
        {!query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-default)' }}>
            Ctrl+K
          </span>
        )}
        {isLoading && query && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
            style={{ color: 'var(--color-text-muted)' }} />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
          <div className="max-h-80 overflow-y-auto">
            {isLoading && !hasResults && (
              <div className="px-4 py-6 text-center">
                <Loader2 size={16} className="animate-spin mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Searching...</span>
              </div>
            )}

            {!isLoading && !hasResults && (
              <div className="px-4 py-6 text-center">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No results found</span>
              </div>
            )}

            {/* Leads */}
            {leads.length > 0 && (
              <div>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'var(--color-bg-hover)' }}>
                  <Users size={12} style={{ color: 'var(--color-accent-amber)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Leads
                  </span>
                </div>
                {leads.map((lead: any) => (
                  <button key={lead.id}
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Lead</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{lead.ref}</span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text-secondary)' }}>{lead.fullName}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{lead.status}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Customers */}
            {customers.length > 0 && (
              <div>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'var(--color-bg-hover)' }}>
                  <Users size={12} style={{ color: 'var(--color-accent-blue)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Customers
                  </span>
                </div>
                {customers.map((cust: any) => (
                  <button key={cust.id}
                    onClick={() => navigate(`/customers/${cust.id}`)}
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>Customer</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{cust.ref}</span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text-secondary)' }}>{cust.customerName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Policies */}
            {policies.length > 0 && (
              <div>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'var(--color-bg-hover)' }}>
                  <Shield size={12} style={{ color: 'var(--color-accent-green)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Policies
                  </span>
                </div>
                {policies.map((pol: any) => (
                  <button key={pol.id}
                    onClick={() => navigate(`/customers/${pol.customerId?.id}`)}
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Policy</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {pol.policyNumber || pol.ref}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {pol.customerId?.customerName || pol.insurer || '-'}
                    </span>
                    {pol.product && (
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pol.product}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
