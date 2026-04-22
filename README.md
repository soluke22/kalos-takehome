# Kalos Take-Home (Next.js App Router)

Single full-stack Next.js app built with:
- TypeScript
- Tailwind CSS
- Prisma
- Postgres
- App Router + Server Components by default

## Routes
- `/login`
- `/dashboard`
- `/membergpt`

## Core Behavior
- Credentials-based email/password login for member users.
- Shared DB models: `User`, `Member`, `Scan`.
- Seeded with 5 realistic members covering 1, 2, 3+, and 5+ scan histories.
- Adaptive dashboard experience by scan count:
  - 1 scan: baseline education (no empty charts)
  - 2 scans: comparison + deltas
  - 3+ scans: trend chart over time
- Placeholder scan upload flow included (PDF parsing intentionally not implemented yet).
- MemberGPT endpoint is grounded to real scan rows in DB and responds with insufficient-data messaging when needed.

## Local Setup
1. Update `.env` with your Postgres connection string.
2. Install deps:
   ```bash
   npm install
   ```
3. Push schema to Postgres:
   ```bash
   npm run db:push
   ```
4. Seed demo data:
   ```bash
   npm run db:seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## Demo Credentials
- Any seeded member email from `prisma/seed.ts`
- Password for all seeded members: `kalos-demo-123`

## Architecture Notes
- Server Components are the default for pages and data loading.
- Client Components are only used where browser interactivity is required:
  - Login form (`useActionState`)
  - Upload placeholder form (`useActionState`)
  - MemberGPT chat UI (`fetch` + local state)
  - Recharts trend chart rendering
- Auth uses signed HTTP-only cookie sessions (`jose` + `next/headers` async cookies API).
- Server Actions handle login/logout/upload placeholder mutations.
- `app/api/membergpt/route.ts` validates input with Zod and only answers from DB scan records.

