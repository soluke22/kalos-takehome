function LoadingCard() {
  return <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />;
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <section className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      <section className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      <section className="grid gap-3 md:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </section>
      <section className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </main>
  );
}
