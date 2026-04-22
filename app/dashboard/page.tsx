import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { formatDate, signedDelta } from '@/lib/format';
import { logoutAction } from '@/app/dashboard/actions';
import { ScanUploadForm } from '@/app/dashboard/scan-upload-form';
import { TrendsChart } from '@/app/dashboard/trends-chart';

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    include: {
      scans: {
        orderBy: {
          scanDate: 'asc',
        },
      },
    },
  });

  if (!member) {
    redirect('/login');
  }

  const scans = member.scans;
  const latest = scans.at(-1);
  const previous = scans.length > 1 ? scans.at(-2) : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Member Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-900">{member.name}</h1>
          <p className="text-sm text-slate-600">{member.goalSummary}</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/membergpt"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Open MemberGPT
          </a>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <ScanUploadForm />

      {!latest ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No scan data yet</h2>
          <p className="mt-2 text-slate-600">
            Your dashboard will populate after your first scan is processed.
          </p>
        </section>
      ) : null}

      {latest ? (
        <section className="grid gap-3 md:grid-cols-4">
          <StatCard label="Latest Weight" value={`${latest.weightLbs} lbs`} />
          <StatCard label="Latest Body Fat" value={`${latest.bodyFatPct}%`} />
          <StatCard label="Latest Lean Mass" value={`${latest.leanMassLbs} lbs`} />
          <StatCard label="Latest Scan Date" value={formatDate(latest.scanDate)} />
        </section>
      ) : null}

      {scans.length === 1 && latest ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-semibold text-blue-900">Baseline scan education</h2>
          <p className="mt-2 text-sm text-blue-900">
            This is your first scan, so we focus on baseline interpretation instead of charts.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-900">
            <li>Body fat gives context about current composition and starting point.</li>
            <li>Lean mass helps track muscle retention while nutrition/training changes.</li>
            <li>One scan is not a trend; future scans will unlock comparison and trend views.</li>
          </ul>
        </section>
      ) : null}

      {scans.length === 2 && latest && previous ? (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-semibold text-emerald-900">Two-scan comparison</h2>
          <p className="text-sm text-emerald-900">
            Comparing {formatDate(previous.scanDate)} to {formatDate(latest.scanDate)}.
          </p>

          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Weight Delta" value={`${signedDelta(latest.weightLbs - previous.weightLbs)} lbs`} />
            <StatCard label="Body Fat Delta" value={`${signedDelta(latest.bodyFatPct - previous.bodyFatPct)}%`} />
            <StatCard
              label="Lean Mass Delta"
              value={`${signedDelta(latest.leanMassLbs - previous.leanMassLbs)} lbs`}
            />
            <StatCard label="Fat Mass Delta" value={`${signedDelta(latest.fatMassLbs - previous.fatMassLbs)} lbs`} />
          </div>
        </section>
      ) : null}

      {scans.length >= 3 ? (
        <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="text-xl font-semibold text-indigo-900">Trend view (3+ scans)</h2>
          <p className="text-sm text-indigo-900">
            Trend chart across {scans.length} scans from {formatDate(scans[0].scanDate)} to{' '}
            {formatDate(scans[scans.length - 1].scanDate)}.
          </p>

          <TrendsChart
            data={scans.map((scan) => ({
              label: formatDate(scan.scanDate),
              weightLbs: scan.weightLbs,
              bodyFatPct: scan.bodyFatPct,
              leanMassLbs: scan.leanMassLbs,
            }))}
          />
        </section>
      ) : null}
    </main>
  );
}

