export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-4 bg-gray-100 rounded w-72 mb-1.5 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
          >
            <div className="h-40 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
