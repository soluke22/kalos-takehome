import 'server-only';

export type ParsedScanDocument = {
  sourceFileName: string;
  extractedAt: Date;
  rawText: string;
};

type ParseSuccess = {
  status: 'success';
  parsed: ParsedScanDocument;
};

type ParseUnsupportedFormat = {
  status: 'unsupported_format';
  message: string;
};

type ParseFailure = {
  status: 'parse_failure';
  message: string;
};

export type ScanUploadParseResult = ParseSuccess | ParseUnsupportedFormat | ParseFailure;

type PdfScanParserInput = {
  fileName: string;
  bytes: Uint8Array;
};

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

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
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

function parseFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'The PDF could not be parsed.';
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
    return {
      status: 'parse_failure',
      message: parseFailureMessage(error),
    };
  }
}

async function parsePdfScanDocument(_input: PdfScanParserInput): Promise<ParsedScanDocument> {
  void _input;
  throw new Error(
    'PDF parser integration is not configured yet. Implement parsePdfScanDocument in lib/scan-upload-parser.ts.',
  );
}
