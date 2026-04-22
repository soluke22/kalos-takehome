'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clearSession, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadScanFormSchema } from '@/lib/validation';
import { parseUploadedScanFile } from '@/lib/scan-upload-parser';

export type UploadFormState = {
  message?: string;
  error?: string;
};

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}

function gramsToLbs(grams: number): number {
  return Math.round((grams * 0.00220462) * 1000) / 1000;
}

export async function uploadScanAction(
  _previousState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Your session expired. Please sign in again.' };
  }

  const scanDate = formData.get('scanDate');
  const notes = formData.get('notes');
  const file = formData.get('scanFile');

  const fileName = file instanceof File ? file.name : '';

  const parsedForm = uploadScanFormSchema.safeParse({
    scanDate,
    notes,
    fileName,
  });

  if (!parsedForm.success) {
    return {
      error: parsedForm.error.issues[0]?.message ?? 'Upload request is invalid.',
    };
  }

  if (!(file instanceof File)) {
    return {
      error: 'Please select a file to upload.',
    };
  }

  const parseResult = await parseUploadedScanFile(file);

  if (parseResult.status === 'unsupported_format') {
    return {
      error: parseResult.message,
    };
  }

  if (parseResult.status === 'invalid_values') {
    return {
      error: `The file was read, but extracted values were invalid. ${parseResult.message}`,
    };
  }

  if (parseResult.status === 'parse_failure') {
    return {
      error: `Upload received for ${parsedForm.data.fileName}, but parsing failed. ${parseResult.message}`,
    };
  }

  const extracted = parseResult.parsed;

  try {
    const existingScan = await prisma.scan.findFirst({
      where: {
        memberId: session.memberId,
        scanDate: extracted.scanDate,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: { id: true },
    });

    const scanPayload = {
      scanDate: extracted.scanDate,
      weightLbs: extracted.weightLbs,
      bodyFatPct: extracted.bodyFatPct,
      fatMassLbs: extracted.fatMassLbs,
      leanMassLbs: extracted.leanMassLbs,
      visceralFatLbs: gramsToLbs(extracted.visceralFatGrams),
      visceralFatGrams: extracted.visceralFatGrams,
      bmi: extracted.bmi,
      androidGynoidRatio: extracted.androidGynoidRatio,
      leanHeightIndex: extracted.leanHeightIndex,
      appendicularLeanHeightIndex: extracted.appendicularLeanHeightIndex,
      sourceFileName: extracted.sourceFileName,
    };

    if (existingScan) {
      await prisma.scan.update({
        where: { id: existingScan.id },
        data: scanPayload,
      });
    } else {
      await prisma.scan.create({
        data: {
          memberId: session.memberId,
          ...scanPayload,
        },
      });
    }
  } catch {
    return {
      error: 'The PDF was parsed, but saving the scan failed. Please try again.',
    };
  }

  revalidatePath('/dashboard');

  const selectedDate = parsedForm.data.scanDate;
  const parsedDate = extracted.scanDate;
  const dateMismatch = selectedDate.toDateString() !== parsedDate.toDateString();

  return {
    message: dateMismatch
      ? `Scan saved from ${extracted.sourceFileName} for ${parsedDate.toDateString()} (note: upload form date was ${selectedDate.toDateString()}).`
      : `Scan parsed and saved from ${extracted.sourceFileName} for ${parsedDate.toDateString()}.`,
  };
}
