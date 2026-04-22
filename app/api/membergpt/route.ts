import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { memberGptQuestionSchema } from '@/lib/validation';
import { answerCoachQuestion } from '@/lib/membergpt';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = memberGptQuestionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  const members = await prisma.member.findMany({
    include: {
      scans: {
        orderBy: {
          scanDate: 'asc',
        },
      },
    },
  });

  const answer = answerCoachQuestion(parsed.data.question, members);

  return NextResponse.json({ answer });
}

