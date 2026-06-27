import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seed data mirrors the real NFK ledger + the sample C.H. Robinson / CBP 7501
// documents so the UI has meaningful content on first run.
async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clearway.app' },
    update: {},
    create: { email: 'admin@clearway.app', name: 'Clearway Admin', role: 'ADMIN', passwordHash },
  });
  console.log('✓ Admin user: admin@clearway.app / ChangeMe123!');

  const customers = await Promise.all(
    [
      { name: 'OFFPRICE IMPORTS INC', code: 'OFFPRICE', email: 'ap@offpriceimports.com', address: '368 Washington Rd Ste 4, Sayreville, NJ 08872', country: 'USA' },
      { name: 'DEIRA TRADING CENTRE (L.L.C.)', code: 'DEIRA', email: 'accounts@deiratrading.ae', country: 'UAE' },
      { name: 'Carhartt', code: 'CARHART', country: 'USA' },
      { name: 'George (ASDA)', code: 'GEORGE', country: 'UK' },
    ].map((c) => prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c })),
  );
  const byCode = Object.fromEntries(customers.map((c) => [c.code, c]));
  console.log(`✓ ${customers.length} customers`);

  // Projects taken from the ledger rows.
  const projectSeeds = [
    { name: 'CARHART 08.04.25', code: 'CARHART-080425', customerId: byCode.CARHART.id, references: ['281/24-25', 'WP 035/25'] },
    { name: 'GEORGE 11.04.25', code: 'GEORGE-110425', customerId: byCode.GEORGE.id, references: ['311AB/24-25', 'OP 042/25'] },
    { name: 'DEIRA Ars-060-26', code: 'DEIRA-06026', customerId: byCode.DEIRA.id, references: ['Ars-060-26'] },
    { name: 'OFFPRICE Entry 791-5968629', code: 'OFFPRICE-79159', customerId: byCode.OFFPRICE.id, references: ['791-5968629-9'] },
  ];
  const projects = [];
  for (const p of projectSeeds) {
    projects.push(await prisma.project.upsert({ where: { code: p.code }, update: {}, create: p }));
  }
  console.log(`✓ ${projects.length} projects`);

  // Shipment from the C.H. Robinson invoice (doc 2) + CBP 7501 (doc 3).
  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber: '550773455',
      arsNumber: 'Ars-060-26',
      containerNumber: 'TCNU5487540',
      entryNumber: '791-5968629-9',
      blNumber: 'HLCUKHI260348810',
      status: 'PROCESSING',
      originPort: 'Qasim',
      destinationPort: 'Savannah',
      vessel: 'MAERSK ATLANTA',
      voyage: '614W',
      carrier: 'NILEDUTCH LION (HLCU)',
      commodity: "Men's Pullover 100%/90%",
      containerType: '40HC',
      containerCount: 1,
      weightKg: 13500,
      volumeM3: 67.04,
      cartonCount: 1029,
      countryOfOrigin: 'PK',
      customerId: byCode.DEIRA.id,
      projects: { connect: { id: projects[2].id } },
    },
  });
  console.log('✓ Sample shipment (Ars-060-26)');

  // Invoice combining broker charges ($265) + a per-container commission ($1,400).
  const year = new Date().getFullYear();
  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${year}-0001`,
      status: 'SENT',
      currency: 'USD',
      baseCost: 265,
      commissionType: 'PER_CONTAINER',
      commissionRate: 1400,
      commissionAmount: 1400,
      totalAmount: 1665,
      sentAt: new Date(),
      customerId: byCode.DEIRA.id,
      projectId: projects[2].id,
      shipmentId: shipment.id,
      items: {
        create: [
          { description: 'Customs Entry Service US', category: 'BROKER_FEE', quantity: 1, unitPrice: 120, amount: 120 },
          { description: 'Trade Disruption Surcharge', category: 'BROKER_FEE', quantity: 1, unitPrice: 45, amount: 45 },
          { description: 'Delivery Order Fees', category: 'BROKER_FEE', quantity: 1, unitPrice: 75, amount: 75 },
          { description: 'Courier Services', category: 'BROKER_FEE', quantity: 1, unitPrice: 25, amount: 25 },
        ],
      },
    },
  });
  console.log('✓ Sample invoice INV-' + year + '-0001');

  await prisma.activity.create({
    data: { type: 'OTHER', description: 'Clearway workspace seeded', actorId: admin.id },
  });
}

main()
  .then(() => console.log('\n🌱 Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
