import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_USERS = [
  { email: 'virat.prakash@abenka.com', name: 'Virat Prakash', password: 'sta23sto46p', role: 'ADMIN' as const },
  { email: 'harshal.tiwari@abenka.com', name: 'Harshal Tiwari', password: 'Abenka@1234', role: 'ADMIN' as const },
  { email: 'arnav.kasbi@abenka.com', name: 'Arnav Kasbi', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'hrpartner@abenka.com', name: 'Sandeep Kumar', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'rajnish.chaudhary@abenka.com', name: 'Rajnish Caudhary', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'akashtripathi111@gmail.com', name: 'Akash Tripath', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'vivek.yadav@abenka.com', name: 'Vivek Yadav', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'sharmasumantk@gmail.com', name: 'Sumat Sharma', password: 'Abenka@1234', role: 'FOUNDER' as const },
  { email: 'adeshskumar@gmail.com', name: 'Adesh Kumar', password: 'Abenka@1234', role: 'FOUNDER' as const },
];

async function main() {
  const defaultHash = await bcrypt.hash('Abenka@1234', 10);
  const legacyHash = await bcrypt.hash('sta23sto46p', 10);
  for (const u of SEED_USERS) {
    const hash = u.password === 'sta23sto46p' ? legacyHash : defaultHash;
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash: hash, role: u.role },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
      },
    });
    console.log('Seeded user:', u.email, u.role);
  }
  const phases = [
    { name: 'Sprout', equityPoolPercent: 25, equityPoolQty: 1500, monthlySalesTargetLabel: 'Upto 15 Lakh/Month', salesWeightageMultiplier: 4, notionalSalaryNotes: '10% on Sales 5% on Renewal, 1500 Rs/Hr', sortOrder: 1 },
    { name: 'Survival', equityPoolPercent: 25, equityPoolQty: 1500, monthlySalesTargetLabel: 'Upto 50 Lakh/Month', salesWeightageMultiplier: 3, notionalSalaryNotes: '10% on Sales 5% on Renewal, 1500 Rs/Hr', sortOrder: 2 },
    { name: 'Growth', equityPoolPercent: 25, equityPoolQty: 1500, monthlySalesTargetLabel: 'Upto 2 Crore/Month', salesWeightageMultiplier: 2, notionalSalaryNotes: '10% on Profit 5% on Renewal', sortOrder: 3 },
    { name: 'Mature', equityPoolPercent: 25, equityPoolQty: 1500, monthlySalesTargetLabel: 'Upto 10 Cr/Month', salesWeightageMultiplier: 1, notionalSalaryNotes: '10% on Profit 5% on Renewal', sortOrder: 4 },
    { name: 'Giant', equityPoolPercent: null, equityPoolQty: 3000, monthlySalesTargetLabel: 'Above 10 Cr/Month', salesWeightageMultiplier: null, notionalSalaryNotes: 'Take help from Big4s', sortOrder: 5 },
  ];
  const existingPhases = await prisma.companyPhase.findMany();
  if (existingPhases.length === 0) {
    for (const p of phases) {
      await prisma.companyPhase.create({
        data: {
          name: p.name,
          equityPoolPercent: p.equityPoolPercent,
          equityPoolQty: p.equityPoolQty,
          monthlySalesTargetLabel: p.monthlySalesTargetLabel,
          salesWeightageMultiplier: p.salesWeightageMultiplier,
          notionalSalaryNotes: p.notionalSalaryNotes,
          sortOrder: p.sortOrder,
        },
      });
    }
    console.log('Seeded company phases:', phases.length);
  }
  await prisma.companyPhase.updateMany({
    where: { name: 'Sprout' },
    data: { monthlySalesTargetLabel: 'Upto 15 Lakh/Month' },
  });
  const existingWeights = await prisma.weightsConfig.findFirst();
  if (!existingWeights) {
    await prisma.weightsConfig.create({
      data: {
        timeWeight: 1,
        cashWeight: 1,
        otherWeight: 1,
        scope: 'company',
        projectId: null,
      },
    });
    console.log('Seeded default WeightsConfig (company).');
  }
  console.log('Seeded users and company phases.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
