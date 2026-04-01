const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== Rule-based fallback keywords =====
const STRONG_KEYWORDS = [
  'medical', 'health', 'disability', 'financial', 'hardship', 'poverty',
  'remote', 'distance', 'emergency', 'orphan', 'scholarship', 'crisis',
  'chronic', 'surgery', 'treatment', 'low-income', 'underprivileged',
  'flood', 'disaster', 'homeless'
];

const MODERATE_KEYWORDS = [
  'commute', 'transport', 'early', 'morning', 'safety', 'security',
  'academic', 'research', 'lab', 'library', 'study', 'convenience',
  'far', 'travel', 'hour', 'bus', 'village', 'rural'
];

function ruleBasedAnalysis(application) {
  const reason = (application.reason || '').toLowerCase();
  let rawScore = 0;
  const factors = [];

  // TODO: scoring logic

  const score = Math.max(1, Math.min(10, Math.round(rawScore)));

  let recommendation;
  if (score >= 7) recommendation = 'strong';
  else if (score >= 4) recommendation = 'moderate';
  else recommendation = 'weak';

  const summary = `Priority Score: ${score}/10.`;

  return { summary, recommendation, score, factors };
}

  // Distance factor
  const distanceWords = ['remote', 'distance', 'far', 'village', 'rural', 'travel', 'hour', 'commute', 'bus'];
  const distanceHits = distanceWords.filter(k => reason.includes(k));
  if (distanceHits.length > 0) {
    rawScore += distanceHits.length * 2;
    factors.push({
      factor: 'Distance from University',
      detail: `Residence appears to be far from campus (mentions: ${distanceHits.join(', ')})`,
      impact: 'high'
    });
  }

  // Financial factor
  const financeWords = ['financial', 'hardship', 'poverty', 'low-income', 'afford', 'scholarship', 'underprivileged', 'orphan'];
  const financeHits = financeWords.filter(k => reason.includes(k));
  if (financeHits.length > 0) {
    rawScore += financeHits.length * 2.5;
    factors.push({
      factor: 'Financial Condition',
      detail: `Student reports financial constraints (mentions: ${financeHits.join(', ')})`,
      impact: 'high'
    });
  }

    // Medical factor
  const medicalWords = ['medical', 'health', 'disability', 'chronic', 'surgery', 'treatment', 'emergency'];
  const medicalHits = medicalWords.filter(k => reason.includes(k));
  if (medicalHits.length > 0) {
    rawScore += medicalHits.length * 2.5;
    factors.push({
      factor: 'Medical/Health',
      detail: `Health-related concerns mentioned (mentions: ${medicalHits.join(', ')})`,
      impact: 'high'
    });
  }

  // Academic factor
  const academicWords = ['research', 'lab', 'library', 'academic', 'study', 'classes', 'early'];
  const academicHits = academicWords.filter(k => reason.includes(k));
  if (academicHits.length > 0) {
    rawScore += academicHits.length * 1.5;
    factors.push({
      factor: 'Academic Needs',
      detail: `Educational requirements cited (mentions: ${academicHits.join(', ')})`,
      impact: 'medium'
    });
  }

    // Reason detail
  if (reason.length > 300) { rawScore += 2; }
  else if (reason.length > 150) { rawScore += 1; }

  // Documents
  if (application.document_url) {
    rawScore += 2;
    factors.push({
      factor: 'Supporting Documents',
      detail: 'Student has attached supporting documents',
      impact: 'medium'
    });
  } else {
    factors.push({
      factor: 'Supporting Documents',
      detail: 'No supporting documents provided',
      impact: 'low'
    });
  }

  if (factors.length === 1) {
    factors.unshift({
      factor: 'General Request',
      detail: 'Application provides general reasons without specific urgency indicators',
      impact: 'low'
    });
  }

  const summary = `Priority Score: ${score}/10. ` +
    factors.map(f => `${f.factor}: ${f.detail}`).join('. ') + '.';