const key = value => String(value || 'Not specified').trim();
const normalize = value => String(value || '').trim().toUpperCase();

const countBy = (items, selector) =>
  Object.entries(items.reduce((result, item) => {
    const name = key(selector(item));
    result[name] = (result[name] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);

/**
 * Checks if two specific batches were previously mixed in a customer complaint.
 */
export function checkPairConflict(batchIdA, batchIdB, complaints = []) {
  const idA = normalize(batchIdA);
  const idB = normalize(batchIdB);
  if (!idA || !idB || idA === idB) return null;

  for (const c of complaints) {
    const recordedText = normalize(c.batches || c.batchCombination || '');
    if (recordedText.includes(idA) && recordedText.includes(idB)) {
      return {
        conflict: true,
        complaintId: c.id,
        issueType: c.issueType,
        severity: c.severity,
        customerReference: c.customerReference,
        description: c.description,
        status: c.status
      };
    }
  }
  return null;
}

/**
 * Gets all complaints linked to a specific batch ID.
 */
export function getBatchComplaints(batchId, complaints = []) {
  const id = normalize(batchId);
  if (!id) return [];
  return complaints.filter(c => normalize(c.batches || c.batchCombination || '').includes(id));
}

/**
 * Determines if a batch is under quality quarantine due to active high-severity complaints.
 */
export function isBatchQuarantined(batchId, complaints = []) {
  const history = getBatchComplaints(batchId, complaints);
  return history.some(c => c.severity === 'High' && c.status !== 'Resolved');
}

/**
 * Analyzes empirical complaint patterns and recurrence signals.
 */
export function analyzeComplaintPatterns(complaints, batches = []) {
  const shade = complaints.filter(item => /shade|colour|gloss/i.test(item.issueType || ''));
  const combinations = countBy(complaints, item => item.batches || item.batchCombination);
  const frequent = combinations.filter(([, count]) => count > 1).map(([combination, count]) => ({
    combination,
    count,
    message: 'Recurring shade clash detected across multiple customer orders. Avoid this combination.'
  }));

  return {
    total: complaints.length,
    shadeDifference: shade.length,
    byProduct: countBy(complaints, item => item.product),
    byColor: countBy(complaints, item => item.color),
    byPlant: countBy(complaints, item => item.plant),
    byBatch: countBy(complaints, item => item.batches),
    combinations,
    frequent,
    batchCount: batches.length
  };
}

