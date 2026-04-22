'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-8">
      <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-semibold text-rose-900">Unable to load dashboard</h1>
        <p className="text-sm text-rose-900">
          {error.message || 'Something went wrong while loading your latest scan data.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
