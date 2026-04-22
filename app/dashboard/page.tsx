import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { formatDate, round, signedDelta } from '@/lib/format';
import { logoutAction } from '@/app/dashboard/actions';
import { ScanUploadForm } from '@/app/dashboard/scan-upload-form';
import { TrendsChart } from '@/app/dashboard/trends-chart';

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function MetricMeaningCard({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-blue-700">{label}</p>
      <p className="mt-1 text-xl font-semibold text-blue-900">{value}</p>
      <p className="mt-2 text-sm text-blue-900">{explanation}</p>
    </div>
  );
}

type DeltaDirection = 'higher_is_better' | 'lower_is_better' | 'contextual';
type DeltaStatus = 'improved' | 'regressed' | 'changed' | 'stable';

function evaluateDelta(delta: number, direction: DeltaDirection): DeltaStatus {
  const absoluteDelta = Math.abs(round(delta, 1));

  if (absoluteDelta < 0.2) {
    return 'stable';
  }

  if (direction === 'contextual') {
    return 'changed';
  }

  const improved =
    (direction === 'higher_is_better' && delta > 0) || (direction === 'lower_is_better' && delta < 0);

  return improved ? 'improved' : 'regressed';
}

function ComparisonCard({
  label,
  delta,
  unit,
  direction,
}: {
  label: string;
  delta: number;
  unit: string;
  direction: DeltaDirection;
}) {
  const status = evaluateDelta(delta, direction);

  const statusLabel =
    status === 'improved'
      ? 'Improved'
      : status === 'regressed'
        ? 'Regressed'
        : status === 'changed'
          ? 'Changed'
          : 'Stable';

  const statusClass =
    status === 'improved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'regressed'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : status === 'changed'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-slate-100 text-slate-700';

  const deltaDirectionLabel = delta > 0 ? 'Up' : delta < 0 ? 'Down' : 'Flat';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {signedDelta(delta)}
        {unit}
      </p>
      <p className="mt-1 text-xs text-slate-500">{deltaDirectionLabel}</p>
    </div>
  );
}

function buildProgressNarrative({
  bodyFatDelta,
  leanMassDelta,
  weightDelta,
}: {
  bodyFatDelta: number;
  leanMassDelta: number;
  weightDelta: number;
}) {
  if (bodyFatDelta < -0.6 && leanMassDelta > 0.6) {
    return {
      headline: 'Strong recomposition trend',
      summary: 'Body fat is trending down while lean mass is trending up.',
    };
  }

  if (bodyFatDelta < 0 || leanMassDelta > 0) {
    return {
      headline: 'Positive momentum',
      summary: 'At least one key composition signal is moving in the right direction.',
    };
  }

  if (weightDelta < 0 && leanMassDelta < 0) {
    return {
      headline: 'Cut phase may be too aggressive',
      summary: 'Weight and lean mass are both down across the trend period.',
    };
  }

  return {
    headline: 'Mixed progress so far',
    summary: 'Trend direction is not yet clear enough for a confident coaching call.',
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const member = await (async () => {
    try {
      return await prisma.member.findUnique({
        where: { id: session.memberId },
        include: {
          scans: {
            orderBy: {
              scanDate: 'asc',
            },
          },
        },
      });
    } catch {
      throw new Error('Failed to load dashboard data. Please refresh and try again.');
    }
  })();

  if (!member) {
    redirect('/login');
  }

  const scans = member.scans;
  const latest = scans.at(-1);
  const previous = scans.length > 1 ? scans.at(-2) : undefined;

  const first = scans[0];
  const hasTrendData = scans.length >= 3 && !!latest && !!first;
  const trendRangeLabel = hasTrendData
    ? `${formatDate(scans[0].scanDate)} to ${formatDate(scans[scans.length - 1].scanDate)}`
    : null;

  const trendDeltas = hasTrendData
    ? {
        bodyFat: latest.bodyFatPct - first.bodyFatPct,
        leanMass: latest.leanMassLbs - first.leanMassLbs,
        weight: latest.weightLbs - first.weightLbs,
      }
    : null;

  const narrative = trendDeltas
    ? buildProgressNarrative({
        bodyFatDelta: trendDeltas.bodyFat,
        leanMassDelta: trendDeltas.leanMass,
        weightDelta: trendDeltas.weight,
      })
    : null;

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
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No scan data yet</h2>
          <p className="text-slate-600">
            Once your first scan is processed, this page will show a baseline interpretation and progress tracking.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>After scan 1: baseline interpretation</li>
            <li>After scan 2: first comparison with clear deltas</li>
            <li>After scan 3+: trend charts and multi-scan progress narrative</li>
          </ul>
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
        <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-semibold text-blue-900">Your baseline scan</h2>
          <p className="text-sm text-blue-900">
            This first scan is your starting map. The goal is to understand where you are now so the next scan can show
            meaningful change.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricMeaningCard
              label="Body Fat"
              value={`${latest.bodyFatPct}%`}
              explanation="Represents how much of your body weight is fat mass. In most recomposition plans, a gradual downtrend is a good sign."
            />
            <MetricMeaningCard
              label="Lean Mass"
              value={`${latest.leanMassLbs} lbs`}
              explanation="Tracks non-fat tissue (including muscle). During fat loss phases, keeping this stable is a key quality marker."
            />
            <MetricMeaningCard
              label="Weight"
              value={`${latest.weightLbs} lbs`}
              explanation="Weight alone is incomplete. It becomes most useful when combined with body-fat and lean-mass changes."
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-white p-4 text-sm text-blue-900">
            <p className="font-medium">What to do before your next scan</p>
            <p className="mt-1">
              Keep training and nutrition consistent for 2-6 weeks. The second scan is where your first real progress
              signal appears.
            </p>
          </div>
        </section>
      ) : null}

      {scans.length === 2 && latest && previous ? (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-semibold text-emerald-900">First progress check-in</h2>
          <p className="text-sm text-emerald-900">
            Comparing {formatDate(previous.scanDate)} to {formatDate(latest.scanDate)}. This is your first before/after
            snapshot.
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ComparisonCard
              label="Body Fat Delta"
              delta={latest.bodyFatPct - previous.bodyFatPct}
              unit="%"
              direction="lower_is_better"
            />
            <ComparisonCard
              label="Lean Mass Delta"
              delta={latest.leanMassLbs - previous.leanMassLbs}
              unit=" lbs"
              direction="higher_is_better"
            />
            <ComparisonCard
              label="Fat Mass Delta"
              delta={latest.fatMassLbs - previous.fatMassLbs}
              unit=" lbs"
              direction="lower_is_better"
            />
            <ComparisonCard
              label="Weight Delta"
              delta={latest.weightLbs - previous.weightLbs}
              unit=" lbs"
              direction="contextual"
            />
          </div>
        </section>
      ) : null}

      {scans.length >= 3 && latest && first && narrative && trendDeltas ? (
        <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-indigo-900">Trend view ({scans.length} scans)</h2>
            <p className="text-sm text-indigo-900">Range: {trendRangeLabel}.</p>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-white p-4">
            <p className="text-sm font-semibold text-indigo-900">{narrative.headline}</p>
            <p className="mt-1 text-sm text-slate-700">{narrative.summary}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <StatCard label="Since First Scan" value={`${signedDelta(trendDeltas.weight)} lbs`} helper="Weight" />
              <StatCard label="Since First Scan" value={`${signedDelta(trendDeltas.bodyFat)}%`} helper="Body Fat" />
              <StatCard
                label="Since First Scan"
                value={`${signedDelta(trendDeltas.leanMass)} lbs`}
                helper="Lean Mass"
              />
            </div>
          </div>

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
