/**
 * Database Deduplication Script for form_gig_leads and direct_contact_requests
 * 
 * 1. Groups form_gig_leads by normalized 10-digit phone number.
 * 2. Selects the primary lead (highest data quality / latest) and identifies secondary duplicates.
 * 3. Replaces secondary lead IDs in all direct_contact_requests with the primary ID.
 * 4. Deduplicates workerIds inside direct_contact_requests and backfills with genuine distinct workers so customers get 10 distinct contacts.
 * 5. Safely deletes redundant secondary duplicate rows from form_gig_leads.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === 'true';

function resolveJobKeywords(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('load')) return ['loader', 'helper'];
  if (cat.includes('ac')) return ['ac', 'technician'];
  if (cat.includes('clean')) return ['cleaner', 'housekeeping'];
  if (cat.includes('electric')) return ['electrician'];
  if (cat.includes('plumb')) return ['plumber'];
  if (cat.includes('carpent')) return ['carpenter'];
  if (cat.includes('paint')) return ['painter'];
  if (cat.includes('secur')) return ['security'];
  if (cat.includes('pack')) return ['packer', 'loader'];
  if (cat.includes('help')) return ['helper'];
  return ['helper', 'loader', 'cleaner'];
}

async function main() {
  console.log(`Starting form_gig_leads deduplication... [DRY_RUN=${DRY_RUN}]`);

  // Step 1: Find all duplicate phone groups
  const duplicateGroups = await prisma.$queryRaw`
    SELECT 
      RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) as clean_phone,
      array_agg(id) as ids,
      COUNT(*)::int as count
    FROM form_gig_leads
    WHERE phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10
    GROUP BY clean_phone
    HAVING COUNT(*) > 1;
  `;

  console.log(`Found ${duplicateGroups.length} phone groups with duplicate entries in form_gig_leads.`);

  const idReplacementMap = new Map(); // secondaryId -> primaryId
  const secondaryIdsToDelete = [];

  for (const group of duplicateGroups) {
    const leads = await prisma.formGigLead.findMany({
      where: { id: { in: group.ids } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Score leads based on profile completeness & verification
    const scored = leads.map((l) => {
      let score = 0;
      if (l.aadharNumber) score += 10;
      if (l.panNumber) score += 5;
      if (l.profilePhotoUrl) score += 5;
      if (l.aadharFrontUrl) score += 5;
      if (l.panFrontUrl) score += 5;
      if (l.givenAddress) score += 5;
      if (l.notes && l.notes.includes('Paid')) score += 20;
      if (l.status === 'SUITABLE' || l.status === 'VERIFIED') score += 10;
      return { lead: l, score };
    });

    // Highest score first, then latest createdAt
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.lead.createdAt).getTime() - new Date(a.lead.createdAt).getTime();
    });

    const primary = scored[0].lead;
    const secondaries = scored.slice(1).map((s) => s.lead);

    for (const sec of secondaries) {
      idReplacementMap.set(sec.id, primary.id);
      secondaryIdsToDelete.push(sec.id);
    }
  }

  console.log(`Identified ${secondaryIdsToDelete.length} redundant secondary lead rows to clean up.`);

  // Step 2: Fix direct_contact_requests
  console.log('Inspecting direct_contact_requests for duplicate / secondary workerIds...');
  const dcrs = await prisma.directContactRequest.findMany({
    select: {
      id: true,
      customerPhone: true,
      workerIds: true,
      serviceCategory: true,
      city: true,
      status: true,
    },
  });

  let dcrsUpdatedCount = 0;

  for (const dcr of dcrs) {
    let workerIds = dcr.workerIds || [];
    if (workerIds.length === 0) continue;

    // Replace any secondary ID with its primary ID
    let hasChanges = false;
    const mappedIds = workerIds.map((id) => {
      if (idReplacementMap.has(id)) {
        hasChanges = true;
        return idReplacementMap.get(id);
      }
      return id;
    });

    // Fetch the lead info for mappedIds to check for duplicate phone numbers
    const currentLeads = await prisma.formGigLead.findMany({
      where: { id: { in: mappedIds } },
      select: { id: true, phone: true, jobType: true, city: true },
    });

    const leadMap = new Map(currentLeads.map((l) => [l.id, l]));

    // Deduplicate by normalized 10-digit phone
    const seenPhones = new Set();
    const distinctWorkerIds = [];

    for (const id of mappedIds) {
      const lead = leadMap.get(id);
      if (lead) {
        const cleanPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
        const key = cleanPhone.length === 10 ? cleanPhone : lead.id;
        if (!seenPhones.has(key)) {
          seenPhones.add(key);
          distinctWorkerIds.push(id);
        } else {
          hasChanges = true;
        }
      } else {
        // Driver lead or unknown ID: deduplicate by id
        if (!seenPhones.has(id)) {
          seenPhones.add(id);
          distinctWorkerIds.push(id);
        } else {
          hasChanges = true;
        }
      }
    }

    // If customer has fewer than 10 distinct workers, backfill!
    if (distinctWorkerIds.length < 10 && (dcr.status === 'VERIFIED' || dcr.status === 'PENDING')) {
      const keywords = resolveJobKeywords(dcr.serviceCategory);
      const cityQuery = dcr.city || '';

      // Find candidates from form_gig_leads matching keywords
      const backfillCandidates = await prisma.formGigLead.findMany({
        where: {
          id: { notIn: [...distinctWorkerIds, ...secondaryIdsToDelete] },
          OR: keywords.map((kw) => ({ jobType: { contains: kw, mode: 'insensitive' } })),
          ...(cityQuery && cityQuery !== 'All' ? { city: { contains: cityQuery, mode: 'insensitive' } } : {}),
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: { id: true, phone: true },
      });

      for (const cand of backfillCandidates) {
        if (distinctWorkerIds.length >= 10) break;
        const cleanPhone = (cand.phone || '').replace(/\D/g, '').slice(-10);
        const key = cleanPhone.length === 10 ? cleanPhone : cand.id;
        if (!seenPhones.has(key)) {
          seenPhones.add(key);
          distinctWorkerIds.push(cand.id);
          hasChanges = true;
        }
      }

      // If still fewer than 10, backfill from same keywords across any city
      if (distinctWorkerIds.length < 10) {
        const fallbackCandidates = await prisma.formGigLead.findMany({
          where: {
            id: { notIn: [...distinctWorkerIds, ...secondaryIdsToDelete] },
            OR: keywords.map((kw) => ({ jobType: { contains: kw, mode: 'insensitive' } })),
          },
          take: 40,
          orderBy: { createdAt: 'desc' },
          select: { id: true, phone: true },
        });

        for (const cand of fallbackCandidates) {
          if (distinctWorkerIds.length >= 10) break;
          const cleanPhone = (cand.phone || '').replace(/\D/g, '').slice(-10);
          const key = cleanPhone.length === 10 ? cleanPhone : cand.id;
          if (!seenPhones.has(key)) {
            seenPhones.add(key);
            distinctWorkerIds.push(cand.id);
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      console.log(`Updating DCR ${dcr.id} (${dcr.customerPhone}): was ${workerIds.length} ids, now ${distinctWorkerIds.length} distinct ids.`);
      if (!DRY_RUN) {
        await prisma.directContactRequest.update({
          where: { id: dcr.id },
          data: { workerIds: distinctWorkerIds },
        });
      }
      dcrsUpdatedCount++;
    }
  }

  console.log(`DCRs updated with distinct workerIds: ${dcrsUpdatedCount}`);

  // Step 3: Delete redundant secondary duplicate rows from form_gig_leads
  if (!DRY_RUN) {
    console.log(`Deleting ${secondaryIdsToDelete.length} secondary duplicate rows from form_gig_leads...`);
    const deleteResult = await prisma.formGigLead.deleteMany({
      where: { id: { in: secondaryIdsToDelete } },
    });
    console.log(`Deleted ${deleteResult.count} duplicate rows successfully!`);
  } else {
    console.log(`[DRY_RUN] Would delete ${secondaryIdsToDelete.length} secondary duplicate rows.`);
  }

  // Step 4: Verification
  const remainingDups = await prisma.$queryRaw`
    SELECT COUNT(*)::int as dup_count
    FROM (
      SELECT RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) as clean_phone
      FROM form_gig_leads
      WHERE phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10
      GROUP BY clean_phone
      HAVING COUNT(*) > 1
    ) s;
  `;

  console.log(`Remaining duplicate phone groups in form_gig_leads: ${remainingDups[0].dup_count}`);
  console.log('Deduplication cleanup complete!');
}

main()
  .catch((err) => {
    console.error('Error during deduplication:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
