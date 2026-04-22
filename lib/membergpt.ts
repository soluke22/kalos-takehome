import { type Scan } from '@prisma/client';
import { formatDate, signedDelta } from '@/lib/format';

type MemberWithScans = {
  id: string;
  name: string;
  email: string;
  goalSummary: string | null;
  scans: Scan[];
};

type CountMembersResult = {
  kind: 'count_members_with_min_scans';
  minScans: number;
  count: number;
  memberNames: string[];
};

type LeanMassLossResult = {
  kind: 'members_lost_lean_mass_last_two';
  memberNames: string[];
};

type BodyFatImprovedResult = {
  kind: 'members_improved_body_fat_last_two';
  memberNames: string[];
};

type NamedBodyFatTrendResult = {
  kind: 'named_member_body_fat_trend';
  memberName: string;
  fromDate: Date;
  toDate: Date;
  scanCount: number;
  startBodyFatPct: number;
  latestBodyFatPct: number;
  deltaBodyFatPct: number;
};

type NamedCoachingFocusResult = {
  kind: 'named_member_coaching_focus';
  memberName: string;
  focusAreas: string[];
  latestScanDate: Date;
  latestBodyFatPct: number;
  latestLeanMassLbs: number;
  latestWeightLbs: number;
};

type InsufficientDataResult = {
  kind: 'insufficient_data';
  reason: string;
};

type UnsupportedQuestionResult = {
  kind: 'unsupported_question';
};

type AnalysisResult =
  | CountMembersResult
  | LeanMassLossResult
  | BodyFatImprovedResult
  | NamedBodyFatTrendResult
  | NamedCoachingFocusResult
  | InsufficientDataResult
  | UnsupportedQuestionResult;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractNamedMember(question: string, members: MemberWithScans[]): MemberWithScans | null {
  const normalizedQuestion = normalizeText(question);

  const rankedMatches = members
    .map((member) => {
      const fullName = normalizeText(member.name);
      const firstName = fullName.split(' ')[0] ?? '';
      const fullNameMatch = normalizedQuestion.includes(fullName) ? fullName.length : 0;
      const firstNameMatch = firstName.length >= 3 && normalizedQuestion.includes(firstName) ? firstName.length : 0;
      return {
        member,
        score: Math.max(fullNameMatch, firstNameMatch),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return rankedMatches[0]?.member ?? null;
}

function parseMinScansThreshold(question: string): number | null {
  const normalized = normalizeText(question);
  const plusMatch = normalized.match(/(\d+)\s*\+\s*scans/);
  if (plusMatch) {
    return Number.parseInt(plusMatch[1] ?? '', 10);
  }

  const atLeastMatch = normalized.match(/at least\s+(\d+)\s+scans/);
  if (atLeastMatch) {
    return Number.parseInt(atLeastMatch[1] ?? '', 10);
  }

  return null;
}

function analyzeCountMembersByScanThreshold(question: string, members: MemberWithScans[]): AnalysisResult | null {
  const normalized = normalizeText(question);
  const threshold = parseMinScansThreshold(normalized);

  if (!normalized.includes('how many members') || !threshold) {
    return null;
  }

  const matchingMembers = members.filter((member) => member.scans.length >= threshold);

  return {
    kind: 'count_members_with_min_scans',
    minScans: threshold,
    count: matchingMembers.length,
    memberNames: matchingMembers.map((member) => member.name),
  };
}

function analyzeLeanMassLossLastTwo(question: string, members: MemberWithScans[]): AnalysisResult | null {
  const normalized = normalizeText(question);

  const asksLeanMassLoss =
    normalized.includes('lost lean mass') ||
    (normalized.includes('lean mass') && normalized.includes('last two'));

  if (!asksLeanMassLoss) {
    return null;
  }

  const matchingMembers = members.filter((member) => {
    if (member.scans.length < 2) {
      return false;
    }

    const latest = member.scans[member.scans.length - 1];
    const previous = member.scans[member.scans.length - 2];
    return latest.leanMassLbs < previous.leanMassLbs;
  });

  return {
    kind: 'members_lost_lean_mass_last_two',
    memberNames: matchingMembers.map((member) => member.name),
  };
}

function analyzeBodyFatImprovedLastTwo(question: string, members: MemberWithScans[]): AnalysisResult | null {
  const normalized = normalizeText(question);

  const asksBodyFatImprovement =
    normalized.includes('body fat') &&
    (normalized.includes('improved') ||
      normalized.includes('lower') ||
      normalized.includes('decrease') ||
      normalized.includes('down') ||
      normalized.includes('reduced'));

  if (!asksBodyFatImprovement) {
    return null;
  }

  const matchingMembers = members.filter((member) => {
    if (member.scans.length < 2) {
      return false;
    }

    const latest = member.scans[member.scans.length - 1];
    const previous = member.scans[member.scans.length - 2];
    return latest.bodyFatPct < previous.bodyFatPct;
  });

  return {
    kind: 'members_improved_body_fat_last_two',
    memberNames: matchingMembers.map((member) => member.name),
  };
}

function analyzeNamedBodyFatTrend(question: string, members: MemberWithScans[]): AnalysisResult | null {
  const normalized = normalizeText(question);
  const asksBodyFatTrend =
    normalized.includes('body fat') &&
    (normalized.includes('trend') || normalized.includes('trended') || normalized.includes('over the last 6 months'));

  if (!asksBodyFatTrend) {
    return null;
  }

  const member = extractNamedMember(question, members);
  if (!member) {
    return {
      kind: 'insufficient_data',
      reason: 'I cannot identify which member you mean from the question text.',
    };
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const scansInWindow = member.scans.filter((scan) => scan.scanDate >= sixMonthsAgo);

  if (scansInWindow.length < 2) {
    return {
      kind: 'insufficient_data',
      reason: `I do not have at least two scans for ${member.name} in the last 6 months, so I cannot compute a trend.`,
    };
  }

  const first = scansInWindow[0];
  const latest = scansInWindow[scansInWindow.length - 1];

  return {
    kind: 'named_member_body_fat_trend',
    memberName: member.name,
    fromDate: first.scanDate,
    toDate: latest.scanDate,
    scanCount: scansInWindow.length,
    startBodyFatPct: first.bodyFatPct,
    latestBodyFatPct: latest.bodyFatPct,
    deltaBodyFatPct: latest.bodyFatPct - first.bodyFatPct,
  };
}

function analyzeNamedCoachingFocus(question: string, members: MemberWithScans[]): AnalysisResult | null {
  const normalized = normalizeText(question);

  const asksCoachingFocus =
    normalized.includes('focus on') ||
    normalized.includes('next coaching session') ||
    normalized.includes('coaching session') ||
    (normalized.includes('summary') && normalized.includes('progress')) ||
    (normalized.includes('how is') && normalized.includes('doing'));

  if (!asksCoachingFocus) {
    return null;
  }

  const member = extractNamedMember(question, members);
  if (!member) {
    return {
      kind: 'insufficient_data',
      reason: 'I cannot identify which member you want coaching focus for.',
    };
  }

  const latest = member.scans[member.scans.length - 1];
  if (!latest) {
    return {
      kind: 'insufficient_data',
      reason: `I do not have scan data for ${member.name}.`,
    };
  }

  const previous = member.scans.length > 1 ? member.scans[member.scans.length - 2] : null;

  if (!previous) {
    return {
      kind: 'insufficient_data',
      reason: `I only have one scan for ${member.name}, so I cannot infer focus from change over time.`,
    };
  }

  const focusAreas: string[] = [];

  const leanMassDelta = latest.leanMassLbs - previous.leanMassLbs;
  const bodyFatDelta = latest.bodyFatPct - previous.bodyFatPct;
  const weightDelta = latest.weightLbs - previous.weightLbs;

  if (leanMassDelta < 0) {
    focusAreas.push(
      `Lean mass declined by ${Math.abs(leanMassDelta).toFixed(1)} lbs; prioritize muscle retention inputs (protein target and progressive resistance consistency).`,
    );
  }

  if (bodyFatDelta > 0) {
    focusAreas.push(
      `Body fat increased by ${bodyFatDelta.toFixed(1)}%; review nutrition adherence and recovery quality to control fat gain.`,
    );
  }

  if (weightDelta < 0 && leanMassDelta < 0) {
    focusAreas.push(
      'Weight and lean mass both decreased; assess whether energy intake is too aggressive for current training load.',
    );
  }

  if (focusAreas.length === 0) {
    focusAreas.push(
      'Recent scan deltas are neutral-to-positive; focus on sustaining current plan and setting a specific next milestone.',
    );
  }

  return {
    kind: 'named_member_coaching_focus',
    memberName: member.name,
    focusAreas,
    latestScanDate: latest.scanDate,
    latestBodyFatPct: latest.bodyFatPct,
    latestLeanMassLbs: latest.leanMassLbs,
    latestWeightLbs: latest.weightLbs,
  };
}

export function analyzeCoachQuestion(question: string, members: MemberWithScans[]): AnalysisResult {
  const analyzers = [
    analyzeCountMembersByScanThreshold,
    analyzeLeanMassLossLastTwo,
    analyzeBodyFatImprovedLastTwo,
    analyzeNamedBodyFatTrend,
    analyzeNamedCoachingFocus,
  ];

  for (const analyzer of analyzers) {
    const result = analyzer(question, members);
    if (result) {
      return result;
    }
  }

  return { kind: 'unsupported_question' };
}

export function summarizeAnalysisResult(result: AnalysisResult): string {
  if (result.kind === 'count_members_with_min_scans') {
    const names = result.memberNames.length > 0 ? result.memberNames.join(', ') : 'none';
    return `Members with ${result.minScans}+ scans: ${result.count}. Matching members: ${names}.`;
  }

  if (result.kind === 'members_lost_lean_mass_last_two') {
    if (result.memberNames.length === 0) {
      return 'No members in the database have lost lean mass between their last two scans.';
    }

    return `Members who lost lean mass between their last two scans: ${result.memberNames.join(', ')}.`;
  }

  if (result.kind === 'members_improved_body_fat_last_two') {
    if (result.memberNames.length === 0) {
      return 'No members in the database improved body fat percentage between their last two scans.';
    }

    return `Members who improved body fat percentage between their last two scans: ${result.memberNames.join(', ')}.`;
  }

  if (result.kind === 'named_member_body_fat_trend') {
    return [
      `${result.memberName} body fat trend over the last 6 months:`,
      `${result.startBodyFatPct}% on ${formatDate(result.fromDate)} to ${result.latestBodyFatPct}% on ${formatDate(result.toDate)} (${result.scanCount} scans).`,
      `Net change: ${signedDelta(result.deltaBodyFatPct)}%.`,
    ].join(' ');
  }

  if (result.kind === 'named_member_coaching_focus') {
    return [
      `Coaching focus for ${result.memberName} (latest scan ${formatDate(result.latestScanDate)}):`,
      ...result.focusAreas.map((item, index) => `${index + 1}. ${item}`),
      `Latest metrics: weight ${result.latestWeightLbs} lbs, body fat ${result.latestBodyFatPct}%, lean mass ${result.latestLeanMassLbs} lbs.`,
    ].join(' ');
  }

  if (result.kind === 'insufficient_data') {
    return `I cannot answer that from the available database data: ${result.reason}`;
  }

  return 'I cannot answer that from the current database-only retrieval rules. I can currently answer: member scan-count totals, lean-mass-loss cohort checks, body-fat-improvement cohort checks, named-member body-fat trends over the last 6 months, and named-member coaching summary/focus from last-two-scan deltas.';
}

export function answerCoachQuestion(question: string, members: MemberWithScans[]): string {
  const analysis = analyzeCoachQuestion(question, members);
  return summarizeAnalysisResult(analysis);
}
