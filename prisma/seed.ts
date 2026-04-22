import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MEMBER_PASSWORD = 'kalos-demo-123';

type SeedMember = {
  name: string;
  email: string;
  goalSummary: string;
  scans: Array<{
    scanDate: string;
    weightLbs: number;
    bodyFatPct: number;
    leanMassLbs: number;
    fatMassLbs: number;
    visceralFatLbs: number;
    bmr: number;
    sourceFileName: string;
  }>;
};

const members: SeedMember[] = [
  {
    name: 'Ariana Patel',
    email: 'ariana@kalos-demo.com',
    goalSummary: 'Build lean mass while lowering body fat before summer.',
    scans: [
      {
        scanDate: '2026-01-08',
        weightLbs: 151.2,
        bodyFatPct: 28.4,
        leanMassLbs: 108.3,
        fatMassLbs: 42.9,
        visceralFatLbs: 1.9,
        bmr: 1455,
        sourceFileName: 'ariana_baseline_jan_2026.pdf',
      },
    ],
  },
  {
    name: 'Marcus Lee',
    email: 'marcus@kalos-demo.com',
    goalSummary: 'Cut body fat while preserving strength for competition season.',
    scans: [
      {
        scanDate: '2025-11-02',
        weightLbs: 198.1,
        bodyFatPct: 24.7,
        leanMassLbs: 149.1,
        fatMassLbs: 49.0,
        visceralFatLbs: 3.4,
        bmr: 1912,
        sourceFileName: 'marcus_scan_1_nov_2025.pdf',
      },
      {
        scanDate: '2026-02-16',
        weightLbs: 191.3,
        bodyFatPct: 21.9,
        leanMassLbs: 149.4,
        fatMassLbs: 41.9,
        visceralFatLbs: 2.9,
        bmr: 1905,
        sourceFileName: 'marcus_scan_2_feb_2026.pdf',
      },
    ],
  },
  {
    name: 'Nina Romero',
    email: 'nina@kalos-demo.com',
    goalSummary: 'Improve metabolic health and maintain muscle during weight loss.',
    scans: [
      {
        scanDate: '2025-09-20',
        weightLbs: 174.6,
        bodyFatPct: 33.8,
        leanMassLbs: 115.6,
        fatMassLbs: 59.0,
        visceralFatLbs: 3.1,
        bmr: 1568,
        sourceFileName: 'nina_scan_1_sep_2025.pdf',
      },
      {
        scanDate: '2025-12-18',
        weightLbs: 168.4,
        bodyFatPct: 31.7,
        leanMassLbs: 115.0,
        fatMassLbs: 53.4,
        visceralFatLbs: 2.7,
        bmr: 1549,
        sourceFileName: 'nina_scan_2_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-22',
        weightLbs: 163.9,
        bodyFatPct: 29.9,
        leanMassLbs: 114.9,
        fatMassLbs: 49.0,
        visceralFatLbs: 2.4,
        bmr: 1538,
        sourceFileName: 'nina_scan_3_mar_2026.pdf',
      },
    ],
  },
  {
    name: 'Ethan Brooks',
    email: 'ethan@kalos-demo.com',
    goalSummary: 'Add quality weight and increase resting metabolic output.',
    scans: [
      {
        scanDate: '2025-08-12',
        weightLbs: 159.8,
        bodyFatPct: 15.4,
        leanMassLbs: 135.2,
        fatMassLbs: 24.6,
        visceralFatLbs: 1.5,
        bmr: 1722,
        sourceFileName: 'ethan_scan_1_aug_2025.pdf',
      },
      {
        scanDate: '2025-10-23',
        weightLbs: 162.4,
        bodyFatPct: 15.1,
        leanMassLbs: 137.9,
        fatMassLbs: 24.5,
        visceralFatLbs: 1.5,
        bmr: 1741,
        sourceFileName: 'ethan_scan_2_oct_2025.pdf',
      },
      {
        scanDate: '2025-12-30',
        weightLbs: 165.1,
        bodyFatPct: 14.8,
        leanMassLbs: 140.7,
        fatMassLbs: 24.4,
        visceralFatLbs: 1.4,
        bmr: 1762,
        sourceFileName: 'ethan_scan_3_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-10',
        weightLbs: 168.5,
        bodyFatPct: 14.5,
        leanMassLbs: 144.1,
        fatMassLbs: 24.4,
        visceralFatLbs: 1.4,
        bmr: 1790,
        sourceFileName: 'ethan_scan_4_mar_2026.pdf',
      },
    ],
  },
  {
    name: 'Sophia Nguyen',
    email: 'sophia@kalos-demo.com',
    goalSummary: 'Long-term recomposition with consistent monthly scan check-ins.',
    scans: [
      {
        scanDate: '2025-06-05',
        weightLbs: 187.6,
        bodyFatPct: 36.2,
        leanMassLbs: 119.7,
        fatMassLbs: 67.9,
        visceralFatLbs: 4.2,
        bmr: 1621,
        sourceFileName: 'sophia_scan_1_jun_2025.pdf',
      },
      {
        scanDate: '2025-08-07',
        weightLbs: 183.4,
        bodyFatPct: 34.8,
        leanMassLbs: 119.6,
        fatMassLbs: 63.8,
        visceralFatLbs: 3.9,
        bmr: 1617,
        sourceFileName: 'sophia_scan_2_aug_2025.pdf',
      },
      {
        scanDate: '2025-10-09',
        weightLbs: 180.1,
        bodyFatPct: 33.4,
        leanMassLbs: 119.9,
        fatMassLbs: 60.2,
        visceralFatLbs: 3.6,
        bmr: 1619,
        sourceFileName: 'sophia_scan_3_oct_2025.pdf',
      },
      {
        scanDate: '2025-12-11',
        weightLbs: 177.8,
        bodyFatPct: 31.9,
        leanMassLbs: 121.1,
        fatMassLbs: 56.7,
        visceralFatLbs: 3.2,
        bmr: 1632,
        sourceFileName: 'sophia_scan_4_dec_2025.pdf',
      },
      {
        scanDate: '2026-02-12',
        weightLbs: 175.6,
        bodyFatPct: 30.5,
        leanMassLbs: 122.1,
        fatMassLbs: 53.5,
        visceralFatLbs: 2.9,
        bmr: 1644,
        sourceFileName: 'sophia_scan_5_feb_2026.pdf',
      },
      {
        scanDate: '2026-04-04',
        weightLbs: 173.9,
        bodyFatPct: 29.3,
        leanMassLbs: 123.0,
        fatMassLbs: 50.9,
        visceralFatLbs: 2.6,
        bmr: 1651,
        sourceFileName: 'sophia_scan_6_apr_2026.pdf',
      },
    ],
  },
];

async function main() {
  await prisma.scan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();

  const passwordHash = await bcrypt.hash(MEMBER_PASSWORD, 12);

  for (const item of members) {
    const member = await prisma.member.create({
      data: {
        name: item.name,
        email: item.email,
        goalSummary: item.goalSummary,
      },
    });

    await prisma.user.create({
      data: {
        email: item.email,
        passwordHash,
        role: 'member',
        memberId: member.id,
      },
    });

    await prisma.scan.createMany({
      data: item.scans.map((scan) => ({
        memberId: member.id,
        scanDate: new Date(scan.scanDate),
        weightLbs: scan.weightLbs,
        bodyFatPct: scan.bodyFatPct,
        leanMassLbs: scan.leanMassLbs,
        fatMassLbs: scan.fatMassLbs,
        visceralFatLbs: scan.visceralFatLbs,
        bmr: scan.bmr,
        sourceFileName: scan.sourceFileName,
      })),
    });
  }

  console.log('Seed complete. Demo member password:', MEMBER_PASSWORD);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });


