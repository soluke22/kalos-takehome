'use server';

import { redirect } from 'next/navigation';
import { clearSession } from '@/lib/auth';
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

export async function uploadScanAction(
  _previousState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const scanDate = formData.get('scanDate');
  const notes = formData.get('notes');
  const file = formData.get('scanFile');

  const fileName = file instanceof File ? file.name : '';

  const parsed = uploadScanFormSchema.safeParse({
    scanDate,
    notes,
    fileName,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Upload request is invalid.',
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

  if (parseResult.status === 'parse_failure') {
    return {
      error: `Upload received for ${parsed.data.fileName}, but parsing failed. ${parseResult.message}`,
    };
  }

  return {
    message: `Upload and parse succeeded for ${parseResult.parsed.sourceFileName} (${parsed.data.scanDate.toDateString()}). Parser output is ready for persistence wiring.`,
  };
}

