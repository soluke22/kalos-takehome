import 'server-only';

import { Buffer } from 'node:buffer';
import { PDFParse } from 'pdf-parse';

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

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

class InvalidExtractedValuesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidExtractedValuesError';
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

function parseNumber(value: string, fieldName: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`Unable to parse ${fieldName}.`);
  }
  return parsed;
}

function findRequiredMatch(text: string, pattern: RegExp, errorMessage: string): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) {
    throw new Error(errorMessage);
  }
  return match;
}

function findOptionalNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }

  return parseNumber(match[1], 'optional metric');
}

function validateParsedScanValues(parsed: ParsedScanDocument): void {
  const errors: string[] = [];

  if (parsed.scanDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    errors.push('Scan date is in the future.');
  }

  if (parsed.weightLbs < 60 || parsed.weightLbs > 600) {
    errors.push('Weight is out of expected range.');
  }

  if (parsed.bodyFatPct < 2 || parsed.bodyFatPct > 70) {
    errors.push('Body fat percentage is out of expected range.');
  }

  if (parsed.fatMassLbs < 2 || parsed.fatMassLbs > 300) {
    errors.push('Fat mass is out of expected range.');
  }

  if (parsed.leanMassLbs < 40 || parsed.leanMassLbs > 400) {
    errors.push('Lean mass is out of expected range.');
  }

  if (parsed.visceralFatGrams < 0 || parsed.visceralFatGrams > 10000) {
    errors.push('Visceral fat grams are out of expected range.');
  }

  if (parsed.bmi < 10 || parsed.bmi > 80) {
    errors.push('BMI is out of expected range.');
  }

  const totalMassDelta = Math.abs(parsed.weightLbs - (parsed.fatMassLbs + parsed.leanMassLbs));
  if (totalMassDelta > 1.0) {
    errors.push('Total mass does not reconcile with fat + lean mass.');
  }

  const expectedBodyFatPct = (parsed.fatMassLbs / parsed.weightLbs) * 100;
  if (Math.abs(expectedBodyFatPct - parsed.bodyFatPct) > 1.0) {
    errors.push('Body fat percentage does not match fat and total mass.');
  }

  if (errors.length > 0) {
    throw new InvalidExtractedValuesError(errors.join(' '));
  }
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

    const parsed = await parsePdfScanDocument({
      fileName: file.name,
      bytes,
    });

    return {
      status: 'success',
      parsed,
    };
  } catch (error) {
    if (error instanceof InvalidExtractedValuesError) {
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

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(bytes) });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
}

export async function parsePdfScanDocument(input: PdfScanParserInput): Promise<ParsedScanDocument> {
  const rawText = normalizeText(await extractPdfText(input.bytes));

  const scanDateMatch = findRequiredMatch(
    rawText,
    /Scan Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    'Missing "Scan Date:" field in PDF text.',
  );

  const totalRowMatch = findRequiredMatch(
    rawText,
    /Body Composition Results[\s\S]*?\nTotal\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/i,
    'Missing "Total" row in "Body Composition Results" section.',
  );

  const vatMassMatch = findRequiredMatch(
    rawText,
    /Est\. VAT Mass \(g\)\s+([0-9]+(?:\.[0-9]+)?)/i,
    'Missing "Est. VAT Mass (g)" field.',
  );

  const bmiMatch = findRequiredMatch(rawText, /BMI\s*=\s*([0-9]+(?:\.[0-9]+)?)/i, 'Missing "BMI =" field.');

  const parsed: ParsedScanDocument = {
    sourceFileName: input.fileName,
    extractedAt: new Date(),
    rawText,
    scanDate: new Date(scanDateMatch[1]),
    fatMassLbs: parseNumber(totalRowMatch[1], 'fat mass'),
    leanMassLbs: parseNumber(totalRowMatch[2], 'lean mass'),
    weightLbs: parseNumber(totalRowMatch[3], 'total mass'),
    bodyFatPct: parseNumber(totalRowMatch[4], 'body fat percentage'),
    visceralFatGrams: Math.round(parseNumber(vatMassMatch[1], 'visceral fat grams')),
    bmi: parseNumber(bmiMatch[1], 'BMI'),
    androidGynoidRatio: findOptionalNumber(rawText, /Android\/Gynoid Ratio\s+([0-9]+(?:\.[0-9]+)?)/i),
    leanHeightIndex: findOptionalNumber(
      rawText,
      /Lean\/Height[^\n]*?\)\s+([0-9]+(?:\.[0-9]+)?)/i,
    ),
    appendicularLeanHeightIndex: findOptionalNumber(
      rawText,
      /Appen\.\s*Lean\/Height[^\n]*?\)\s+([0-9]+(?:\.[0-9]+)?)/i,
    ),
  };

  if (Number.isNaN(parsed.scanDate.getTime())) {
    throw new Error('Unable to parse scan date value.');
  }

  validateParsedScanValues(parsed);

  return parsed;
}
