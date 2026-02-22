export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header skeleton */}
      <div className="mb-10">
        <div className="h-8 bg-gray-200 rounded-lg w-32 mb-3 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-72 animate-pulse" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
          >
            <div className="h-44 bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="h-3 bg-gray-200 rounded-full w-16" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
              <div className="h-4 bg-gray-100 rounded w-3/5" />
              <div className="flex justify-end pt-3 border-t border-gray-50">
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
