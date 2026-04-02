import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Insurance Aggregator CRM database...');

  // ─── Cleanup existing data (reverse dependency order) ─────────────────────
  console.log('Cleaning up existing seed data...');
  await prisma.activity.deleteMany({});
  await prisma.allocationPool.deleteMany({});
  await prisma.uwAssignment.deleteMany({});
  await prisma.accountsQueueItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.endorsement.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.customerID.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.commissionSchedule.deleteMany({});
  await prisma.coverageInclusion.deleteMany({});
  await prisma.riskModifier.deleteMany({});
  await prisma.rateTable.deleteMany({});
  await prisma.referenceData.deleteMany({});
  await prisma.product.deleteMany({});
  console.log('Cleanup done.');

  const password = await bcrypt.hash('password123', 10);

  // ─── Users (8) ──────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oceanus.ae' },
    update: {},
    create: { email: 'admin@oceanus.ae', password, name: 'System Admin', role: 'ADMIN', department: 'ADMIN', language: 'en' },
  });

  const salesExec1 = await prisma.user.upsert({
    where: { email: 'sarah@oceanus.ae' },
    update: {},
    create: { email: 'sarah@oceanus.ae', password, name: 'Sarah Al-Rashid', role: 'SALES_EXEC', department: 'SALES', language: 'ar' },
  });

  const salesExec2 = await prisma.user.upsert({
    where: { email: 'omar@oceanus.ae' },
    update: {},
    create: { email: 'omar@oceanus.ae', password, name: 'Omar Hassan', role: 'SALES_EXEC', department: 'SALES', language: 'en' },
  });

  const salesAdmin = await prisma.user.upsert({
    where: { email: 'layla@oceanus.ae' },
    update: {},
    create: { email: 'layla@oceanus.ae', password, name: 'Layla Al-Mansoori', role: 'SALES_ADMIN', department: 'SALES', language: 'ar' },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'fatima@oceanus.ae' },
    update: {},
    create: { email: 'fatima@oceanus.ae', password, name: 'Fatima Al-Maktoum', role: 'ACCOUNTANT', department: 'ACCOUNTS', language: 'en' },
  });

  const uw1 = await prisma.user.upsert({
    where: { email: 'ahmed@oceanus.ae' },
    update: {},
    create: { email: 'ahmed@oceanus.ae', password, name: 'Ahmed Al-Kaabi', role: 'UNDERWRITER', department: 'UNDERWRITING', language: 'en' },
  });

  const uw2 = await prisma.user.upsert({
    where: { email: 'rania@oceanus.ae' },
    update: {},
    create: { email: 'rania@oceanus.ae', password, name: 'Rania Khalil', role: 'UNDERWRITER', department: 'UNDERWRITING', language: 'ar' },
  });

  const uwManager = await prisma.user.upsert({
    where: { email: 'hassan@oceanus.ae' },
    update: {},
    create: { email: 'hassan@oceanus.ae', password, name: 'Hassan Al-Falasi', role: 'UW_MANAGER', department: 'UNDERWRITING', language: 'en' },
  });

  console.log('Created 8 users');

  // ─── UW-to-SalesExec Mappings ──────────────────────────────────────────────

  await prisma.user.update({ where: { id: salesExec1.id }, data: { assignedUnderwriterId: uw1.id } });
  await prisma.user.update({ where: { id: salesExec2.id }, data: { assignedUnderwriterId: uw2.id } });
  await prisma.user.update({ where: { id: salesAdmin.id }, data: { assignedUnderwriterId: uw1.id } });

  console.log('Mapped sales executives to underwriters');

  // ─── Leads (5) ──────────────────────────────────────────────────────────────

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        ref: 'L-2026-0001',
        productType: 'cargo',
        formData: JSON.stringify({ policyType: 'Open Cover', conveyanceMode: 'Sea', commodity: 'Electronics', cargoValue: '500000', iccClause: 'ICC (A)', claims: 'None' }),
        fullName: 'Mohammed Ali',
        email: 'mohammed@tradeco.ae',
        phone: '+971-50-111-2233',
        company: 'TradeCo International',
        nationality: 'United Arab Emirates',
        residence: 'United Arab Emirates',
        currency: 'AED',
        language: 'ar',
        status: 'new',
        source: 'web',
        score: 65,
        lastActivityAt: new Date(),
      },
    }),
    prisma.lead.upsert({
      where: { ref: 'L-2026-0002' },
      update: {},
      create: {
        ref: 'L-2026-0002',
        productType: 'hull',
        formData: JSON.stringify({ vesselName: 'MV Gulf Star', hullType: 'Bulk Carrier', flag: 'UAE', buildYear: '2018', vesselValue: '8000000', claims: 'None' }),
        quotesData: JSON.stringify([
          { id: 1, insurer: 'Orient Insurance', premium: 56000, coverage: 8000000 },
          { id: 2, insurer: 'AXA Gulf', premium: 64000, coverage: 8000000 },
        ]),
        fullName: 'Khalid Hassan',
        email: 'khalid@gulfship.ae',
        phone: '+971-50-444-5566',
        company: 'Gulf Shipping Co.',
        nationality: 'United Arab Emirates',
        residence: 'United Arab Emirates',
        currency: 'USD',
        language: 'en',
        status: 'quoted',
        source: 'web',
        score: 85,
        assignedToId: salesExec1.id,
        lastActivityAt: new Date(),
      },
    }),
    prisma.lead.upsert({
      where: { ref: 'L-2026-0003' },
      update: {},
      create: {
        ref: 'L-2026-0003',
        productType: 'pleasure',
        formData: JSON.stringify({ craftName: 'Sea Breeze', craftType: 'Motor Yacht', builder: 'Sunseeker', craftValue: '1200000', navArea: 'UAE Waters', claims: 'None' }),
        quotesData: JSON.stringify([{ id: 1, insurer: 'AXA Gulf', premium: 18000, coverage: 1200000 }]),
        selectedQuote: JSON.stringify({ id: 1, insurer: 'AXA Gulf', premium: 18000, coverage: 1200000 }),
        fullName: 'Sara Mahmoud',
        email: 'sara@outlook.ae',
        phone: '+971-55-777-8899',
        nationality: 'United Arab Emirates',
        residence: 'United Arab Emirates',
        currency: 'AED',
        language: 'en',
        status: 'converted',
        source: 'web',
        score: 70,
        assignedToId: salesExec2.id,
        lastActivityAt: new Date(),
      },
    }),
    prisma.lead.upsert({
      where: { ref: 'L-2026-0004' },
      update: {},
      create: {
        ref: 'L-2026-0004',
        productType: 'liability',
        formData: JSON.stringify({ vesselName: 'MV Blue Pearl', liabilityType: 'P&I', coverage: '5000000', claims: 'Minor' }),
        fullName: 'Nasser Al-Dosari',
        email: 'nasser@bluefleet.ae',
        phone: '+971-50-222-3344',
        company: 'Blue Fleet Marine',
        nationality: 'United Arab Emirates',
        residence: 'United Arab Emirates',
        currency: 'AED',
        language: 'ar',
        status: 'converted',
        source: 'broker',
        score: 75,
        assignedToId: salesExec1.id,
        lastActivityAt: new Date(),
      },
    }),
    prisma.lead.upsert({
      where: { ref: 'L-2026-0005' },
      update: {},
      create: {
        ref: 'L-2026-0005',
        productType: 'jetski',
        formData: JSON.stringify({ craftName: 'Yamaha FX', craftType: 'PWC', craftValue: '80000', navArea: 'UAE Waters' }),
        fullName: 'Ali Saeed',
        email: 'ali@hotmail.ae',
        phone: '+971-55-666-7788',
        currency: 'AED',
        language: 'en',
        status: 'lost',
        source: 'social',
        score: 25,
        declineReason: 'price_too_high',
        lastActivityAt: new Date(),
      },
    }),
  ]);

  console.log(`Created ${leads.length} leads`);

  // ─── Customer IDs (3) from converted leads ─────────────────────────────────

  const customer1 = await prisma.customerID.upsert({
    where: { ref: 'C-L-2026-0003-001' },
    update: {},
    create: {
      ref: 'C-L-2026-0003-001',
      leadId: leads[2].id,
      customerName: 'Sara Mahmoud',
      email: 'sara@outlook.ae',
      phone: '+971-55-777-8899',
      nationality: 'United Arab Emirates',
      residence: 'United Arab Emirates',
      currency: 'AED',
      language: 'en',
      createdById: salesExec2.id,
    },
  });

  const customer2 = await prisma.customerID.upsert({
    where: { ref: 'C-L-2026-0004-001' },
    update: {},
    create: {
      ref: 'C-L-2026-0004-001',
      leadId: leads[3].id,
      customerName: 'Nasser Al-Dosari',
      email: 'nasser@bluefleet.ae',
      phone: '+971-50-222-3344',
      company: 'Blue Fleet Marine',
      nationality: 'United Arab Emirates',
      residence: 'United Arab Emirates',
      currency: 'AED',
      language: 'ar',
      createdById: salesExec1.id,
    },
  });

  const customer3 = await prisma.customerID.upsert({
    where: { ref: 'C-L-2026-0002-001' },
    update: {},
    create: {
      ref: 'C-L-2026-0002-001',
      leadId: leads[1].id,
      customerName: 'Khalid Hassan',
      email: 'khalid@gulfship.ae',
      phone: '+971-50-444-5566',
      company: 'Gulf Shipping Co.',
      nationality: 'United Arab Emirates',
      residence: 'United Arab Emirates',
      currency: 'USD',
      language: 'en',
      createdById: salesExec1.id,
    },
  });

  console.log('Created 3 customers');

  // ─── Policies (4) ──────────────────────────────────────────────────────────

  const policy1 = await prisma.policy.upsert({
    where: { ref: 'P-2026-0001' },
    update: {},
    create: {
      ref: 'P-2026-0001',
      customerIdId: customer1.id,
      insurer: 'AXA Gulf',
      product: 'PLEASURE',
      premium: 18000,
      sumInsured: 1200000,
      commission: 2700,
      commissionRate: 15,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      // UW-filled fields
      policyNumber: 'AXA-PL-2026-00451',
      policyHolderName: 'Sara Mahmoud',
      premiumCharged: 18500,
      debitNoteNumber: 'DN-AXA-2026-0451',
      debitNoteAmount: 18500,
      creditNoteNumber: 'CN-AXA-2026-0451',
      creditNoteAmount: 2775,
      issuedById: uw1.id,
      issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  const policy2 = await prisma.policy.create({
    data: {
      ref: 'P-2026-0002',
      customerIdId: customer2.id,
      insurer: 'Orient Insurance',
      product: 'LIABILITY',
      premium: 45000,
      sumInsured: 5000000,
      commission: 6750,
      commissionRate: 15,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      // UW-filled fields
      policyNumber: 'OI-LB-2026-01238',
      policyHolderName: 'Nasser Al-Dosari / Blue Fleet Marine',
      premiumCharged: 46200,
      debitNoteNumber: 'DN-OI-2026-1238',
      debitNoteAmount: 46200,
      creditNoteNumber: 'CN-OI-2026-1238',
      creditNoteAmount: 6930,
      issuedById: uw2.id,
      issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const policy3 = await prisma.policy.create({
    data: {
      ref: 'P-2026-0003',
      customerIdId: customer3.id,
      insurer: 'Oman Insurance',
      product: 'HULL',
      premium: 64000,
      sumInsured: 8000000,
      commission: 9600,
      commissionRate: 15,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'PENDING_UW',
    },
  });

  const policy4 = await prisma.policy.create({
    data: {
      ref: 'P-2026-0004',
      customerIdId: customer2.id,
      insurer: 'Abu Dhabi National Insurance',
      product: 'CARGO',
      premium: 7500,
      sumInsured: 3000000,
      commission: 1125,
      commissionRate: 15,
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
      status: 'CANCELLED',
      // UW-filled fields (filled before cancellation)
      policyNumber: 'ADNIC-CG-2025-09821',
      policyHolderName: 'Blue Fleet Marine',
      premiumCharged: 7800,
      debitNoteNumber: 'DN-ADNIC-2025-9821',
      debitNoteAmount: 7800,
      issuedById: uw1.id,
      issuedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Created 4 policies');

  // ─── Endorsements (3) ──────────────────────────────────────────────────────

  const endorsement1 = await prisma.endorsement.create({
    data: {
      ref: 'E-2026-0001',
      policyId: policy4.id,
      customerIdId: customer2.id,
      type: 'CANCELLATION',
      status: 'COMPLETED',
      details: JSON.stringify({ reason: 'Business closure', effectiveDate: new Date().toISOString() }),
      effectiveDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      reason: 'Business closure - ceasing maritime cargo operations',
      financialImpact: -3900,
      creditNoteNumber: 'CN-ADNIC-2025-9821-C',
      creditNoteAmount: 3900,
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      requestedById: salesExec1.id,
      processedById: uw1.id,
    },
  });

  const endorsement2 = await prisma.endorsement.create({
    data: {
      ref: 'E-2026-0002',
      policyId: policy1.id,
      customerIdId: customer1.id,
      type: 'EXTENSION',
      status: 'PENDING_APPROVAL',
      details: JSON.stringify({ newEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Extended voyage' }),
      effectiveDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      reason: 'Extended voyage - yacht departing for 2-year Mediterranean trip',
      financialImpact: 9000,
      requestedById: salesExec2.id,
    },
  });

  const endorsement3 = await prisma.endorsement.create({
    data: {
      ref: 'E-2026-0003',
      policyId: policy2.id,
      customerIdId: customer2.id,
      type: 'NAME_CHANGE',
      status: 'DRAFT',
      details: JSON.stringify({ oldName: 'Blue Fleet Marine', newName: 'Blue Fleet Marine LLC' }),
      reason: 'Company restructuring - LLC formation',
      financialImpact: 500,
      requestedById: salesExec1.id,
    },
  });

  console.log('Created 3 endorsements');

  // ─── Invoices (5 - all formats) ─────────────────────────────────────────────

  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      customerIdId: customer1.id,
      policyId: policy1.id,
      type: 'NEW_POLICY',
      amount: 18000,
      vat: 900,
      total: 18900,
      currency: 'AED',
      status: 'PAID',
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      receiptAmount: 18900,
      paymentDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      paymentMode: 'Online',
      createdById: salesExec2.id,
      approvedById: accountant.id,
      approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      customerIdId: customer2.id,
      policyId: policy2.id,
      type: 'NEW_POLICY',
      amount: 45000,
      vat: 2250,
      total: 47250,
      currency: 'AED',
      status: 'APPROVED',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      receiptAmount: 47250,
      paymentDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      paymentMode: 'Direct',
      createdById: salesExec1.id,
      approvedById: accountant.id,
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0003',
      customerIdId: customer3.id,
      policyId: policy3.id,
      type: 'NEW_POLICY',
      amount: 64000,
      vat: 3200,
      total: 67200,
      currency: 'USD',
      status: 'PENDING_APPROVAL',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      receiptAmount: 67200,
      paymentMode: 'Cheque',
      createdById: salesExec1.id,
    },
  });

  const invoice4 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001-EXT-1',
      customerIdId: customer1.id,
      policyId: policy1.id,
      endorsementId: endorsement2.id,
      type: 'EXTENSION',
      amount: 9000,
      vat: 450,
      total: 9450,
      currency: 'AED',
      status: 'PENDING_APPROVAL',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: salesExec2.id,
    },
  });

  const invoice5 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002-NC-1',
      customerIdId: customer2.id,
      policyId: policy2.id,
      endorsementId: endorsement3.id,
      type: 'NAME_CHANGE',
      amount: 500,
      vat: 25,
      total: 525,
      currency: 'AED',
      status: 'DRAFT',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: salesExec1.id,
    },
  });

  console.log('Created 5 invoices (all formats)');

  // ─── Accounts Queue Items (3) ──────────────────────────────────────────────

  await prisma.accountsQueueItem.create({
    data: {
      type: 'APPROVAL',
      invoiceId: invoice3.id,
      status: 'PENDING',
    },
  });

  await prisma.accountsQueueItem.create({
    data: {
      type: 'APPROVAL',
      invoiceId: invoice4.id,
      endorsementId: endorsement2.id,
      status: 'PENDING',
    },
  });

  await prisma.accountsQueueItem.create({
    data: {
      type: 'COMPLETION',
      endorsementId: endorsement1.id,
      status: 'COMPLETED',
      assignedToId: accountant.id,
      processedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      notes: 'Cancellation processed and confirmed',
    },
  });

  console.log('Created 3 accounts queue items');

  // ─── UW Assignments (3) ────────────────────────────────────────────────────

  await prisma.uwAssignment.create({
    data: {
      policyId: policy3.id,
      underwriterId: uw1.id,
      assignedById: uwManager.id,
      status: 'QUEUED',
      notes: 'New hull policy - please review survey report',
    },
  });

  await prisma.uwAssignment.create({
    data: {
      policyId: policy1.id,
      underwriterId: uw1.id,
      assignedById: uwManager.id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.uwAssignment.create({
    data: {
      endorsementId: endorsement1.id,
      underwriterId: uw2.id,
      assignedById: uwManager.id,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notes: 'Cancellation endorsement processed',
    },
  });

  console.log('Created 3 UW assignments');

  // ─── Allocation Pools (3 with language dimension) ──────────────────────────

  const pool1 = await prisma.allocationPool.create({
    data: {
      name: 'Cargo & Hull Team (EN)',
      productTypes: JSON.stringify(['CARGO', 'HULL', 'BARGE']),
      languages: JSON.stringify(['en']),
      maxDailyLeads: 10,
      maxWeeklyLeads: 50,
    },
  });

  const pool2 = await prisma.allocationPool.create({
    data: {
      name: 'Leisure Craft Team (All)',
      productTypes: JSON.stringify(['PLEASURE', 'JETSKI', 'SPEEDBOAT']),
      languages: JSON.stringify(['en', 'ar']),
      maxDailyLeads: 15,
      maxWeeklyLeads: 60,
    },
  });

  const pool3 = await prisma.allocationPool.create({
    data: {
      name: 'Liability Specialists (AR)',
      productTypes: JSON.stringify(['LIABILITY']),
      languages: JSON.stringify(['ar']),
      maxDailyLeads: 5,
      maxWeeklyLeads: 25,
    },
  });

  await prisma.allocationPoolAgent.createMany({
    data: [
      { poolId: pool1.id, userId: salesExec2.id },
      { poolId: pool2.id, userId: salesExec2.id },
      { poolId: pool2.id, userId: salesExec1.id },
      { poolId: pool3.id, userId: salesExec1.id },
    ],
  });

  console.log('Created 3 allocation pools with agents');

  // ─── Assignment Logs ────────────────────────────────────────────────────────

  await prisma.leadAssignmentLog.createMany({
    data: [
      {
        leadId: leads[1].id,
        assignedToId: salesExec1.id,
        poolId: pool1.id,
        method: 'ROUND_ROBIN',
        reason: "Auto-assigned via pool 'Cargo & Hull Team (EN)'",
      },
      {
        leadId: leads[2].id,
        assignedToId: salesExec2.id,
        poolId: pool2.id,
        method: 'ROUND_ROBIN',
        reason: "Auto-assigned via pool 'Leisure Craft Team (All)'",
      },
      {
        leadId: leads[3].id,
        assignedToId: salesExec1.id,
        poolId: pool3.id,
        method: 'ROUND_ROBIN',
        reason: "Auto-assigned via pool 'Liability Specialists (AR)'",
      },
    ],
  });

  console.log('Created assignment logs');

  // ─── Activity Logs ──────────────────────────────────────────────────────────

  await prisma.activity.createMany({
    data: [
      { entityId: leads[0].id, entityType: 'lead', userId: admin.id, action: 'CREATED', detail: 'Lead created from web form' },
      { entityId: leads[1].id, entityType: 'lead', userId: salesExec1.id, action: 'STATUS_CHANGE', detail: 'Status changed to quoted' },
      { entityId: leads[2].id, entityType: 'lead', userId: salesExec2.id, action: 'CONVERTED', detail: 'Lead converted to Customer ID C-L-2026-0003-001' },
      { entityId: leads[3].id, entityType: 'lead', userId: salesExec1.id, action: 'CONVERTED', detail: 'Lead converted to Customer ID C-L-2026-0004-001' },
      { entityId: customer1.id, entityType: 'customer', userId: salesExec2.id, action: 'CREATED', detail: 'Customer ID created from lead L-2026-0003' },
      { entityId: customer2.id, entityType: 'customer', userId: salesExec1.id, action: 'CREATED', detail: 'Customer ID created from lead L-2026-0004' },
      { entityId: policy1.id, entityType: 'policy', userId: uw1.id, action: 'ISSUED', detail: 'Policy issued - AXA-PL-2026-00451' },
      { entityId: policy2.id, entityType: 'policy', userId: uw2.id, action: 'ISSUED', detail: 'Policy issued - OI-LB-2026-01238' },
      { entityId: policy4.id, entityType: 'policy', userId: uw1.id, action: 'CANCELLED', detail: 'Policy cancelled via endorsement E-2026-0001' },
    ],
  });

  console.log('Created activity logs');

  // ─── Notifications ────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      { type: 'QUEUE_ITEM', title: 'New Approval Request', body: 'Invoice INV-2026-0003 pending your approval (USD 67,200)', entityId: invoice3.id, entityType: 'invoice', userId: accountant.id },
      { type: 'QUEUE_ITEM', title: 'New Approval Request', body: 'Invoice INV-2026-0001-EXT-1 for extension endorsement pending approval (AED 9,450)', entityId: invoice4.id, entityType: 'invoice', userId: accountant.id },
      { type: 'UW_ASSIGNMENT', title: 'New UW Assignment', body: 'Hull policy P-2026-0003 assigned for underwriting review', entityId: policy3.id, entityType: 'policy', userId: uw1.id },
      { type: 'POLICY_ISSUED', title: 'Policy Issued', body: 'Policy P-2026-0001 has been issued by Ahmed Al-Kaabi', entityId: policy1.id, entityType: 'policy', userId: salesExec2.id },
      { type: 'ENDORSEMENT', title: 'Cancellation Completed', body: 'Cancellation endorsement E-2026-0001 for policy P-2026-0004 has been completed', entityId: policy4.id, entityType: 'endorsement', userId: salesExec1.id },
    ],
  });

  console.log('Created notifications');

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── PRODUCT CATALOG SEED DATA ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Insurers (5) — canonical backend set ─────────────────────────────────
  const insurerOI = await prisma.insurer.upsert({
    where: { code: 'OI' },
    update: {},
    create: { code: 'OI', name: 'Orient Insurance',            logo: 'OI', rating: 'A',  specialty: 'All Marine Risks',        competitiveFactor: 0.92, responseHours: 2, sortOrder: 0 },
  });
  const insurerAX = await prisma.insurer.upsert({
    where: { code: 'AX' },
    update: {},
    create: { code: 'AX', name: 'AXA Gulf',                    logo: 'AX', rating: 'A+', specialty: 'Cargo & Transit',          competitiveFactor: 0.97, responseHours: 4, sortOrder: 1 },
  });
  const insurerOM = await prisma.insurer.upsert({
    where: { code: 'OM' },
    update: {},
    create: { code: 'OM', name: 'Oman Insurance',              logo: 'OM', rating: 'A',  specialty: 'Hull & Machinery',         competitiveFactor: 1.00, responseHours: 1, sortOrder: 2 },
  });
  const insurerAD = await prisma.insurer.upsert({
    where: { code: 'AD' },
    update: {},
    create: { code: 'AD', name: 'Abu Dhabi National Insurance', logo: 'AD', rating: 'A+', specialty: 'P&I & Liability',          competitiveFactor: 1.05, responseHours: 3, sortOrder: 3 },
  });
  const insurerDT = await prisma.insurer.upsert({
    where: { code: 'DT' },
    update: {},
    create: { code: 'DT', name: 'Dar Al Takaful',              logo: 'DT', rating: 'A-', specialty: 'Takaful Marine',           competitiveFactor: 1.11, responseHours: 6, sortOrder: 4 },
  });
  const allInsurers = [insurerOI, insurerAX, insurerOM, insurerAD, insurerDT];
  console.log('Created 5 insurers');

  // ─── Products (7) — exact config from PRODUCT_TYPES + DEFAULTS + BASE_RATES ───
  const productDefs = [
    {
      code: 'CARGO', label: 'Marine Cargo', description: 'Goods in transit — single shipment or annual open cover',
      iconKey: '📦', color: '#f97316', estimatedMinutes: 3, badge: 'Orient', scoringWeight: 20,
      formStepsJson: JSON.stringify(['Policy Type', 'Shipment Details', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['policyType', 'conveyanceMode', 'interestType'],
        step1: ['originPort', 'destinationPort', 'tradeRoute', 'shipmentCount', 'commodity', 'cargoCategory', 'cargoValue', 'annualTurnover', 'maxAnySending', 'maxAnyLocation', 'sumInsuredBasis', 'packingType', 'iccClause', 'warStrikes', 'letterOfCredit', 'inlandTransit', 'storageDuration', 'transshipment', 'dutyInsurance', 'increasedValue', 'perishable', 'claims', 'effectiveDate'],
        step2: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ policyType: 'Open Cover', conveyanceMode: 'Sea', interestType: 'Buyer (CIF)', iccClause: 'ICC (A) – All Risks', warStrikes: 'Yes', claims: 'None', sumInsuredBasis: 'CIF + 10% (Standard)', inlandTransit: 'Yes', storageDuration: 'None / In Transit Only', transshipment: 'No', dutyInsurance: 'No', increasedValue: 'No' }),
      baseRateMin: 0.0015, baseRateMax: 0.0035, deductibleRate: 0.005, coverageMultiplier: 1.10, valueField: 'cargoValue', sortOrder: 0,
    },
    {
      code: 'HULL', label: 'Marine Hull', description: 'Cargo vessels, tugs, supply vessels, dredgers — blue water or coastal',
      iconKey: '🚢', color: '#0ea5e9', estimatedMinutes: 4, badge: 'Orient', scoringWeight: 25,
      formStepsJson: JSON.stringify(['Vessel Info', 'Operations', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['vesselName', 'hullType', 'flag', 'imo', 'buildYear', 'grt', 'vesselValue', 'classification', 'hullMaterial', 'enginePower', 'surveyStatus', 'operatingWaters', 'pandi', 'tplCover', 'tplLimit'],
        step1: ['tradeRoute', 'cargoType', 'homePort', 'crew', 'voyages', 'lossOfHire', 'pollution', 'claims', 'effectiveDate'],
        step2: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ flag: 'United Arab Emirates', operatingWaters: 'Coastal / Inland', tradeRoute: 'Arabian Gulf', pandi: 'Yes', claims: 'None', hullMaterial: 'Steel', surveyStatus: 'In Class' }),
      baseRateMin: 0.005, baseRateMax: 0.015, deductibleRate: 0.01, coverageMultiplier: 1.0, valueField: 'vesselValue', sortOrder: 1,
    },
    {
      code: 'LIABILITY', label: 'Marine Liability', description: "Ship repairer's, charterer's, freight forwarder's & P&I liability",
      iconKey: '⚖️', color: '#8b5cf6', estimatedMinutes: 3, badge: 'Orient', scoringWeight: 20,
      formStepsJson: JSON.stringify(['Liability Type', 'Details', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['liabilityType'],
        step1: ['vesselName', 'flag', 'tradeRoute', 'liabilityLimit', 'annualRevenue', 'imo', 'grt', 'fleetSize', 'annualTurnover', 'shipmentCount', 'homePort', 'crew', 'claims', 'effectiveDate'],
        step2: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ liabilityType: "Charterer's Liability", flag: 'United Arab Emirates', operatingArea: 'Arabian Gulf', claims: 'None' }),
      baseRateMin: 0.008, baseRateMax: 0.025, deductibleRate: 0.02, coverageMultiplier: 1.0, valueField: 'liabilityLimit', sortOrder: 2,
    },
    {
      code: 'PLEASURE', label: 'Pleasure Crafts', description: 'Yachts, speedboats, jet skis — tailored cover from small boats to mega yachts',
      iconKey: '⛵', color: '#6366f1', estimatedMinutes: 3, badge: 'Orient', scoringWeight: 10,
      formStepsJson: JSON.stringify(['Craft Details', 'Use & Cover', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['craftName', 'craftType', 'builder', 'model', 'buildYear', 'length', 'craftValue', 'flag', 'engineType', 'hullMaterial', 'tender', 'tenderValue'],
        step1: ['navArea', 'use', 'marina', 'crew', 'experience', 'surveyStatus', 'tplCover', 'tplLimit', 'racing', 'claims', 'effectiveDate'],
        step2: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ flag: 'United Arab Emirates', craftType: 'Motor Yacht', navArea: 'UAE Waters', use: 'Private', tplCover: 'Yes', claims: 'None', hullMaterial: 'GRP / Fiberglass', surveyStatus: 'N/A' }),
      baseRateMin: 0.010, baseRateMax: 0.025, deductibleRate: 0.02, coverageMultiplier: 1.0, valueField: 'craftValue', sortOrder: 3,
    },
    {
      code: 'JETSKI', label: 'Jet Ski / PWC', description: 'Personal watercraft, wave runners',
      iconKey: '🏄', color: '#10b981', estimatedMinutes: 2, badge: null, scoringWeight: 5,
      formStepsJson: JSON.stringify(['Your PWC', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['brand', 'model', 'buildYear', 'pwcValue', 'quantity', 'country', 'usageArea', 'storage', 'racing', 'claims', 'effectiveDate'],
        step1: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ country: 'United Arab Emirates', usageArea: 'Coastal / Sea', frequency: 'Weekend only', racing: 'No', claims: 'None', storage: 'Marina / Berth', quantity: '1', licence: 'Yes' }),
      baseRateMin: 0.020, baseRateMax: 0.040, deductibleRate: 0.02, coverageMultiplier: 1.0, valueField: 'pwcValue', sortOrder: 4,
    },
    {
      code: 'SPEEDBOAT', label: 'Speedboat / RIB', description: 'Speedboats, rigid inflatable boats',
      iconKey: '🚤', color: '#f59e0b', estimatedMinutes: 2, badge: null, scoringWeight: 8,
      formStepsJson: JSON.stringify(['Your Boat', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['boatType', 'brand', 'buildYear', 'length', 'boatValue', 'engineConfig', 'country', 'use', 'storage', 'overnight', 'claims', 'effectiveDate'],
        step1: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ country: 'United Arab Emirates', waters: 'UAE Waters', storage: 'Marina Berth', overnight: 'No', trailer: 'No', experience: '1-3 years', claims: 'None' }),
      baseRateMin: 0.015, baseRateMax: 0.030, deductibleRate: 0.02, coverageMultiplier: 1.0, valueField: 'boatValue', sortOrder: 5,
    },
    {
      code: 'BARGE', label: 'Barge & Commercial', description: 'Barges, ferries, workboats, offshore support',
      iconKey: '🛳️', color: '#ec4899', estimatedMinutes: 4, badge: null, scoringWeight: 18,
      formStepsJson: JSON.stringify(['Vessel Info', 'Operations', 'Contact']),
      formFieldsJson: JSON.stringify({
        step0: ['vesselType', 'vesselName', 'flag', 'buildYear', 'length', 'vesselValue', 'classification'],
        step1: ['operatingArea', 'opType', 'cargoType', 'crew', 'lossOfHire', 'pollution', 'claims', 'effectiveDate'],
        step2: ['fullName', 'company', 'email', 'phone', 'nationality', 'residence', 'contactPref', 'notes', 'agreed'],
      }),
      defaultsJson: JSON.stringify({ flag: 'United Arab Emirates', operatingArea: 'UAE Waters', opType: 'Coastal', lossOfHire: 'No', pollution: 'No', claims: 'None' }),
      baseRateMin: 0.006, baseRateMax: 0.014, deductibleRate: 0.0075, coverageMultiplier: 1.0, valueField: 'vesselValue', sortOrder: 6,
    },
  ];

  const products: Record<string, any> = {};
  for (const pd of productDefs) {
    products[pd.code] = await prisma.product.upsert({
      where: { code: pd.code },
      update: { formFieldsJson: pd.formFieldsJson, defaultsJson: pd.defaultsJson },
      create: pd,
    });
  }
  console.log('Created 7 products');

  // ─── Rate Tables (35 = 7 products × 5 insurers) — exact QUOTE_RATES values ──
  // These match the QUOTE_RATES constant from product-types.ts
  const rateValues: Record<string, number[]> = {
    CARGO:     [0.0015, 0.0019, 0.0022, 0.0026, 0.0032],
    HULL:      [0.006,  0.008,  0.010,  0.012,  0.015 ],
    LIABILITY: [0.009,  0.011,  0.014,  0.018,  0.022 ],
    PLEASURE:  [0.011,  0.014,  0.017,  0.020,  0.024 ],
    JETSKI:    [0.022,  0.027,  0.030,  0.034,  0.040 ],
    SPEEDBOAT: [0.016,  0.020,  0.024,  0.028,  0.032 ],
    BARGE:     [0.007,  0.009,  0.011,  0.013,  0.015 ],
  };

  let rateCount = 0;
  for (const [productCode, rates] of Object.entries(rateValues)) {
    for (let i = 0; i < allInsurers.length; i++) {
      await prisma.rateTable.upsert({
        where: { productId_insurerId_effectiveFrom: { productId: products[productCode].id, insurerId: allInsurers[i].id, effectiveFrom: new Date('2026-01-01') } },
        update: {},
        create: { productId: products[productCode].id, insurerId: allInsurers[i].id, rate: rates[i], effectiveFrom: new Date('2026-01-01') },
      });
      rateCount++;
    }
  }
  console.log(`Created ${rateCount} rate table entries`);

  // ─── Risk Modifiers (~65 rows) — exact values from generateQuotes() ────────
  const riskModifierDefs = [
    // Claims history loading — global (all products)
    { modifierType: 'CLAIMS', conditionKey: 'None',  factor: 1.0,  label: '0 claims', sortOrder: 0 },
    { modifierType: 'CLAIMS', conditionKey: '0',     factor: 1.0,  label: '0 claims', sortOrder: 1 },
    { modifierType: 'CLAIMS', conditionKey: '1',     factor: 1.2,  label: '1 claim',  sortOrder: 2 },
    { modifierType: 'CLAIMS', conditionKey: '2',     factor: 1.45, label: '2 claims', sortOrder: 3 },
    { modifierType: 'CLAIMS', conditionKey: '2+',    factor: 1.45, label: '2+ claims', sortOrder: 4 },
    { modifierType: 'CLAIMS', conditionKey: '3+',    factor: 1.75, label: '3+ claims', sortOrder: 5 },

    // Vessel age loading — global
    { modifierType: 'AGE', conditionKey: '0-5',   factor: 0.85, label: '0-5 years old',   sortOrder: 0 },
    { modifierType: 'AGE', conditionKey: '6-10',  factor: 1.0,  label: '6-10 years old',  sortOrder: 1 },
    { modifierType: 'AGE', conditionKey: '11-15', factor: 1.15, label: '11-15 years old', sortOrder: 2 },
    { modifierType: 'AGE', conditionKey: '16-20', factor: 1.3,  label: '16-20 years old', sortOrder: 3 },
    { modifierType: 'AGE', conditionKey: '21+',   factor: 1.55, label: '21+ years old',  sortOrder: 4 },

    // ICC clause factor — cargo only
    { modifierType: 'ICC', conditionKey: 'ICC (A) – All Risks',    factor: 1.0,  label: 'All Risks', sortOrder: 0 },
    { modifierType: 'ICC', conditionKey: 'ICC (B) – Named Perils', factor: 0.65, label: 'Named Perils', sortOrder: 1 },
    { modifierType: 'ICC', conditionKey: 'ICC (C) – Basic Cover',  factor: 0.45, label: 'Basic Cover', sortOrder: 2 },
    { modifierType: 'ICC', conditionKey: 'ICC (C) – Basic',        factor: 0.45, label: 'Basic Cover', sortOrder: 3 },

    // Operating area / trade route loading — global
    { modifierType: 'ROUTE', conditionKey: 'Blue Water (Open Sea)',   factor: 1.25, label: 'Blue water surcharge', sortOrder: 0 },
    { modifierType: 'ROUTE', conditionKey: 'Worldwide',              factor: 1.25, label: 'Worldwide surcharge', sortOrder: 1 },
    { modifierType: 'ROUTE', conditionKey: 'Atlantic',               factor: 1.25, label: 'Atlantic surcharge', sortOrder: 2 },
    { modifierType: 'ROUTE', conditionKey: 'Pacific',                factor: 1.25, label: 'Pacific surcharge', sortOrder: 3 },
    { modifierType: 'ROUTE', conditionKey: 'Arabian Gulf',           factor: 0.9,  label: 'Gulf discount', sortOrder: 4 },
    { modifierType: 'ROUTE', conditionKey: 'UAE Waters',             factor: 0.9,  label: 'UAE Waters discount', sortOrder: 5 },
    { modifierType: 'ROUTE', conditionKey: 'Port / Harbour Only',    factor: 0.9,  label: 'Port only discount', sortOrder: 6 },
    { modifierType: 'ROUTE', conditionKey: 'default',                factor: 1.0,  label: 'Standard route', sortOrder: 7 },

    // Use / charter loading — pleasure craft
    { modifierType: 'USE', conditionKey: 'Charter',               factor: 1.3, label: 'Charter use surcharge', sortOrder: 0 },
    { modifierType: 'USE', conditionKey: 'Private + Charter',     factor: 1.3, label: 'Private + Charter surcharge', sortOrder: 1 },
    { modifierType: 'USE', conditionKey: 'Bareboat Charter',      factor: 1.3, label: 'Bareboat charter surcharge', sortOrder: 2 },
    { modifierType: 'USE', conditionKey: 'Charter / Commercial',  factor: 1.3, label: 'Commercial charter surcharge', sortOrder: 3 },
    { modifierType: 'USE', conditionKey: 'default',               factor: 1.0, label: 'Standard use', sortOrder: 4 },

    // Racing surcharge
    { modifierType: 'RACING', conditionKey: 'Yes', factor: 1.4, label: 'Racing surcharge', sortOrder: 0 },
    { modifierType: 'RACING', conditionKey: 'No',  factor: 1.0, label: 'No racing', sortOrder: 1 },

    // Conveyance mode loading — cargo
    { modifierType: 'MODE', conditionKey: 'Sea',                       factor: 1.0,  label: 'Sea (baseline)', sortOrder: 0 },
    { modifierType: 'MODE', conditionKey: 'Sea + Air (Multimodal)',    factor: 1.1,  label: 'Sea + Air multimodal', sortOrder: 1 },
    { modifierType: 'MODE', conditionKey: 'Multimodal (Sea + Air)',    factor: 1.1,  label: 'Sea + Air multimodal', sortOrder: 2 },
    { modifierType: 'MODE', conditionKey: 'Air',                       factor: 1.2,  label: 'Air freight', sortOrder: 3 },
    { modifierType: 'MODE', conditionKey: 'Land (Road/Rail)',          factor: 0.85, label: 'Land transport', sortOrder: 4 },
    { modifierType: 'MODE', conditionKey: 'Sea + Land (Multimodal)',   factor: 0.95, label: 'Sea + Land multimodal', sortOrder: 5 },
    { modifierType: 'MODE', conditionKey: 'Multimodal (Sea + Land)',   factor: 0.95, label: 'Sea + Land multimodal', sortOrder: 6 },
    { modifierType: 'MODE', conditionKey: 'default',                   factor: 1.0,  label: 'Default mode', sortOrder: 7 },

    // War & Strikes — cargo only (adds ~15%)
    { modifierType: 'WAR', conditionKey: 'Yes', factor: 1.15, label: 'War & Strikes add-on', sortOrder: 0 },
    { modifierType: 'WAR', conditionKey: 'No',  factor: 1.0,  label: 'No war cover', sortOrder: 1 },

    // Perishable surcharge — cargo
    { modifierType: 'PERISHABLE', conditionKey: 'Yes', factor: 1.2, label: 'Perishable goods surcharge', sortOrder: 0 },
    { modifierType: 'PERISHABLE', conditionKey: 'No',  factor: 1.0, label: 'Non-perishable', sortOrder: 1 },

    // TPL add-on — hull/pleasure (adds ~12%)
    { modifierType: 'TPL', conditionKey: 'Yes', factor: 1.12, label: 'TPL add-on', sortOrder: 0 },
    { modifierType: 'TPL', conditionKey: 'No',  factor: 1.0,  label: 'No TPL', sortOrder: 1 },

    // Pollution add-on — hull/barge (adds ~8%)
    { modifierType: 'POLLUTION', conditionKey: 'Yes', factor: 1.08, label: 'Pollution cover', sortOrder: 0 },
    { modifierType: 'POLLUTION', conditionKey: 'No',  factor: 1.0,  label: 'No pollution cover', sortOrder: 1 },

    // Loss of Hire — hull/barge (adds ~10%)
    { modifierType: 'LOH', conditionKey: 'Yes', factor: 1.1, label: 'Loss of Hire add-on', sortOrder: 0 },
    { modifierType: 'LOH', conditionKey: 'No',  factor: 1.0, label: 'No Loss of Hire', sortOrder: 1 },

    // ─── NEW MODIFIERS: Close all pricing gaps ──────────────────────────────

    // Cargo category risk loading — cargo
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Electronics & Machinery',   factor: 1.15, label: 'Electronics surcharge', sortOrder: 0 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Steel & Metal Products',    factor: 0.90, label: 'Steel discount', sortOrder: 1 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Foodstuffs & Perishables',  factor: 1.25, label: 'Perishables surcharge', sortOrder: 2 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Chemicals & Hazardous',     factor: 1.40, label: 'Hazardous surcharge', sortOrder: 3 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Textiles & Garments',       factor: 1.00, label: 'Textiles baseline', sortOrder: 4 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Auto Parts & Vehicles',     factor: 1.10, label: 'Auto parts surcharge', sortOrder: 5 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Building Materials',         factor: 0.85, label: 'Building materials discount', sortOrder: 6 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Pharmaceuticals',            factor: 1.20, label: 'Pharmaceuticals surcharge', sortOrder: 7 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'Oil & Petroleum Products',   factor: 1.30, label: 'Petroleum surcharge', sortOrder: 8 },
    { modifierType: 'CARGO_CATEGORY', conditionKey: 'General Merchandise',        factor: 1.00, label: 'General baseline', sortOrder: 9 },

    // Packing type risk loading — cargo
    { modifierType: 'PACKING', conditionKey: 'Full Container Load (FCL)',         factor: 0.90, label: 'FCL discount', sortOrder: 0 },
    { modifierType: 'PACKING', conditionKey: 'Less than Container Load (LCL)',    factor: 1.05, label: 'LCL surcharge', sortOrder: 1 },
    { modifierType: 'PACKING', conditionKey: 'Bulk (Unpacked)',                   factor: 1.25, label: 'Bulk surcharge', sortOrder: 2 },
    { modifierType: 'PACKING', conditionKey: 'Wooden Crates',                     factor: 1.00, label: 'Crates baseline', sortOrder: 3 },
    { modifierType: 'PACKING', conditionKey: 'Cartons on Pallets',                factor: 1.00, label: 'Pallets baseline', sortOrder: 4 },
    { modifierType: 'PACKING', conditionKey: 'Breakbulk',                         factor: 1.15, label: 'Breakbulk surcharge', sortOrder: 5 },
    { modifierType: 'PACKING', conditionKey: 'Refrigerated Container',            factor: 1.10, label: 'Reefer surcharge', sortOrder: 6 },
    { modifierType: 'PACKING', conditionKey: 'Flat Rack / Open Top',              factor: 1.20, label: 'Open top surcharge', sortOrder: 7 },

    // Letter of credit — cargo (bank due diligence = lower risk)
    { modifierType: 'LC', conditionKey: 'Yes', factor: 0.95, label: 'LC discount', sortOrder: 0 },
    { modifierType: 'LC', conditionKey: 'No',  factor: 1.00, label: 'No LC', sortOrder: 1 },

    // Hull / vessel type risk loading — hull
    { modifierType: 'HULL_TYPE', conditionKey: 'Bulk Carrier',              factor: 1.00, label: 'Bulk carrier baseline', sortOrder: 0 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Container Ship',            factor: 1.05, label: 'Container ship', sortOrder: 1 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Oil Tanker',                factor: 1.30, label: 'Oil tanker surcharge', sortOrder: 2 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Chemical Tanker',           factor: 1.35, label: 'Chemical tanker surcharge', sortOrder: 3 },
    { modifierType: 'HULL_TYPE', conditionKey: 'LNG/LPG Carrier',          factor: 1.40, label: 'LNG carrier surcharge', sortOrder: 4 },
    { modifierType: 'HULL_TYPE', conditionKey: 'General Cargo Vessel',      factor: 1.00, label: 'General cargo baseline', sortOrder: 5 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Ro-Ro Vessel',             factor: 1.10, label: 'Ro-Ro surcharge', sortOrder: 6 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Car Carrier',              factor: 1.10, label: 'Car carrier surcharge', sortOrder: 7 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Refrigerated Cargo',        factor: 1.05, label: 'Reefer vessel', sortOrder: 8 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Heavy Lift Vessel',         factor: 1.15, label: 'Heavy lift surcharge', sortOrder: 9 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Tug',                       factor: 1.20, label: 'Tug surcharge', sortOrder: 10 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Supply Vessel',             factor: 1.15, label: 'Supply vessel surcharge', sortOrder: 11 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Dredger',                   factor: 1.10, label: 'Dredger surcharge', sortOrder: 12 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Survey Vessel',             factor: 0.95, label: 'Survey vessel discount', sortOrder: 13 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Offshore Support Vessel',   factor: 1.20, label: 'Offshore support surcharge', sortOrder: 14 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Fishing Vessel',            factor: 1.25, label: 'Fishing vessel surcharge', sortOrder: 15 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Passenger Vessel',          factor: 1.30, label: 'Passenger vessel surcharge', sortOrder: 16 },
    { modifierType: 'HULL_TYPE', conditionKey: 'Other',                     factor: 1.15, label: 'Other vessel type', sortOrder: 17 },

    // Classification society — hull/barge
    { modifierType: 'CLASSIFICATION', conditionKey: "Lloyd's Register",            factor: 0.95, label: "Lloyd's discount", sortOrder: 0 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'DNV',                         factor: 0.95, label: 'DNV discount', sortOrder: 1 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'Bureau Veritas',              factor: 0.95, label: 'BV discount', sortOrder: 2 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'American Bureau of Shipping', factor: 0.95, label: 'ABS discount', sortOrder: 3 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'ClassNK',                     factor: 1.00, label: 'ClassNK baseline', sortOrder: 4 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'RINA',                        factor: 1.00, label: 'RINA baseline', sortOrder: 5 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'Korean Register',             factor: 1.00, label: 'KR baseline', sortOrder: 6 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'Unclassed',                   factor: 1.40, label: 'Unclassed surcharge', sortOrder: 7 },
    { modifierType: 'CLASSIFICATION', conditionKey: 'Other',                       factor: 1.10, label: 'Other class surcharge', sortOrder: 8 },

    // Cargo carried on hull vessel — hull
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Dry Bulk',               factor: 1.00, label: 'Dry bulk baseline', sortOrder: 0 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Liquid Bulk',            factor: 1.10, label: 'Liquid bulk surcharge', sortOrder: 1 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Containerised',          factor: 1.00, label: 'Container baseline', sortOrder: 2 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Break Bulk',             factor: 1.05, label: 'Break bulk surcharge', sortOrder: 3 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Refrigerated',           factor: 1.05, label: 'Reefer cargo', sortOrder: 4 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Heavy Lift',             factor: 1.10, label: 'Heavy lift cargo', sortOrder: 5 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Ro-Ro Cargo',            factor: 1.05, label: 'Ro-Ro cargo', sortOrder: 6 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Hazardous (IMDG)',       factor: 1.30, label: 'Hazardous cargo surcharge', sortOrder: 7 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Dredge / Spoil',         factor: 0.95, label: 'Dredge spoil', sortOrder: 8 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Sand & Aggregates',      factor: 0.90, label: 'Aggregates discount', sortOrder: 9 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'Passengers',             factor: 1.20, label: 'Passenger surcharge', sortOrder: 10 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'General Mixed',          factor: 1.00, label: 'General mixed baseline', sortOrder: 11 },
    { modifierType: 'CARGO_CARRIED', conditionKey: 'None / Not Applicable',  factor: 1.00, label: 'No cargo', sortOrder: 12 },

    // Liability sub-type — liability (CRITICAL: P&I vs Haulier = 2.77x spread)
    { modifierType: 'LIABILITY_TYPE', conditionKey: "Ship Repairer's Liability",     factor: 0.80, label: "Ship repairer's", sortOrder: 0 },
    { modifierType: 'LIABILITY_TYPE', conditionKey: "Charterer's Liability",         factor: 1.00, label: "Charterer's baseline", sortOrder: 1 },
    { modifierType: 'LIABILITY_TYPE', conditionKey: "Freight Forwarder's Liability", factor: 0.70, label: "Freight forwarder's", sortOrder: 2 },
    { modifierType: 'LIABILITY_TYPE', conditionKey: "Haulier's Liability",           factor: 0.65, label: "Haulier's", sortOrder: 3 },
    { modifierType: 'LIABILITY_TYPE', conditionKey: "Terminal Operator's Liability",  factor: 0.90, label: "Terminal operator's", sortOrder: 4 },
    { modifierType: 'LIABILITY_TYPE', conditionKey: 'Protection & Indemnity (P&I)',  factor: 1.80, label: 'P&I surcharge', sortOrder: 5 },

    // Craft type — pleasure
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Motor Yacht',              factor: 1.00, label: 'Motor yacht baseline', sortOrder: 0 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Sailing Yacht',            factor: 0.85, label: 'Sailing yacht discount', sortOrder: 1 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Catamaran',                factor: 0.90, label: 'Catamaran discount', sortOrder: 2 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Superyacht (24m+)',        factor: 1.30, label: 'Superyacht surcharge', sortOrder: 3 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Sport Boat / Speedboat',   factor: 1.20, label: 'Speedboat surcharge', sortOrder: 4 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'RIB (Rigid Inflatable)',   factor: 1.10, label: 'RIB surcharge', sortOrder: 5 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Jet Ski / PWC',            factor: 1.15, label: 'PWC surcharge', sortOrder: 6 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Fishing Boat',             factor: 0.95, label: 'Fishing boat discount', sortOrder: 7 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Inflatable / Dinghy',      factor: 0.80, label: 'Dinghy discount', sortOrder: 8 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Traditional Wooden Dhow',  factor: 1.25, label: 'Dhow surcharge', sortOrder: 9 },
    { modifierType: 'CRAFT_TYPE', conditionKey: 'Other',                    factor: 1.10, label: 'Other craft type', sortOrder: 10 },

    // Owner experience — pleasure
    { modifierType: 'EXPERIENCE', conditionKey: 'Less than 1 year', factor: 1.30, label: 'Novice surcharge', sortOrder: 0 },
    { modifierType: 'EXPERIENCE', conditionKey: '1-2 years',        factor: 1.15, label: 'Limited experience', sortOrder: 1 },
    { modifierType: 'EXPERIENCE', conditionKey: '3-5 years',        factor: 1.00, label: 'Moderate experience', sortOrder: 2 },
    { modifierType: 'EXPERIENCE', conditionKey: '5-10 years',       factor: 0.90, label: 'Experienced discount', sortOrder: 3 },
    { modifierType: 'EXPERIENCE', conditionKey: '10+ years',        factor: 0.85, label: 'Veteran discount', sortOrder: 4 },

    // Engine type — pleasure
    { modifierType: 'ENGINE', conditionKey: 'Inboard',   factor: 1.00, label: 'Inboard baseline', sortOrder: 0 },
    { modifierType: 'ENGINE', conditionKey: 'Outboard',  factor: 1.05, label: 'Outboard surcharge', sortOrder: 1 },
    { modifierType: 'ENGINE', conditionKey: 'Sail-only', factor: 0.80, label: 'Sail discount', sortOrder: 2 },
    { modifierType: 'ENGINE', conditionKey: 'Hybrid',    factor: 0.95, label: 'Hybrid discount', sortOrder: 3 },
    { modifierType: 'ENGINE', conditionKey: 'Jet Drive', factor: 1.15, label: 'Jet drive surcharge', sortOrder: 4 },

    // Survey / classification status — hull, pleasure
    { modifierType: 'SURVEY', conditionKey: 'In Class',      factor: 0.95, label: 'In class discount', sortOrder: 0 },
    { modifierType: 'SURVEY', conditionKey: 'Due Soon',      factor: 1.00, label: 'Due soon baseline', sortOrder: 1 },
    { modifierType: 'SURVEY', conditionKey: 'Overdue',       factor: 1.20, label: 'Overdue surcharge', sortOrder: 2 },
    { modifierType: 'SURVEY', conditionKey: 'Not Surveyed',  factor: 1.35, label: 'Not surveyed surcharge', sortOrder: 3 },
    { modifierType: 'SURVEY', conditionKey: 'N/A',           factor: 1.00, label: 'Not applicable', sortOrder: 4 },

    // Hull material — hull, pleasure
    { modifierType: 'HULL_MATERIAL', conditionKey: 'Steel',             factor: 1.00, label: 'Steel baseline', sortOrder: 0 },
    { modifierType: 'HULL_MATERIAL', conditionKey: 'GRP / Fiberglass',  factor: 0.95, label: 'GRP discount', sortOrder: 1 },
    { modifierType: 'HULL_MATERIAL', conditionKey: 'Aluminum',          factor: 1.00, label: 'Aluminum baseline', sortOrder: 2 },
    { modifierType: 'HULL_MATERIAL', conditionKey: 'Wood',              factor: 1.25, label: 'Wood surcharge', sortOrder: 3 },
    { modifierType: 'HULL_MATERIAL', conditionKey: 'Composite',         factor: 0.95, label: 'Composite discount', sortOrder: 4 },
    { modifierType: 'HULL_MATERIAL', conditionKey: 'Other',             factor: 1.10, label: 'Other material', sortOrder: 5 },

    // ─── CARGO OPEN COVER GAP-FIX MODIFIERS ───────────────────────────
    // ICC (Air) — separate clause for air shipments
    { modifierType: 'ICC', conditionKey: 'ICC (Air)',                    factor: 0.85, label: 'Air clause', sortOrder: 4 },

    // INLAND_TRANSIT — warehouse-to-warehouse extension
    { modifierType: 'INLAND_TRANSIT', conditionKey: 'Yes',              factor: 1.12, label: 'Inland transit extension', sortOrder: 0 },
    { modifierType: 'INLAND_TRANSIT', conditionKey: 'No',               factor: 1.00, label: 'Port-to-port only', sortOrder: 1 },
    { modifierType: 'INLAND_TRANSIT', conditionKey: 'default',          factor: 1.00, label: 'Default', sortOrder: 2 },

    // STORAGE — warehousing duration before/after transit
    { modifierType: 'STORAGE', conditionKey: 'None / In Transit Only',  factor: 1.00, label: 'No storage', sortOrder: 0 },
    { modifierType: 'STORAGE', conditionKey: 'Up to 30 days',          factor: 1.05, label: '30-day storage', sortOrder: 1 },
    { modifierType: 'STORAGE', conditionKey: '31–60 days',             factor: 1.10, label: '60-day storage', sortOrder: 2 },
    { modifierType: 'STORAGE', conditionKey: '61–90 days',             factor: 1.18, label: '90-day storage', sortOrder: 3 },
    { modifierType: 'STORAGE', conditionKey: 'Over 90 days',           factor: 1.30, label: 'Extended storage', sortOrder: 4 },
    { modifierType: 'STORAGE', conditionKey: 'default',                factor: 1.00, label: 'Default', sortOrder: 5 },

    // DUTY — import duty insurance add-on
    { modifierType: 'DUTY', conditionKey: 'Yes',                       factor: 1.08, label: 'Duty insurance', sortOrder: 0 },
    { modifierType: 'DUTY', conditionKey: 'No',                        factor: 1.00, label: 'No duty cover', sortOrder: 1 },
    { modifierType: 'DUTY', conditionKey: 'default',                   factor: 1.00, label: 'Default', sortOrder: 2 },

    // INCREASED_VALUE — cover above declared CIF
    { modifierType: 'INCREASED_VALUE', conditionKey: 'Yes',            factor: 1.05, label: 'Increased value cover', sortOrder: 0 },
    { modifierType: 'INCREASED_VALUE', conditionKey: 'No',             factor: 1.00, label: 'No IV cover', sortOrder: 1 },
    { modifierType: 'INCREASED_VALUE', conditionKey: 'default',        factor: 1.00, label: 'Default', sortOrder: 2 },

    // TRANSSHIPMENT — cargo changes vessel/mode during transit
    { modifierType: 'TRANSSHIPMENT', conditionKey: 'Yes',              factor: 1.10, label: 'Transshipment risk', sortOrder: 0 },
    { modifierType: 'TRANSSHIPMENT', conditionKey: 'No',               factor: 1.00, label: 'Direct shipment', sortOrder: 1 },
    { modifierType: 'TRANSSHIPMENT', conditionKey: 'default',          factor: 1.00, label: 'Default', sortOrder: 2 },
  ];

  for (const rm of riskModifierDefs) {
    await prisma.riskModifier.create({ data: rm });
  }
  console.log(`Created ${riskModifierDefs.length} risk modifiers`);

  // ─── Coverage Inclusions (~42 rows) — exact values from INCLUSIONS per product ──
  const inclusionDefs: Record<string, string[]> = {
    CARGO:     ['Institute Cargo Clauses', 'General Average', 'Theft & Pilferage', 'Jettison & Washing Overboard', 'Contamination Risk', 'Sue & Labour'],
    HULL:      ['Total Loss Cover', 'Collision Liability', 'General Average & Salvage', 'Fire & Explosion', 'Machinery Breakdown', 'War Risk (if elected)'],
    PLEASURE:  ['Agreed Hull Value', 'Third Party Liability', 'Fire & Theft', 'Storm Damage', 'Personal Accident', 'Emergency Towing'],
    JETSKI:    ['Agreed Value Cover', 'Third Party Liability', 'Fire & Theft', 'Rescue & Recovery', 'Personal Accident'],
    SPEEDBOAT: ['Agreed Value Cover', 'Third Party Liability', 'Fire & Theft', 'Storm & Flood', 'Trailer Cover (if applicable)'],
    BARGE:     ['Total Loss & CTL', 'Collision Liability', 'Pollution Cover', 'Loss of Hire', 'Fire & Explosion', 'Wreck Removal'],
    LIABILITY: ['Third Party Property Damage', 'Bodily Injury', 'Legal Defence Costs', 'Pollution Liability', 'Wreck Removal', 'Cargo Liability'],
  };

  let inclCount = 0;
  for (const [productCode, inclusions] of Object.entries(inclusionDefs)) {
    for (let i = 0; i < inclusions.length; i++) {
      await prisma.coverageInclusion.create({
        data: { productId: products[productCode].id, inclusionText: inclusions[i], sortOrder: i },
      });
      inclCount++;
    }
  }
  console.log(`Created ${inclCount} coverage inclusions`);

  // ─── Commission Schedules (7 = 1 per product, all 15%) ──────────────────────
  for (const productCode of Object.keys(products)) {
    await prisma.commissionSchedule.create({
      data: { productId: products[productCode].id, rate: 15.0, effectiveFrom: new Date('2026-01-01') },
    });
  }
  console.log('Created 7 commission schedules (all 15%)');

  // ─── Reference Data (~250+ rows) ────────────────────────────────────────────

  // Countries (102)
  const COUNTRIES = ['Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belgium','Bolivia','Brazil','Bulgaria','Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia','Finland','France','Germany','Ghana','Greece','Guatemala','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Malta','Mexico','Monaco','Morocco','Myanmar','Netherlands','New Zealand','Nigeria','Norway','Oman','Pakistan','Panama','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];
  for (let i = 0; i < COUNTRIES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'COUNTRY', code: COUNTRIES[i] } },
      update: {},
      create: { category: 'COUNTRY', code: COUNTRIES[i], label: COUNTRIES[i], sortOrder: i },
    });
  }

  // Navigation Areas (11)
  const NAV_AREAS = ['UAE Waters','Arabian Gulf','Indian Ocean','Mediterranean','Asia-Pacific','Europe + Med','North Sea','Caribbean','Atlantic','Pacific','Worldwide'];
  for (let i = 0; i < NAV_AREAS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'NAV_AREA', code: NAV_AREAS[i] } },
      update: {},
      create: { category: 'NAV_AREA', code: NAV_AREAS[i], label: NAV_AREAS[i], sortOrder: i },
    });
  }

  // Currencies (4)
  const CURRENCIES_LIST = ['AED','USD','EUR','GBP'];
  for (let i = 0; i < CURRENCIES_LIST.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'CURRENCY', code: CURRENCIES_LIST[i] } },
      update: {},
      create: { category: 'CURRENCY', code: CURRENCIES_LIST[i], label: CURRENCIES_LIST[i], sortOrder: i },
    });
  }

  // Hull / Vessel Types (18)
  const HULL_TYPES = ['Bulk Carrier','Container Ship','Oil Tanker','Chemical Tanker','LNG/LPG Carrier','General Cargo Vessel','Ro-Ro Vessel','Car Carrier','Refrigerated Cargo','Heavy Lift Vessel','Tug','Supply Vessel','Dredger','Survey Vessel','Offshore Support Vessel','Fishing Vessel','Passenger Vessel','Other'];
  for (let i = 0; i < HULL_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'HULL_TYPE', code: HULL_TYPES[i] } },
      update: {},
      create: { category: 'HULL_TYPE', code: HULL_TYPES[i], label: HULL_TYPES[i], sortOrder: i },
    });
  }

  // Craft Types (11 — pleasure craft)
  const CRAFT_TYPES = ['Motor Yacht','Sailing Yacht','Catamaran','Superyacht (24m+)','Sport Boat / Speedboat','RIB (Rigid Inflatable)','Jet Ski / PWC','Fishing Boat','Inflatable / Dinghy','Traditional Wooden Dhow','Other'];
  for (let i = 0; i < CRAFT_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'CRAFT_TYPE', code: CRAFT_TYPES[i] } },
      update: {},
      create: { category: 'CRAFT_TYPE', code: CRAFT_TYPES[i], label: CRAFT_TYPES[i], sortOrder: i },
    });
  }

  // Barge/Vessel Types (11)
  const BARGE_TYPES = ['Dumb Barge','Self-Propelled Barge','Hopper Barge','Deck Cargo Barge','Ferry','Passenger Vessel','Tug','Work Boat','Offshore Support','Survey Vessel','Crane Barge'];
  for (let i = 0; i < BARGE_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'BARGE_TYPE', code: BARGE_TYPES[i] } },
      update: {},
      create: { category: 'BARGE_TYPE', code: BARGE_TYPES[i], label: BARGE_TYPES[i], sortOrder: i },
    });
  }

  // Classification Societies (9)
  const CLASS_SOCIETIES = ["Lloyd's Register",'DNV','Bureau Veritas','American Bureau of Shipping','ClassNK','RINA','Korean Register','Unclassed','Other'];
  for (let i = 0; i < CLASS_SOCIETIES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'CLASSIFICATION', code: CLASS_SOCIETIES[i] } },
      update: {},
      create: { category: 'CLASSIFICATION', code: CLASS_SOCIETIES[i], label: CLASS_SOCIETIES[i], sortOrder: i },
    });
  }

  // Liability Types (6)
  const LIABILITY_TYPES = ["Ship Repairer's Liability","Charterer's Liability","Freight Forwarder's Liability","Haulier's Liability","Terminal Operator's Liability",'Protection & Indemnity (P&I)'];
  for (let i = 0; i < LIABILITY_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'LIABILITY_TYPE', code: LIABILITY_TYPES[i] } },
      update: {},
      create: { category: 'LIABILITY_TYPE', code: LIABILITY_TYPES[i], label: LIABILITY_TYPES[i], sortOrder: i },
    });
  }

  // Cargo Categories (10)
  const CARGO_CATEGORIES = ['Electronics & Machinery','Steel & Metal Products','Foodstuffs & Perishables','Chemicals & Hazardous','Textiles & Garments','Auto Parts & Vehicles','Building Materials','Pharmaceuticals','Oil & Petroleum Products','General Merchandise'];
  for (let i = 0; i < CARGO_CATEGORIES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'CARGO_CATEGORY', code: CARGO_CATEGORIES[i] } },
      update: {},
      create: { category: 'CARGO_CATEGORY', code: CARGO_CATEGORIES[i], label: CARGO_CATEGORIES[i], sortOrder: i },
    });
  }

  // Cargo Types for Hull/Barge (13)
  const CARGO_TYPES = ['Dry Bulk','Liquid Bulk','Containerised','Break Bulk','Refrigerated','Heavy Lift','Ro-Ro Cargo','Hazardous (IMDG)','Dredge / Spoil','Sand & Aggregates','Passengers','General Mixed','None / Not Applicable'];
  for (let i = 0; i < CARGO_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'CARGO_TYPE', code: CARGO_TYPES[i] } },
      update: {},
      create: { category: 'CARGO_TYPE', code: CARGO_TYPES[i], label: CARGO_TYPES[i], sortOrder: i },
    });
  }

  // Operating Waters (4)
  const OP_WATERS = ['Blue Water (Open Sea)','Coastal / Inland Waters','Both Blue Water & Coastal','Port / Harbour Only'];
  for (let i = 0; i < OP_WATERS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'OPERATING_WATERS', code: OP_WATERS[i] } },
      update: {},
      create: { category: 'OPERATING_WATERS', code: OP_WATERS[i], label: OP_WATERS[i], sortOrder: i },
    });
  }

  // Barge Operation Types (5)
  const BARGE_OP_TYPES = ['Port / Harbour Only','River / Inland Waterway','Coastal','Short Sea Shipping','International Trading'];
  for (let i = 0; i < BARGE_OP_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'BARGE_OP_TYPE', code: BARGE_OP_TYPES[i] } },
      update: {},
      create: { category: 'BARGE_OP_TYPE', code: BARGE_OP_TYPES[i], label: BARGE_OP_TYPES[i], sortOrder: i },
    });
  }

  // Barge Cargo Types (8)
  const BARGE_CARGO = ['Sand & Aggregates','Steel & Metal','Construction Materials','Fuel / Oil Products','Passengers','Container Units','Waste / Dredge','General Mixed'];
  for (let i = 0; i < BARGE_CARGO.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'BARGE_CARGO', code: BARGE_CARGO[i] } },
      update: {},
      create: { category: 'BARGE_CARGO', code: BARGE_CARGO[i], label: BARGE_CARGO[i], sortOrder: i },
    });
  }

  // Jet Ski Brands (6)
  const JETSKI_BRANDS = ['Sea-Doo','Yamaha WaveRunner','Kawasaki Jet Ski','Honda AquaTrax','Polaris','Other'];
  for (let i = 0; i < JETSKI_BRANDS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'JETSKI_BRAND', code: JETSKI_BRANDS[i] } },
      update: {},
      create: { category: 'JETSKI_BRAND', code: JETSKI_BRANDS[i], label: JETSKI_BRANDS[i], sortOrder: i },
    });
  }

  // Speedboat Types (6)
  const SPEEDBOAT_TYPES = ['Speedboat','RIB (Rigid Inflatable)','Sport Boat','Center Console','Bowrider','Pontoon Boat'];
  for (let i = 0; i < SPEEDBOAT_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'SPEEDBOAT_TYPE', code: SPEEDBOAT_TYPES[i] } },
      update: {},
      create: { category: 'SPEEDBOAT_TYPE', code: SPEEDBOAT_TYPES[i], label: SPEEDBOAT_TYPES[i], sortOrder: i },
    });
  }

  // Engine Types (5 — pleasure craft)
  const ENGINE_TYPES = ['Inboard','Outboard','Sail-only','Hybrid','Jet Drive'];
  for (let i = 0; i < ENGINE_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'ENGINE_TYPE', code: ENGINE_TYPES[i] } },
      update: {},
      create: { category: 'ENGINE_TYPE', code: ENGINE_TYPES[i], label: ENGINE_TYPES[i], sortOrder: i },
    });
  }

  // Engine Configurations (4 — speedboat)
  const ENGINE_CONFIGS = ['Single Outboard','Twin Outboard','Inboard','Stern Drive'];
  for (let i = 0; i < ENGINE_CONFIGS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'ENGINE_CONFIG', code: ENGINE_CONFIGS[i] } },
      update: {},
      create: { category: 'ENGINE_CONFIG', code: ENGINE_CONFIGS[i], label: ENGINE_CONFIGS[i], sortOrder: i },
    });
  }

  // Packing Types (8 — cargo)
  const PACKING_TYPES = ['Full Container Load (FCL)','Less than Container Load (LCL)','Bulk (Unpacked)','Wooden Crates','Cartons on Pallets','Breakbulk','Refrigerated Container','Flat Rack / Open Top'];
  for (let i = 0; i < PACKING_TYPES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'PACKING_TYPE', code: PACKING_TYPES[i] } },
      update: {},
      create: { category: 'PACKING_TYPE', code: PACKING_TYPES[i], label: PACKING_TYPES[i], sortOrder: i },
    });
  }

  // Trade Lanes for Cargo (7)
  const TRADE_LANES = ['UAE / Arabian Gulf','Gulf to Indian Subcontinent','Gulf to Far East','Gulf to Europe / Med','Gulf to Africa','Gulf to Americas','Worldwide'];
  for (let i = 0; i < TRADE_LANES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'TRADE_LANE', code: TRADE_LANES[i] } },
      update: {},
      create: { category: 'TRADE_LANE', code: TRADE_LANES[i], label: TRADE_LANES[i], sortOrder: i },
    });
  }

  // Pleasure Craft Use Types (6)
  const PLEASURE_USES = ['Private / Leisure','Charter','Private + Charter','Bareboat Charter','Fishing','Water Sports'];
  for (let i = 0; i < PLEASURE_USES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'PLEASURE_USE', code: PLEASURE_USES[i] } },
      update: {},
      create: { category: 'PLEASURE_USE', code: PLEASURE_USES[i], label: PLEASURE_USES[i], sortOrder: i },
    });
  }

  // Speedboat Use Types (4)
  const SPEEDBOAT_USES = ['Private / Leisure','Fishing','Water Sports','Charter / Commercial'];
  for (let i = 0; i < SPEEDBOAT_USES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'SPEEDBOAT_USE', code: SPEEDBOAT_USES[i] } },
      update: {},
      create: { category: 'SPEEDBOAT_USE', code: SPEEDBOAT_USES[i], label: SPEEDBOAT_USES[i], sortOrder: i },
    });
  }

  // Storage Types — Jet Ski (4)
  const JETSKI_STORAGE = ['Marina / Berth','Home / Garage','Trailered','Offshore Mooring'];
  for (let i = 0; i < JETSKI_STORAGE.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'JETSKI_STORAGE', code: JETSKI_STORAGE[i] } },
      update: {},
      create: { category: 'JETSKI_STORAGE', code: JETSKI_STORAGE[i], label: JETSKI_STORAGE[i], sortOrder: i },
    });
  }

  // Storage Types — Speedboat (4)
  const SPEEDBOAT_STORAGE = ['Marina Berth','Dry Stack','Trailered at Home','Mooring Buoy'];
  for (let i = 0; i < SPEEDBOAT_STORAGE.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'SPEEDBOAT_STORAGE', code: SPEEDBOAT_STORAGE[i] } },
      update: {},
      create: { category: 'SPEEDBOAT_STORAGE', code: SPEEDBOAT_STORAGE[i], label: SPEEDBOAT_STORAGE[i], sortOrder: i },
    });
  }

  // Liability Limits (8)
  const LIAB_LIMITS = ['500000','1000000','2000000','5000000','10000000','25000000','50000000','100000000'];
  for (let i = 0; i < LIAB_LIMITS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'LIABILITY_LIMIT', code: LIAB_LIMITS[i] } },
      update: {},
      create: { category: 'LIABILITY_LIMIT', code: LIAB_LIMITS[i], label: parseInt(LIAB_LIMITS[i]).toLocaleString(), sortOrder: i },
    });
  }

  // TPL Limits (5 — pleasure)
  const TPL_LIMITS = ['250000','500000','1000000','2000000','5000000'];
  for (let i = 0; i < TPL_LIMITS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'TPL_LIMIT', code: TPL_LIMITS[i] } },
      update: {},
      create: { category: 'TPL_LIMIT', code: TPL_LIMITS[i], label: parseInt(TPL_LIMITS[i]).toLocaleString(), sortOrder: i },
    });
  }

  // Hull Material (6)
  const HULL_MATERIALS = ['Steel','GRP / Fiberglass','Aluminum','Wood','Composite','Other'];
  for (let i = 0; i < HULL_MATERIALS.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'HULL_MATERIAL', code: HULL_MATERIALS[i] } },
      update: {},
      create: { category: 'HULL_MATERIAL', code: HULL_MATERIALS[i], label: HULL_MATERIALS[i], sortOrder: i },
    });
  }

  // Survey Status (5)
  const SURVEY_STATUSES = ['In Class','Due Soon','Overdue','Not Surveyed','N/A'];
  for (let i = 0; i < SURVEY_STATUSES.length; i++) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: 'SURVEY_STATUS', code: SURVEY_STATUSES[i] } },
      update: {},
      create: { category: 'SURVEY_STATUS', code: SURVEY_STATUSES[i], label: SURVEY_STATUSES[i], sortOrder: i },
    });
  }

  console.log('Created reference data (countries, nav areas, currencies, vessel types, hull materials, survey statuses, etc.)');
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
