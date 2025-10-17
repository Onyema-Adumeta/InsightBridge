// src/components/LoadingDashboard.tsx

export default function LoadingDashboard() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900">
      <div className="text-center text-white">
        {/* You could add an animated SVG spinner here for a nicer look */}
        <p className="animate-pulse text-xl font-medium">
          Loading your financial insights...
        </p>
      </div>
    </div>
  );
}