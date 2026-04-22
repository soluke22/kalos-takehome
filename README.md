# Kalos Take-Home Submission

## Project Overview
This is a full-stack Next.js member dashboard for DEXA scan review.

Primary goals implemented:
- Member login with seeded demo accounts
- Adaptive dashboard experiences for 1, 2, and 3+ scans
- Deterministic, grounded MemberGPT over database scan records
- Real server-side DEXA PDF parsing for the provided Kalos sample format
- Upload-to-persistence flow that immediately updates the dashboard

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma ORM 7 + PostgreSQL
- `jose` for signed cookie sessions
- `zod` for validation
- `recharts` for trends
- `pdf-parse` (Node/server-side text extraction only)

## Architecture Summary
- Routes:
  - `/login`
  - `/dashboard`
  - `/membergpt`
  - `POST /api/membergpt`
- Data model:
  - `User` (auth identity)
  - `Member` (profile)
  - `Scan` (time-series body composition metrics)
- Dashboard and auth are server-driven (Server Components + Server Actions).
- MemberGPT is deterministic pattern matching over Prisma-loaded member/scan records.
- PDF parser logic is isolated in `lib/scan-upload-parser.ts`.

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Copy env template:
```bash
cp .env.example .env
# PowerShell
Copy-Item .env.example .env
```
3. Push Prisma schema:
```bash
npm run db:push
```
4. Seed demo data:
```bash
npm run db:seed
```
5. Run app:
```bash
npm run dev
```
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables
Required:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - long random session-signing secret

## Database Setup
- Provider: PostgreSQL
- Prisma schema: `prisma/schema.prisma`
- Apply schema:
```bash
npm run db:push
```

## Seed Instructions
```bash
npm run db:seed
```

Seed behavior:
- Deletes and recreates demo `Scan`, `User`, and `Member` data
- Seeds 5 members with 1, 2, 3+, and 5+ scan histories
- Password for all seeded users: `kalos-demo-123`

## Demo Credentials By Dashboard Persona
Password for all: `kalos-demo-123`

- 1 scan baseline persona:
  - `ariana@kalos-demo.com`
- 2 scan first-comparison persona:
  - `marcus@kalos-demo.com`
- 3+ scan trend persona:
  - `ethan@kalos-demo.com` (3 scans)
  - `nina@kalos-demo.com` (4 scans)
- 5+ scan long-trend persona:
  - `sarah@kalos-demo.com` (6 scans)

## Reviewer Walkthrough (Suggested Demo Flow)
1. Log in with a persona account (start with `ariana@kalos-demo.com`).
2. Review dashboard behavior for that persona (1-scan baseline experience).
3. Switch to `marcus@kalos-demo.com` to show 2-scan deltas and directionality.
4. Switch to `sarah@kalos-demo.com` to show 3+/long-range narrative + charts.
5. On dashboard, upload the sample PDF (`01_DEXA.pdf`).
6. Confirm success message and that scan data appears immediately.
7. Open MemberGPT and run starter prompts plus custom named/cross-member questions.

## MemberGPT Grounding Approach
- Endpoint: `POST /api/membergpt`
- Input validated with Zod
- Data source is Prisma query results only (`Member` + `Scan` rows)
- No external retrieval, vector store, or model calls
- Output is deterministic pattern-based analysis with explicit insufficient-data handling

## Supported MemberGPT Example Questions
- "How many members have had 3+ scans?"
- "Which members have lost lean mass between their last two scans?"
- "Which members improved body fat percentage between their last two scans?"
- "How has Sarah's body fat percentage trended over the last 6 months?"
- "Give me a coaching summary for Marcus's next session."

## PDF Upload/Parsing Behavior
- Upload expects a PDF and parses server-side text (no OCR).
- Parser is optimized for the provided Kalos sample layout and key anchors:
  - `Scan Date:`
  - `Body Composition Results` -> `Total` row
  - `Est. VAT Mass (g)`
  - `BMI =`
- Outcomes:
  - `success` (scan parsed and persisted)
  - `unsupported_format` (non-PDF, empty file, oversized file, invalid header)
  - `parse_failure` (required fields missing/unreadable)
  - `invalid_values` (extracted but failed numeric/consistency validation)
- Duplicate behavior:
  - Uploading another scan for the same member and same calendar date updates existing scan data.

## Assumptions
- Scope prioritizes take-home clarity over production breadth.
- Single user role (`member`) is sufficient for this submission.
- Parser reliability is targeted at the provided sample PDF format first.
- Seeded data is synthetic and demo-safe.

## Limitations
- Parser is not generalized to arbitrary DEXA vendor templates.
- MemberGPT supports a constrained deterministic question set.
- No automated test suite yet.
- No production observability/rate-limiting/audit stack.

## Next Steps
- Add focused tests for parser, upload action, dashboard personas, and MemberGPT analyzers.
- Broaden parser support to additional real-world DEXA layout variants.
- Add stronger role/authorization model for coach/admin scenarios.
- Add operational instrumentation and safer production upload storage lifecycle.
