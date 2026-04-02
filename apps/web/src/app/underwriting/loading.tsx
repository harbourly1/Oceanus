export default function UnderwritingLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3"
        style={{ borderColor: 'var(--color-accent-blue)', borderTopColor: 'transparent' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
    </div>
  );
}
