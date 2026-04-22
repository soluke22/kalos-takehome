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
    goalSummary: 'Establish a reliable baseline before starting a recomposition phase.',
    scans: [
      {
        scanDate: '2026-02-11',
        weightLbs: 152.4,
        bodyFatPct: 29.1,
        leanMassLbs: 108.1,
        fatMassLbs: 44.3,
        visceralFatLbs: 2.0,
        bmr: 1462,
        sourceFileName: 'ariana_baseline_feb_2026.pdf',
      },
    ],
  },
  {
    name: 'Marcus Lee',
    email: 'marcus@kalos-demo.com',
    goalSummary: 'Cut body fat before competition season while preserving muscle.',
    scans: [
      {
        scanDate: '2025-12-02',
        weightLbs: 206.5,
        bodyFatPct: 26.5,
        leanMassLbs: 151.8,
        fatMassLbs: 54.7,
        visceralFatLbs: 3.8,
        bmr: 1948,
        sourceFileName: 'marcus_scan_1_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-18',
        weightLbs: 198.6,
        bodyFatPct: 23.8,
        leanMassLbs: 151.3,
        fatMassLbs: 47.3,
        visceralFatLbs: 3.2,
        bmr: 1936,
        sourceFileName: 'marcus_scan_2_mar_2026.pdf',
      },
    ],
  },
  {
    name: 'Nina Romero',
    email: 'nina@kalos-demo.com',
    goalSummary: 'Improve metabolic health with steady fat loss while holding lean mass.',
    scans: [
      {
        scanDate: '2025-07-15',
        weightLbs: 176.8,
        bodyFatPct: 34.5,
        leanMassLbs: 115.8,
        fatMassLbs: 61.0,
        visceralFatLbs: 3.3,
        bmr: 1576,
        sourceFileName: 'nina_scan_1_jul_2025.pdf',
      },
      {
        scanDate: '2025-10-01',
        weightLbs: 171.9,
        bodyFatPct: 32.7,
        leanMassLbs: 115.7,
        fatMassLbs: 56.2,
        visceralFatLbs: 3.0,
        bmr: 1569,
        sourceFileName: 'nina_scan_2_oct_2025.pdf',
      },
      {
        scanDate: '2025-12-20',
        weightLbs: 168.2,
        bodyFatPct: 31.5,
        leanMassLbs: 115.2,
        fatMassLbs: 53.0,
        visceralFatLbs: 2.8,
        bmr: 1558,
        sourceFileName: 'nina_scan_3_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-30',
        weightLbs: 165.4,
        bodyFatPct: 30.9,
        leanMassLbs: 114.3,
        fatMassLbs: 51.1,
        visceralFatLbs: 2.6,
        bmr: 1547,
        sourceFileName: 'nina_scan_4_mar_2026.pdf',
      },
    ],
  },
  {
    name: 'Ethan Brooks',
    email: 'ethan@kalos-demo.com',
    goalSummary: 'Add quality weight and increase resting metabolic output.',
    scans: [
      {
        scanDate: '2025-09-05',
        weightLbs: 161.2,
        bodyFatPct: 16.1,
        leanMassLbs: 135.2,
        fatMassLbs: 26.0,
        visceralFatLbs: 1.5,
        bmr: 1730,
        sourceFileName: 'ethan_scan_1_sep_2025.pdf',
      },
      {
        scanDate: '2025-12-01',
        weightLbs: 164.9,
        bodyFatPct: 16.0,
        leanMassLbs: 138.5,
        fatMassLbs: 26.4,
        visceralFatLbs: 1.5,
        bmr: 1751,
        sourceFileName: 'ethan_scan_2_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-08',
        weightLbs: 167.6,
        bodyFatPct: 15.8,
        leanMassLbs: 141.1,
        fatMassLbs: 26.5,
        visceralFatLbs: 1.4,
        bmr: 1774,
        sourceFileName: 'ethan_scan_3_mar_2026.pdf',
      },
    ],
  },
  {
    name: 'Sarah Kim',
    email: 'sarah@kalos-demo.com',
    goalSummary: 'Long-term recomposition with consistent check-ins and sustainable habits.',
    scans: [
      {
        scanDate: '2025-05-22',
        weightLbs: 189.4,
        bodyFatPct: 37.1,
        leanMassLbs: 119.1,
        fatMassLbs: 70.3,
        visceralFatLbs: 4.4,
        bmr: 1615,
        sourceFileName: 'sarah_scan_1_may_2025.pdf',
      },
      {
        scanDate: '2025-07-03',
        weightLbs: 185.6,
        bodyFatPct: 35.8,
        leanMassLbs: 119.2,
        fatMassLbs: 66.4,
        visceralFatLbs: 4.1,
        bmr: 1618,
        sourceFileName: 'sarah_scan_2_jul_2025.pdf',
      },
      {
        scanDate: '2025-08-18',
        weightLbs: 182.9,
        bodyFatPct: 34.4,
        leanMassLbs: 120.0,
        fatMassLbs: 62.9,
        visceralFatLbs: 3.8,
        bmr: 1624,
        sourceFileName: 'sarah_scan_3_aug_2025.pdf',
      },
      {
        scanDate: '2025-10-02',
        weightLbs: 180.7,
        bodyFatPct: 33.2,
        leanMassLbs: 120.7,
        fatMassLbs: 60.0,
        visceralFatLbs: 3.5,
        bmr: 1631,
        sourceFileName: 'sarah_scan_4_oct_2025.pdf',
      },
      {
        scanDate: '2025-12-12',
        weightLbs: 177.9,
        bodyFatPct: 31.8,
        leanMassLbs: 121.3,
        fatMassLbs: 56.6,
        visceralFatLbs: 3.1,
        bmr: 1640,
        sourceFileName: 'sarah_scan_5_dec_2025.pdf',
      },
      {
        scanDate: '2026-03-21',
        weightLbs: 174.8,
        bodyFatPct: 30.2,
        leanMassLbs: 122.0,
        fatMassLbs: 52.8,
        visceralFatLbs: 2.8,
        bmr: 1649,
        sourceFileName: 'sarah_scan_6_mar_2026.pdf',
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


