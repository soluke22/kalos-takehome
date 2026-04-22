# Kalos Take-Home Submission

## Overview
This project is a small full-stack member portal for coaches reviewing body-composition scan history.

Core user flows:
- Member login via email/password
- Member dashboard with scan-history-aware UI (baseline, comparison, and trend modes)
- Coach-facing `MemberGPT` chat endpoint grounded to database scan records
- Placeholder scan upload form (intake only; no PDF parsing pipeline yet)

## Tech Stack
- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma ORM 7 + PostgreSQL
- `jose` for signed cookie sessions
- `zod` for request/form validation
- `recharts` for 3+ scan trend visualization

## Architecture Summary
- App routes:
  - `/login`
  - `/dashboard`
  - `/membergpt`
- Server Components are used by default for page-level data loading.
- Client Components are used only for interactive elements:
  - login form (`useActionState`)
  - scan upload form (`useActionState`)
  - MemberGPT chat UI (`fetch` + local state)
  - trend chart rendering
- Auth model:
  - login action validates credentials against `User`
  - session is a signed HTTP-only cookie
  - dashboard access requires a valid session with `memberId`
- Data model:
  - `User` (auth identity)
  - `Member` (profile and goal summary)
  - `Scan` (time-series body composition metrics)

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Copy env template and fill values:
```bash
cp .env.example .env
# PowerShell alternative:
Copy-Item .env.example .env
```
3. Push Prisma schema to your Postgres DB:
```bash
npm run db:push
```
4. Seed demo data:
```bash
npm run db:seed
```
5. Start development server:
```bash
npm run dev
```
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables
Required:
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: long random string used to sign session tokens

Notes:
- Keep `AUTH_SECRET` stable per environment so existing sessions stay valid.
- This repo does not currently require an LLM provider key at runtime.

## Database Setup
- Provider: PostgreSQL
- ORM: Prisma (schema in `prisma/schema.prisma`)
- Schema application:
```bash
npm run db:push
```

## Seed Instructions
```bash
npm run db:seed
```

Seed behavior:
- Clears existing `Scan`, `User`, and `Member` rows
- Inserts 5 demo members with varied scan history depths (1, 2, 3, 4, 6 scans)
- Creates corresponding member users with shared demo password

## Demo Credentials (Placeholder)
Replace this section with reviewer-specific credentials before final submission if needed.

Current local seed default:
- Email: any seeded email in `prisma/seed.ts` (example: `ariana@kalos-demo.com`)
- Password: `kalos-demo-123`
- Suggested demo walkthrough accounts:
  - `ariana@kalos-demo.com` for 1-scan baseline education
  - `marcus@kalos-demo.com` for 2-scan comparison and lean-mass tradeoff discussion
  - `sarah@kalos-demo.com` for 3+ scan trend narrative

## MemberGPT Grounding Approach
- Endpoint: `POST /api/membergpt`
- Request validated by Zod (`memberGptQuestionSchema`)
- Data source is strictly Prisma query results from `Member` + related `Scan` rows
- No external retrieval or vector store
- Response logic is deterministic pattern matching over DB-backed data
- If data is missing/insufficient, the API returns an explicit limitation message
- Supported question patterns currently include:
  - count members by minimum scan threshold (for example, `3+ scans`)
  - members who lost lean mass between last two scans
  - members who improved body fat percentage between last two scans
  - named-member body-fat trend over the last 6 months
  - named-member coaching summary/focus from last-two-scan deltas

## Upload/Parsing Status
- Upload form exists on `/dashboard` and validates date/file metadata.
- Server-side parse boundary is isolated in `lib/scan-upload-parser.ts`.
- Current status:
  - deterministic PDF text parsing is implemented for the provided Kalos sample DEXA format
  - parser anchors include:
    - `Scan Date:`
    - `Total` row inside `Body Composition Results`
    - `Est. VAT Mass (g)`
    - `BMI =`
  - unsupported format handling is implemented (non-PDF uploads are rejected)
  - upload hardening is in place (empty file, oversized file, invalid PDF header checks)
  - parse outcomes are explicit: success, unsupported format, parse failure, invalid extracted values
  - successful parses are persisted to `Scan` and immediately reflected on `/dashboard`
- Not implemented intentionally:
  - generalized support for arbitrary DEXA vendor layouts
  - uploaded file storage lifecycle beyond in-memory parsing

## Assumptions
- Single-role usage in this take-home scope (`member` role logins).
- Seed data is acceptable for demo/review and not production PHI.
- Reviewer prioritizes architecture clarity and tradeoff communication over feature breadth.

## Limitations
- No production-grade authorization layers beyond session + role checks.
- Parser is currently tuned to the provided Kalos sample PDF layout and anchor text.
- MemberGPT supports a constrained set of question patterns.
- No automated test suite is included yet.
- No audit trail, rate limiting, or observability instrumentation.

## Next Steps
- Implement upload pipeline: secure file storage + PDF parsing + structured scan ingestion.
- Expand MemberGPT query coverage with more robust intent handling and guardrails.
- Add tests for auth actions, dashboard data scenarios, and MemberGPT responses.
- Add role-based coach access path separate from member login.

