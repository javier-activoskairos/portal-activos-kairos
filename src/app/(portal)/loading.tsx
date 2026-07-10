export default function PortalLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="bg-muted h-3 w-20 animate-pulse rounded-full" />
        <div className="bg-muted h-8 w-56 animate-pulse rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border bg-card h-24 animate-pulse rounded-[20px] border"
          />
        ))}
      </div>
      <div className="border-border bg-card h-40 animate-pulse rounded-[20px] border" />
    </div>
  );
}
