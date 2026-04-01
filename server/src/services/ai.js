const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== Rule-based fallback (when no Gemini key) =====
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

  // Distance factor
  const distanceWords = ['remote', 'distance', 'far', 'village', 'rural', 'travel', 'hour', 'commute', 'bus'];
  const distanceHits = distanceWords.filter(k => reason.includes(k));
  if (distanceHits.length > 0) {
    rawScore += distanceHits.length * 2;
    factors.push({ factor: 'Distance from University', detail: `Residence appears to be far from campus (mentions: ${distanceHits.join(', ')})`, impact: 'high' });
  }

  // Financial factor
  const financeWords = ['financial', 'hardship', 'poverty', 'low-income', 'afford', 'scholarship', 'underprivileged', 'orphan'];
  const financeHits = financeWords.filter(k => reason.includes(k));
  if (financeHits.length > 0) {
    rawScore += financeHits.length * 2.5;
    factors.push({ factor: 'Financial Condition', detail: `Student reports financial constraints (mentions: ${financeHits.join(', ')})`, impact: 'high' });
  }

  // Medical factor
  const medicalWords = ['medical', 'health', 'disability', 'chronic', 'surgery', 'treatment', 'emergency'];
  const medicalHits = medicalWords.filter(k => reason.includes(k));
  if (medicalHits.length > 0) {
    rawScore += medicalHits.length * 2.5;
    factors.push({ factor: 'Medical/Health', detail: `Health-related concerns mentioned (mentions: ${medicalHits.join(', ')})`, impact: 'high' });
  }

  // Academic factor
  const academicWords = ['research', 'lab', 'library', 'academic', 'study', 'classes', 'early'];
  const academicHits = academicWords.filter(k => reason.includes(k));
  if (academicHits.length > 0) {
    rawScore += academicHits.length * 1.5;
    factors.push({ factor: 'Academic Needs', detail: `Educational requirements cited (mentions: ${academicHits.join(', ')})`, impact: 'medium' });
  }

  // Reason detail
  if (reason.length > 300) { rawScore += 2; }
  else if (reason.length > 150) { rawScore += 1; }

  // Documents
  if (application.document_url) {
    rawScore += 2;
    factors.push({ factor: 'Supporting Documents', detail: 'Student has attached supporting documents', impact: 'medium' });
  } else {
    factors.push({ factor: 'Supporting Documents', detail: 'No supporting documents provided', impact: 'low' });
  }

  if (factors.length === 1) {
    factors.unshift({ factor: 'General Request', detail: 'Application provides general reasons without specific urgency indicators', impact: 'low' });
  }

  // Normalize to 1-10
  const score = Math.max(1, Math.min(10, Math.round(rawScore)));

  let recommendation;
  if (score >= 7) recommendation = 'strong';
  else if (score >= 4) recommendation = 'moderate';
  else recommendation = 'weak';

  const summary = `Priority Score: ${score}/10. ` + factors.map(f => `${f.factor}: ${f.detail}`).join('. ') + '.';

  return { summary, recommendation, score, factors };
}

// ===== Gemini AI Analysis =====
async function geminiAnalysis(application) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an AI assistant helping a university hall provost evaluate seat allocation applications at BUET (Bangladesh University of Engineering and Technology).

Analyze this student's application and provide a PRIORITY SCORE out of 10 along with detailed factor-based reasoning.

SCORING CRITERIA (evaluate each factor independently):

1. **Distance from University** (0-2 points)
   - 2: Student's permanent residence is very far from university / different district or division
   - 1: Moderately far / outside city but within reasonable distance
   - 0: Lives nearby / within Dhaka city

2. **Financial Condition** (0-3 points)
   - 3: Severe financial hardship, family cannot afford rent, orphan, or on scholarship
   - 2: Moderate financial difficulty, lower-middle income
   - 1: Some financial concerns mentioned
   - 0: No financial issues mentioned

3. **Medical/Health Needs** (0-2 points)
   - 2: Chronic illness, disability, or requires regular treatment near campus
   - 1: Minor health concerns that affect commuting
   - 0: No health issues

4. **Academic Justification** (0-2 points)
   - 2: Research work, lab access, early/late classes, thesis work requiring campus presence
   - 1: General academic convenience
   - 0: No academic reasons

5. **Supporting Documentation** (0-1 point)
   - 1: Has attached supporting documents
   - 0: No documents provided

TOTAL: Sum all factors for score out of 10.

APPLICATION DETAILS:
- Student Name: ${application.student_name || 'Unknown'}
- Department: ${application.department || 'Not specified'}
- Year/Level: ${application.year || 'Not specified'}
- Reason: ${application.reason}
- Has Supporting Documents: ${application.document_url ? 'Yes' : 'No'}

RESPOND IN STRICT JSON FORMAT ONLY (no markdown, no extra text):
{
  "score": <number 1-10>,
  "recommendation": "<strong|moderate|weak>",
  "summary": "<2-3 sentence overall assessment>",
  "factors": [
    {"factor": "Distance from University", "detail": "<specific assessment>", "impact": "<high|medium|low>", "points": <0-2>},
    {"factor": "Financial Condition", "detail": "<specific assessment>", "impact": "<high|medium|low>", "points": <0-3>},
    {"factor": "Medical/Health Needs", "detail": "<specific assessment>", "impact": "<high|medium|low>", "points": <0-2>},
    {"factor": "Academic Justification", "detail": "<specific assessment>", "impact": "<high|medium|low>", "points": <0-2>},
    {"factor": "Supporting Documents", "detail": "<specific assessment>", "impact": "<high|medium|low>", "points": <0-1>}
  ]
}

Rules:
- score must equal sum of all factor points (clamped 1-10)
- recommendation: "strong" if score >= 7, "moderate" if score 4-6, "weak" if score <= 3
- Be fair but thorough. Read the reason carefully for implicit indicators.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    //print text in terminal
    
    // Parse JSON from response (handle possible markdown wrapping)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (typeof parsed.score === 'number' &&
        typeof parsed.summary === 'string' &&
        ['strong', 'moderate', 'weak'].includes(parsed.recommendation) &&
        Array.isArray(parsed.factors)) {

        // Clamp score
        parsed.score = Math.max(1, Math.min(10, Math.round(parsed.score)));

        console.log(`🤖 Gemini scored application: ${parsed.score}/10 (${parsed.recommendation})`);
        return parsed;
      }
    }
    throw new Error('Invalid AI response structure');
  } catch (err) {
    console.error('Gemini API error, falling back to rule-based:', err.message);
    return ruleBasedAnalysis(application);
  }
}

// ===== Main entry point =====
async function analyzeApplication(application) {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return await geminiAnalysis(application);
  }
  return ruleBasedAnalysis(application);
}

module.exports = { analyzeApplication };
