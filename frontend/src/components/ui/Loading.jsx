export default function Loading({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
    </div>
  );
}
