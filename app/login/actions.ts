'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid credentials.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      role: true,
      memberId: true,
      passwordHash: true,
    },
  });

  if (!user || !user.memberId || user.role !== 'member') {
    return { error: 'Member account not found.' };
  }

  const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!matches) {
    return { error: 'Incorrect email or password.' };
  }

  await createSession({
    userId: user.id,
    memberId: user.memberId,
    email: user.email,
    role: user.role,
  });

  redirect('/dashboard');
}

