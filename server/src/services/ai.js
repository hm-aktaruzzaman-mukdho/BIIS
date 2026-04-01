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