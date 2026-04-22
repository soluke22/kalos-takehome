import 'server-only';

import { Buffer } from 'node:buffer';

export type ParsedScanDocument = {
  sourceFileName: string;
  extractedAt: Date;
  rawText: string;
  scanDate: Date;
  weightLbs: number;
  bodyFatPct: number;
  fatMassLbs: number;
  leanMassLbs: number;
  visceralFatGrams: number;
  bmi: number;
  androidGynoidRatio?: number;
  leanHeightIndex?: number;
  appendicularLeanHeightIndex?: number;
};

type ParseSuccess = {
  status: 'success';
  parsed: ParsedScanDocument;
};

type ParseUnsupportedFormat = {
  status: 'unsupported_format';
  message: string;
};

type ParseInvalidValues = {
  status: 'invalid_values';
  message: string;
};

type ParseFailure = {
  status: 'parse_failure';
  message: string;
};

export type ScanUploadParseResult = ParseSuccess | ParseUnsupportedFormat | ParseInvalidValues | ParseFailure;

type PdfScanParserInput = {
  fileName: string;
  bytes: Uint8Array;
};

type NormalizedText = {
  normalizedText: string;
  flatText: string;
};

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

type ParsedFieldMap = {
  scanDate?: string;
  fatMassLbs?: string;
  leanMassLbs?: string;
  weightLbs?: string;
  bodyFatPct?: string;
  visceralFatGrams?: string;
  bmi?: string;
  androidGynoidRatio?: string;
  leanHeightIndex?: string;
  appendicularLeanHeightIndex?: string;
};

class ParseIssuesError extends Error {
  missingRequiredFields: string[];
  invalidFields: string[];

  constructor(missingRequiredFields: string[], invalidFields: string[]) {
    const missing =
      missingRequiredFields.length > 0
        ? `Missing required fields: ${missingRequiredFields.join(', ')}.`
        : null;

    const invalid =
      invalidFields.length > 0
        ? `Invalid fields: ${invalidFields.join(' | ')}.`
        : null;

    super(['DEXA parse failed.', missing, invalid].filter(Boolean).join(' '));
    this.name = 'ParseIssuesError';
    this.missingRequiredFields = missingRequiredFields;
    this.invalidFields = invalidFields;
  }
}

function isPdfUpload(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const isPdfMime = file.type === 'application/pdf';
  const hasPdfExtension = lowerName.endsWith('.pdf');
  return isPdfMime || hasPdfExtension;
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) {
    return false;
  }

  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function parseFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'The PDF could not be parsed.';
}

function parseNumber(rawValue: string, fieldName: string, invalidFields: string[]): number | undefined {
  const normalized = rawValue.replace(/,/g, '').trim();
  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed)) {
    invalidFields.push(`${fieldName} is not numeric (${rawValue}).`);
    return undefined;
  }

  return parsed;
}

function normalizeExtractedText(rawText: string): NormalizedText {
  const withLineBreaks = rawText
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\f/g, '\n');

  const withLabelSpacing = withLineBreaks
    .replace(/(Scan Date:)([A-Za-z])/gi, '$1 $2')
    .replace(/(Body Composition Results)([A-Za-z])/gi, '$1\n$2')
    .replace(/(Est\.?\s*VAT\s*Mass\s*\(g\))([0-9])/gi, '$1 $2')
    .replace(/(BMI\s*=)([0-9])/gi, '$1 $2')
    .replace(/(Android\/Gynoid Ratio)([0-9])/gi, '$1 $2')
    .replace(/(Lean\/Height[²2][^\n]*?\))([0-9])/gi, '$1 $2')
    .replace(/(Appen\.?\s*Lean\/Height[²2][^\n]*?\))([0-9])/gi, '$1 $2');

  const normalizedText = withLabelSpacing
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  const flatText = normalizedText.replace(/\s+/g, ' ');

  return { normalizedText, flatText };
}

function findSection(flatText: string, startLabel: string, endLabels: string[]): string {
  const lower = flatText.toLowerCase();
  const start = lower.indexOf(startLabel.toLowerCase());

  if (start < 0) {
    return '';
  }

  let end = flatText.length;

  for (const endLabel of endLabels) {
    const endIndex = lower.indexOf(endLabel.toLowerCase(), start + startLabel.length);
    if (endIndex >= 0 && endIndex < end) {
      end = endIndex;
    }
  }

  return flatText.slice(start, end);
}

function extractBodyCompositionMetrics(
  bodyCompositionSection: string,
  extractedFields: ParsedFieldMap,
  missingRequiredFields: string[],
): void {
  if (!bodyCompositionSection) {
    missingRequiredFields.push('Body Composition Results section');
    return;
  }

  const totalMatch = bodyCompositionSection.match(
    /(?:^|[^a-z])total\s*([0-9]{1,3}\.[0-9]{2})\s*([0-9]{1,3}\.[0-9]{2})\s*([0-9]{1,3}\.[0-9]{2})\s*([0-9]{1,2}\.[0-9])/i,
  );

  if (!totalMatch) {
    missingRequiredFields.push('Total row in Body Composition Results');
    return;
  }

  extractedFields.fatMassLbs = totalMatch[1];
  extractedFields.leanMassLbs = totalMatch[2];
  extractedFields.weightLbs = totalMatch[3];
  extractedFields.bodyFatPct = totalMatch[4];
}

function extractAdiposeAndLeanMetrics(metricsSection: string, extractedFields: ParsedFieldMap): void {
  if (!metricsSection) {
    return;
  }

  extractedFields.visceralFatGrams =
    metricsSection.match(/Est\.?\s*VAT\s*Mass\s*\(g\)\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? undefined;

  extractedFields.bmi = metricsSection.match(/BMI\s*=\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? undefined;

  extractedFields.androidGynoidRatio =
    metricsSection.match(/Android\/Gynoid\s*Ratio\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? undefined;

  extractedFields.leanHeightIndex =
    metricsSection.match(/Lean\/Height[²2][^)]*\)\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? undefined;

  extractedFields.appendicularLeanHeightIndex =
    metricsSection.match(/Appen\.?\s*Lean\/Height[²2][^)]*\)\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? undefined;
}

function validateParsedScan(parsed: ParsedScanDocument): string[] {
  const invalidFields: string[] = [];

  if (parsed.scanDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    invalidFields.push('scanDate is in the future.');
  }

  if (parsed.weightLbs < 60 || parsed.weightLbs > 600) {
    invalidFields.push('weightLbs is out of expected range (60-600).');
  }

  if (parsed.bodyFatPct < 2 || parsed.bodyFatPct > 70) {
    invalidFields.push('bodyFatPct is out of expected range (2-70).');
  }

  if (parsed.fatMassLbs < 2 || parsed.fatMassLbs > 300) {
    invalidFields.push('fatMassLbs is out of expected range (2-300).');
  }

  if (parsed.leanMassLbs < 40 || parsed.leanMassLbs > 400) {
    invalidFields.push('leanMassLbs is out of expected range (40-400).');
  }

  if (parsed.visceralFatGrams < 0 || parsed.visceralFatGrams > 10000) {
    invalidFields.push('visceralFatGrams is out of expected range (0-10000).');
  }

  if (parsed.bmi < 10 || parsed.bmi > 80) {
    invalidFields.push('bmi is out of expected range (10-80).');
  }

  const massDelta = Math.abs(parsed.weightLbs - (parsed.fatMassLbs + parsed.leanMassLbs));
  if (massDelta > 1.0) {
    invalidFields.push('fatMassLbs + leanMassLbs does not approximately equal weightLbs.');
  }

  const expectedBodyFatPct = (parsed.fatMassLbs / parsed.weightLbs) * 100;
  if (Math.abs(expectedBodyFatPct - parsed.bodyFatPct) > 1.0) {
    invalidFields.push('bodyFatPct does not approximately match fatMassLbs / weightLbs * 100.');
  }

  return invalidFields;
}

function debugLogParse(
  rawText: string,
  normalized: NormalizedText,
  bodySection: string,
  metricsSection: string,
  extractedFields: ParsedFieldMap,
): void {
  if (process.env.DEXA_PARSE_DEBUG !== '1') {
    return;
  }

  const clip = (value: string, max = 600) => value.slice(0, max);

  console.log('[DEXA_PARSE_DEBUG] rawTextLength:', rawText.length);
  console.log('[DEXA_PARSE_DEBUG] normalizedTextLength:', normalized.flatText.length);
  console.log('[DEXA_PARSE_DEBUG] bodyCompositionSnippet:', clip(bodySection));
  console.log('[DEXA_PARSE_DEBUG] metricsSnippet:', clip(metricsSection));
  console.log('[DEXA_PARSE_DEBUG] extractedFieldMap:', extractedFields);
}

export async function parseUploadedScanFile(file: File): Promise<ScanUploadParseResult> {
  if (!isPdfUpload(file)) {
    return {
      status: 'unsupported_format',
      message: 'Unsupported upload format. Please upload a PDF file.',
    };
  }

  if (file.size <= 0) {
    return {
      status: 'unsupported_format',
      message: 'The uploaded file is empty. Please upload a valid PDF.',
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      status: 'unsupported_format',
      message: 'The uploaded PDF is too large. Please upload a file under 10 MB.',
    };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (!hasPdfHeader(bytes)) {
      return {
        status: 'unsupported_format',
        message: 'The uploaded file does not appear to be a valid PDF.',
      };
    }

    const parsed = await parsePdfScanDocument({ fileName: file.name, bytes });

    return {
      status: 'success',
      parsed,
    };
  } catch (error) {
    if (error instanceof ParseIssuesError) {
      if (error.missingRequiredFields.length > 0) {
        return {
          status: 'parse_failure',
          message: error.message,
        };
      }

      return {
        status: 'invalid_values',
        message: error.message,
      };
    }

    return {
      status: 'parse_failure',
      message: parseFailureMessage(error),
    };
  }
}

async function extractRawText(bytes: Uint8Array): Promise<string> {
  const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = pdfParseModule.default as (buffer: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(Buffer.from(bytes));
  return result.text ?? '';
}

export async function parsePdfScanDocument(input: PdfScanParserInput): Promise<ParsedScanDocument> {
  const rawText = await extractRawText(input.bytes);
  const normalized = normalizeExtractedText(rawText);

  const bodyCompositionSection = findSection(normalized.flatText, 'Body Composition Results', [
    'Adipose Indices',
    'Lean Indices',
    'Scan Date:',
  ]);

  const metricsSection = findSection(normalized.flatText, 'Adipose Indices', [
    'BMI has some limitations',
    '-- 2 of 2 --',
  ]);

  const extractedFields: ParsedFieldMap = {};
  const missingRequiredFields: string[] = [];
  const invalidFields: string[] = [];

  extractedFields.scanDate = normalized.flatText.match(/Scan\s*Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)?.[1] ?? undefined;

  extractBodyCompositionMetrics(bodyCompositionSection, extractedFields, missingRequiredFields);
  extractAdiposeAndLeanMetrics(metricsSection || normalized.flatText, extractedFields);

  if (!extractedFields.scanDate) {
    missingRequiredFields.push('scanDate');
  }
  if (!extractedFields.weightLbs) {
    missingRequiredFields.push('weightLbs');
  }
  if (!extractedFields.bodyFatPct) {
    missingRequiredFields.push('bodyFatPct');
  }
  if (!extractedFields.fatMassLbs) {
    missingRequiredFields.push('fatMassLbs');
  }
  if (!extractedFields.leanMassLbs) {
    missingRequiredFields.push('leanMassLbs');
  }
  if (!extractedFields.visceralFatGrams) {
    missingRequiredFields.push('visceralFatGrams');
  }
  if (!extractedFields.bmi) {
    missingRequiredFields.push('bmi');
  }

  debugLogParse(rawText, normalized, bodyCompositionSection, metricsSection || normalized.flatText, extractedFields);

  let parsedDate: Date | undefined;
  if (extractedFields.scanDate) {
    parsedDate = new Date(extractedFields.scanDate);
    if (Number.isNaN(parsedDate.getTime())) {
      invalidFields.push(`scanDate could not be parsed (${extractedFields.scanDate}).`);
    }
  }

  const fatMassLbs = extractedFields.fatMassLbs
    ? parseNumber(extractedFields.fatMassLbs, 'fatMassLbs', invalidFields)
    : undefined;
  const leanMassLbs = extractedFields.leanMassLbs
    ? parseNumber(extractedFields.leanMassLbs, 'leanMassLbs', invalidFields)
    : undefined;
  const weightLbs = extractedFields.weightLbs
    ? parseNumber(extractedFields.weightLbs, 'weightLbs', invalidFields)
    : undefined;
  const bodyFatPct = extractedFields.bodyFatPct
    ? parseNumber(extractedFields.bodyFatPct, 'bodyFatPct', invalidFields)
    : undefined;
  const visceralFatGrams = extractedFields.visceralFatGrams
    ? parseNumber(extractedFields.visceralFatGrams, 'visceralFatGrams', invalidFields)
    : undefined;
  const bmi = extractedFields.bmi ? parseNumber(extractedFields.bmi, 'bmi', invalidFields) : undefined;

  const androidGynoidRatio = extractedFields.androidGynoidRatio
    ? parseNumber(extractedFields.androidGynoidRatio, 'androidGynoidRatio', invalidFields)
    : undefined;
  const leanHeightIndex = extractedFields.leanHeightIndex
    ? parseNumber(extractedFields.leanHeightIndex, 'leanHeightIndex', invalidFields)
    : undefined;
  const appendicularLeanHeightIndex = extractedFields.appendicularLeanHeightIndex
    ? parseNumber(extractedFields.appendicularLeanHeightIndex, 'appendicularLeanHeightIndex', invalidFields)
    : undefined;

  if (missingRequiredFields.length > 0 || invalidFields.length > 0) {
    throw new ParseIssuesError(missingRequiredFields, invalidFields);
  }

  const parsed: ParsedScanDocument = {
    sourceFileName: input.fileName,
    extractedAt: new Date(),
    rawText,
    scanDate: parsedDate!,
    weightLbs: weightLbs!,
    bodyFatPct: bodyFatPct!,
    fatMassLbs: fatMassLbs!,
    leanMassLbs: leanMassLbs!,
    visceralFatGrams: Math.round(visceralFatGrams!),
    bmi: bmi!,
    androidGynoidRatio,
    leanHeightIndex,
    appendicularLeanHeightIndex,
  };

  const validationErrors = validateParsedScan(parsed);
  if (validationErrors.length > 0) {
    throw new ParseIssuesError([], validationErrors);
  }

  return parsed;
}

