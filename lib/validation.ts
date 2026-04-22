import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
});

export const uploadScanFormSchema = z.object({
  scanDate: z.coerce.date({
    error: 'Please choose a scan date.',
  }),
  notes: z.string().trim().max(300).optional(),
  fileName: z.string().trim().min(1, 'Please select a file to upload.'),
});

export const memberGptQuestionSchema = z.object({
  question: z.string().trim().min(3, 'Ask a longer question.').max(500),
});

