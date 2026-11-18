import {checkPairConflict, isBatchQuarantined} from './complaintAnalyticsEngine.js';

export const TIER_DEFINITIONS = {
  TIER_1: {
    tier: 1,
    code: 'TIER_1_ZERO_MIX',
    label: 'TIER 1: ZERO-MIX (100% SAFE)',
    badgeClass: 'tier-1',
    description: 'Demand fulfilled by a single continuous coil batch. Zero risk of shade variation on the roof.'
  },
  TIER_2: {
    tier: 2,
    code: 'TIER_2_SIBLING_COILS',
    label: 'TIER 2: SIBLING COILS (SAFE MIX)',
    badgeClass: 'tier-2',
    description: 'Batches share the same production campaign / consignment series, same plant, and identical age bracket. Low shade risk.'
  },
  TIER_3: {
    tier: 3,
    code: 'TIER_3_CAUTION_MIX',
    label: 'TIER 3: CAUTION MIX (ADJACENT AGE)',
    badgeClass: 'tier-3',
    description: 'Batches share material substrate and plant, but span adjacent age brackets (e.g., 0–30d + 31–60d). Recommend allocating to separate roof slopes.'
  },
  TIER_4: {
    tier: 4,
    code: 'TIER_4_HIGH_RISK',
    label: 'TIER 4: HIGH SHADE RISK',
    badgeClass: 'tier-4',
    description: 'High risk of visible patchwork roof on site due to cross-plant mixing, distant age gap (>90 days), or substrate divergence.'
  },
  TIER_CONFLICT: {
    tier: 4,
    code: 'TIER_4_COMPLAINT_CONFLICT',
    label: '🚨 TIER 4: FIELD COMPLAINT CONFLICT',
    badgeClass: 'tier-4',
    description: 'This exact batch combination previously caused a customer complaint on site. Allocation is strictly flagged.'
  }
};

const text = value => value === undefined || value === null ? '' : String(value).trim();
const normalize = value => text(value).toLowerCase();
const same = (a, b) => Boolean(text(a) && text(b) && normalize(a) === normalize(b));

/** Extracts prefix campaign code from batch ID (e.g. IPP0184253 -> IPP0184, K002700 -> K002700) */
export function extractBatchPrefix(batchId) {
  const str = text(batchId).toUpperCase();
  if (!str) return 'UNKNOWN';
  if (str.length >= 7) return str.slice(0, 7);
  return str.slice(0, Math.min(str.length, 5));
}

/** Age bucket rank to evaluate adjacency */
const AGE_BUCKET_RANKS = {
  '0–30 days': 1,
  '00-30': 1,
  '31–60 days': 2,
  '31-60': 2,
  '61–90 days': 3,
  '61-90': 3,
  '91–120 days': 4,
  '91-120': 4,
  '121–180 days': 5,
  '121-180': 5,
  '181–365 days': 6,
  '181-365': 6,
  '366–730 days': 7,
  '366-730': 7,
  '731 days–3 years': 8,
  '731-3YRS': 8,
  'Over 3 years': 9,
  '> 3YRS': 9
};

export function getAgeRank(bucket) {
  if (!bucket) return 5;
  for (const [key, rank] of Object.entries(AGE_BUCKET_RANKS)) {
    if (normalize(bucket).includes(normalize(key))) return rank;
  }
  return 5;
}

/** Evaluates pairwise compatibility between two specific batches with Live Complaint Learning */
export function calculatePairCompatibility(batchA, batchB, complaints = []) {
  const conflict = checkPairConflict(batchA.batchId, batchB.batchId, complaints);
  const samePlant = same(batchA.plant, batchB.plant);
  const sameProduct = same(batchA.product, batchB.product) || same(batchA.material, batchB.material);
  const sameColor = same(batchA.color, batchB.color);
  const sameMaterialType = same(batchA.materialType, batchB.materialType);
  
  const prefixA = extractBatchPrefix(batchA.batchId);
  const prefixB = extractBatchPrefix(batchB.batchId);
  const samePrefix = prefixA !== 'UNKNOWN' && prefixA === prefixB;

  const rankA = getAgeRank(batchA.ageBucket);
  const rankB = getAgeRank(batchB.ageBucket);
  const ageRankDiff = Math.abs(rankA - rankB);

  let tier = TIER_DEFINITIONS.TIER_4;
  let score = 40;
  const warnings = [];
  const matches = [];

  // Live Complaint Check
  if (conflict) {
    warnings.push(`🚨 HISTORICAL COMPLAINT CONFLICT: Batch ${batchA.batchId} and ${batchB.batchId} previously caused complaint ${conflict.complaintId} ("${conflict.issueType}: ${conflict.description}"). Do not mix.`);
    return {
      score: 10,
      tier: TIER_DEFINITIONS.TIER_CONFLICT,
      matches: [],
      warnings,
      ageRankDiff,
      samePrefix,
      prefixA,
      prefixB,
      hasComplaintConflict: true,
      conflictDetails: conflict
    };
  }

  if (sameProduct) matches.push('Product / Material Grade');
  if (sameColor) matches.push('Color Specification');
  if (samePlant) matches.push('Production Plant');
  if (sameMaterialType) matches.push('Substrate Category');
  if (samePrefix) matches.push(`Sibling Batch Series (${prefixA})`);

  if (!samePlant) warnings.push(`Cross-plant combination: ${batchA.plant} + ${batchB.plant}. Different line conditions may alter coil surface tone.`);
  if (!sameProduct) warnings.push(`Different product / material: ${batchA.product} vs ${batchB.product}.`);

  if (ageRankDiff === 0) {
    matches.push(`Same Age Bracket (${batchA.ageBucket})`);
  } else if (ageRankDiff === 1) {
    warnings.push(`Adjacent age brackets: ${batchA.ageBucket} and ${batchB.ageBucket}. Minor surface weathering difference possible.`);
  } else {
    warnings.push(`Significant age gap: ${batchA.ageBucket} vs ${batchB.ageBucket} (${ageRankDiff} bracket disparity). High shade drift risk.`);
  }

  // Determine Tier
  if (sameProduct && samePlant && samePrefix && ageRankDiff === 0) {
    tier = TIER_DEFINITIONS.TIER_2;
    score = 95;
  } else if (sameProduct && samePlant && (ageRankDiff <= 1 || samePrefix)) {
    tier = TIER_DEFINITIONS.TIER_3;
    score = 75;
  } else {
    tier = TIER_DEFINITIONS.TIER_4;
    score = Math.max(20, 60 - ageRankDiff * 10 - (!samePlant ? 20 : 0));
  }

  return {
    score,
    tier,
    matches,
    warnings,
    ageRankDiff,
    samePrefix,
    prefixA,
    prefixB,
    hasComplaintConflict: false
  };
}

/**
 * Recommends optimal coil allocation for Sales Planners based on Demand KG,
 * prioritizing Tier 1 Zero-Mix, followed by Tier 2 Sibling Coils with live Complaint Learning.
 */
export function recommendCoilAllocation(requirements, inventory, complaints = []) {
  const demandKG = Number(requirements.quantity) || 0;
  const targetProduct = text(requirements.product);
  const targetMaterialType = text(requirements.materialType);
  const targetPlant = text(requirements.plant);
  const targetColor = text(requirements.color);

  // Filter eligible candidate batches and check quarantine
  const candidates = inventory.filter(b => {
    if (b.quantity <= 0) return false;
    if (targetProduct && !same(b.product, targetProduct) && !same(b.material, targetProduct)) return false;
    if (targetMaterialType && !same(b.materialType, targetMaterialType)) return false;
    if (targetPlant && !same(b.plant, targetPlant)) return false;
    if (targetColor && b.color && !same(b.color, targetColor)) return false;
    return true;
  });

  if (!candidates.length) {
    return {
      tier: TIER_DEFINITIONS.TIER_4,
      selected: [],
      totalAllocatedKG: 0,
      demandKG,
      productionGapKG: demandKG,
      fulfilledPercent: 0,
      canFulfil: false,
      isZeroMix: false,
      hasComplaintConflict: false,
      batchesUsedCount: 0,
      summary: 'No available coils found matching the requested specification.',
      warnings: ['No matching inventory available for the selected plant and product parameters.']
    };
  }

  // --- Step 1: Check for TIER 1 (Zero-Mix: Single Coil fulfillment) ---
  const singleCoilCandidates = candidates
    .filter(b => b.quantity >= demandKG && !isBatchQuarantined(b.batchId, complaints))
    .sort((a, b) => getAgeRank(a.ageBucket) - getAgeRank(b.ageBucket) || a.quantity - b.quantity);

  if (singleCoilCandidates.length > 0 && demandKG > 0) {
    const chosen = singleCoilCandidates[0];
    return {
      tier: TIER_DEFINITIONS.TIER_1,
      selected: [{
        batch: chosen,
        allocatedKG: demandKG,
        totalAvailableKG: chosen.quantity,
        remainingInCoilKG: chosen.quantity - demandKG,
        isPrimary: true,
        score: 100
      }],
      totalAllocatedKG: demandKG,
      demandKG,
      productionGapKG: 0,
      fulfilledPercent: 100,
      canFulfil: true,
      isZeroMix: true,
      hasComplaintConflict: false,
      batchesUsedCount: 1,
      summary: `Order demand of ${demandKG.toLocaleString()} KG is 100% fulfilled by single coil batch ${chosen.batchId} at ${chosen.plant}. Zero shade risk.`,
      warnings: []
    };
  }

  // --- Step 2: Multi-Coil Combination (Group by Sibling Campaign Series) ---
  // Sort candidates prioritizing non-quarantined, freshest age bucket, then larger coils
  candidates.sort((a, b) => {
    const qA = isBatchQuarantined(a.batchId, complaints) ? 1 : 0;
    const qB = isBatchQuarantined(b.batchId, complaints) ? 1 : 0;
    if (qA !== qB) return qA - qB;
    const ageDiff = getAgeRank(a.ageBucket) - getAgeRank(b.ageBucket);
    if (ageDiff !== 0) return ageDiff;
    return b.quantity - a.quantity;
  });

  // Try to find sibling group first (same plant, same prefix, same age)
  const prefixGroups = new Map();
  for (const c of candidates) {
    const key = `${c.plant}__${c.ageBucket}__${extractBatchPrefix(c.batchId)}`;
    if (!prefixGroups.has(key)) prefixGroups.set(key, []);
    prefixGroups.get(key).push(c);
  }

  let selectedBatches = [];
  let allocatedTotal = 0;
  let combinationTier = TIER_DEFINITIONS.TIER_2;
  const warnings = [];

  // Check if any single sibling group can fulfill the demand
  let bestSiblingGroup = null;
  for (const group of prefixGroups.values()) {
    const groupSum = group.reduce((s, b) => s + b.quantity, 0);
    if (groupSum >= demandKG) {
      bestSiblingGroup = group;
      break;
    }
  }

  const poolToUse = bestSiblingGroup || candidates;
  let remainingNeeded = demandKG;

  for (const batch of poolToUse) {
    if (remainingNeeded <= 0) break;
    const toTake = Math.min(batch.quantity, remainingNeeded);
    selectedBatches.push({
      batch,
      allocatedKG: toTake,
      totalAvailableKG: batch.quantity,
      remainingInCoilKG: batch.quantity - toTake,
      isPrimary: selectedBatches.length === 0,
      score: 95
    });
    allocatedTotal += toTake;
    remainingNeeded -= toTake;
  }

  // Check pairwise differences and live complaint conflict detection
  let hasComplaintConflict = false;
  let conflictAlertDetails = null;

  if (selectedBatches.length === 1) {
    combinationTier = TIER_DEFINITIONS.TIER_1;
  } else {
    let maxAgeDiff = 0;
    let crossPlant = false;

    for (let i = 0; i < selectedBatches.length; i++) {
      for (let j = i + 1; j < selectedBatches.length; j++) {
        const pair = calculatePairCompatibility(selectedBatches[i].batch, selectedBatches[j].batch, complaints);
        if (pair.hasComplaintConflict) {
          hasComplaintConflict = true;
          conflictAlertDetails = pair.conflictDetails;
          warnings.unshift(...pair.warnings);
        }
        if (pair.ageRankDiff > maxAgeDiff) maxAgeDiff = pair.ageRankDiff;
        if (!same(selectedBatches[i].batch.plant, selectedBatches[j].batch.plant)) crossPlant = true;
        if (!pair.hasComplaintConflict) warnings.push(...pair.warnings);
      }
    }

    if (hasComplaintConflict) {
      combinationTier = TIER_DEFINITIONS.TIER_CONFLICT;
    } else if (bestSiblingGroup) {
      combinationTier = TIER_DEFINITIONS.TIER_2;
      warnings.push(`Combining ${selectedBatches.length} sibling coils from campaign series ${extractBatchPrefix(selectedBatches[0].batch.batchId)}.`);
    } else if (crossPlant || maxAgeDiff >= 3) {
      combinationTier = TIER_DEFINITIONS.TIER_4;
    } else if (maxAgeDiff <= 1) {
      combinationTier = TIER_DEFINITIONS.TIER_3;
    } else {
      combinationTier = TIER_DEFINITIONS.TIER_4;
    }
  }

  const productionGapKG = Math.max(0, demandKG - allocatedTotal);
  const fulfilledPercent = demandKG > 0 ? Math.min(100, Math.round((allocatedTotal / demandKG) * 100)) : 0;
  const canFulfil = productionGapKG === 0;

  if (productionGapKG > 0) {
    warnings.push(`Stock deficit: ${productionGapKG.toLocaleString()} KG gap remaining. Production roll-forming required to complete demand.`);
  }

  return {
    tier: combinationTier,
    selected: selectedBatches,
    totalAllocatedKG: allocatedTotal,
    demandKG,
    productionGapKG,
    fulfilledPercent,
    canFulfil,
    isZeroMix: selectedBatches.length === 1,
    hasComplaintConflict,
    conflictAlertDetails,
    batchesUsedCount: selectedBatches.length,
    summary: hasComplaintConflict
      ? `🚨 BLOCKED BY COMPLAINT HISTORY: Combination includes coils previously reported in field shade dispute ${conflictAlertDetails?.complaintId}.`
      : canFulfil
      ? `Allocated ${allocatedTotal.toLocaleString()} KG across ${selectedBatches.length} coil batch(es) under ${combinationTier.label}.`
      : `Partial stock allocation: ${allocatedTotal.toLocaleString()} KG allocated (${fulfilledPercent}%). Production deficit of ${productionGapKG.toLocaleString()} KG.`,
    warnings: [...new Set(warnings)]
  };
}

// Backward-compatible export aliases
export const calculateCompatibilityScore = (requirements, batch, complaints = []) => {
  const pair = calculatePairCompatibility(requirements, batch, complaints);
  return {
    batch,
    score: pair.score,
    classification: pair.tier.tier <= 2 ? 'HIGH' : pair.tier.tier === 3 ? 'MODERATE' : 'LOW',
    tier: pair.tier,
    matchingFactors: pair.matches,
    differences: pair.warnings,
    ageDifference: pair.ageRankDiff * 30,
    breakdown: pair.matches.map(m => ({ factor: m, max: 20, value: 20, match: true }))
  };
};

export const explainCompatibility = (result) => ({
  summary: result.tier?.description || 'Preliminary compatibility evaluation.',
  warnings: result.differences || []
});

export const recommendBatchCombination = recommendCoilAllocation;

