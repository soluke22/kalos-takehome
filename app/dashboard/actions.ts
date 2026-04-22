'use server';

import { redirect } from 'next/navigation';
import { clearSession } from '@/lib/auth';
import { uploadPlaceholderSchema } from '@/lib/validation';

export type UploadFormState = {
  message?: string;
  error?: string;
};

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}

export async function uploadScanPlaceholderAction(
  _previousState: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const scanDate = formData.get('scanDate');
  const notes = formData.get('notes');
  const file = formData.get('scanFile');

  const fileName = file instanceof File ? file.name : '';

  const parsed = uploadPlaceholderSchema.safeParse({
    scanDate,
    notes,
    fileName,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Upload request is invalid.',
    };
  }

  return {
    message: `Upload received for ${parsed.data.fileName} (${parsed.data.scanDate.toDateString()}). PDF parsing is intentionally not implemented yet.`,
  };
}

