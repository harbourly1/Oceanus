'use client';

import { useState } from 'react';
import { useUwQueue, useStartUwReview, useProductConfigMap } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { FormDataDisplay } from '@/components/ui/form-data-display';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

function parseJson(str: string | null | undefined) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function LeadDataPanel({ lead, productConfigMap }: { lead: any; productConfigMap: Record<string, { label: string; iconKey: string }> }) {
  if (!lead) return <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No lead data available</p>;

  const formData = parseJson(lead.formData);
  const selectedQuote = parseJson(lead.selectedQuote);
  const quotesData = parseJson(lead.quotesData);
  const productLabel = productConfigMap[lead.productType]?.label || lead.productType;

  return (
    <div className="space-y-3">
      {/* Customer Info */}
      <div>
        <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Customer Information</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['Name', lead.fullName],
            ['Email', lead.email],
            ['Phone', lead.phone],
            ['Company', lead.company],
            ['Product', productLabel],
            ['Currency', lead.currency],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string}>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form Data */}
      {formData && Object.keys(formData).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Submission Form Data</h4>
          <FormDataDisplay productType={lead.productType} formData={formData} variant="compact" />
        </div>
      )}

      {/* Selected Quote */}
      {selectedQuote && (
        <div>
          <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Selected Quote</h4>
          <div className="p-3 rounded-lg" style={{ border: '2px solid var(--color-accent-green, #22c55e)', background: 'rgba(34,197,94,0.04)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {selectedQuote.insurer && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Insurer</span>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedQuote.insurer}</p>
                </div>
              )}
              {selectedQuote.premium != null && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Premium</span>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-accent-green, #22c55e)' }}>
                    {lead.currency || 'AED'} {Number(selectedQuote.premium).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedQuote.rate != null && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Rate</span>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{(selectedQuote.rate * 100).toFixed(3)}%</p>
                </div>
              )}
              {selectedQuote.score != null && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Score</span>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedQuote.score}</p>
                </div>
              )}
            </div>
            {selectedQuote.inclusions && selectedQuote.inclusions.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Inclusions</span>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedQuote.inclusions.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Quotes */}
      {quotesData && quotesData.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>All Quotes ({quotesData.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quotesData.map((q: any, i: number) => {
              const isSelected = selectedQuote && q.insurer === selectedQuote.insurer;
              return (
                <div key={i} className="p-2 rounded-lg text-xs" style={{
                  border: isSelected ? '2px solid var(--color-accent-green, #22c55e)' : '1px solid var(--color-border-default)',
                  background: isSelected ? 'rgba(34,197,94,0.04)' : 'transparent',
                }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{q.insurer}</span>
                    <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {lead.currency || 'AED'} {Number(q.premium || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UwQueuePage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useUwQueue({ page: String(page), limit: '20', status: 'QUEUED' });
  const startReview = useStartUwReview();
  const productConfigMap = useProductConfigMap();

  const handleStart = async (id: string) => {
    try {
      await startReview.mutateAsync(id);
      refetch();
    } catch { /* handled */ }
  };

  if (isLoading) return <LoadingState message="Loading UW queue..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const items = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Underwriter Queue</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Assignments waiting to be started</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Queue is empty" message="No assignments waiting" icon={<ClipboardList size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Type', 'Customer', 'Policy/Endorsement', 'Product', 'Assigned To', 'Assigned Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const isPolicy = !!item.policy;
                  const customerName = isPolicy
                    ? item.policy?.customerId?.customerName
                    : item.endorsement?.customerId?.customerName;
                  const customerId = isPolicy
                    ? item.policy?.customerId?.id
                    : item.endorsement?.customerId?.id;
                  const ref = isPolicy ? item.policy?.ref : item.endorsement?.ref;
                  const product = isPolicy ? item.policy?.product : item.endorsement?.policy?.product;
                  const lead = isPolicy
                    ? item.policy?.customerId?.lead
                    : item.endorsement?.customerId?.lead;
                  const isExpanded = expandedId === item.id;

                  return (
                    <>
                      <tr key={item.id} style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border-default)' }}>
                        <td className="px-4 py-3">
                          <Badge
                            label={isPolicy ? 'Policy Issuance' : `${item.endorsement?.type || 'Endorsement'}`}
                            color={isPolicy ? 'var(--color-accent-blue)' : 'var(--color-accent-purple)'}
                            bg={isPolicy ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/customers/${customerId}`} className="text-xs hover:underline"
                            style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                            {customerName || '-'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{ref || '-'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{product || '-'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.underwriter?.name || '-'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary"
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                              {isExpanded ? 'Hide' : 'Details'}
                            </Button>
                            <Button size="sm" onClick={() => handleStart(item.id)} loading={startReview.isPending}>
                              Start Review
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${item.id}-details`} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                          <td colSpan={7} className="px-4 py-4" style={{ background: 'var(--color-bg-secondary)' }}>
                            <LeadDataPanel lead={lead} productConfigMap={productConfigMap} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
