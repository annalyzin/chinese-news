interface ProcessingSpinnerProps {
  message?: string;
  detail?: string;
}

export function ProcessingSpinner({
  message = 'Processing...',
  detail,
}: ProcessingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      {/* Spinning ring */}
      <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm font-medium">{message}</p>
      {detail && (
        <p className="text-gray-400 text-xs max-w-xs text-center leading-relaxed">
          {detail}
        </p>
      )}
    </div>
  );
}
