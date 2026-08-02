const https = require('https');

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

const SHARED_TAXONOMY_KEYWORDS = [
  'TypeScript', 'React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Vanilla CSS',
  'Node.js', 'Express', 'Python', 'Django', 'FastAPI', 'Go', 'Rust', 'Java',
  'Spring Boot', 'C++', 'GraphQL', 'REST API', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Supabase', 'Firebase', 'AWS', 'Docker', 'Kubernetes', 'CI/CD',
  'Git', 'Jest', 'TailwindCSS', 'Microservices', 'System Design',
  'Machine Learning', 'PyTorch', 'TensorFlow', 'NLP', 'Data Science', 'Pandas',
  'NumPy', 'Scikit-Learn', 'Deep Learning', 'Photoshop', 'Illustrator', 'Figma',
  'Graphic Design', 'UI/UX Design', 'InDesign', 'Typography', 'Vector Graphics'
];

function sanitizeInputText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

function extractKeywords(text) {
  if (!text) return new Set();
  const lower = text.toLowerCase();
  const found = new Set();
  SHARED_TAXONOMY_KEYWORDS.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) {
      found.add(kw);
    }
  });
  return found;
}

function runServerFallbackAnalysis(resumeText, jobDescription) {
  const cleanResume = sanitizeInputText(resumeText);
  const cleanJd = sanitizeInputText(jobDescription);

  const resumeKeywords = extractKeywords(cleanResume);
  const jdKeywords = extractKeywords(cleanJd);

  // Fallback word extraction if taxonomy items are sparse in JD
  if (jdKeywords.size === 0 && cleanJd.length > 20) {
    const words = cleanJd.match(/\b[A-Za-z]{4,}\b/g) || [];
    const stopWords = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your','requirements','experience','seeking','senior','lead','developer','engineer','ability','work','team']);
    const wordFreq = {};
    words.forEach(w => {
      if (!stopWords.has(w.toLowerCase())) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const topWords = Object.keys(wordFreq).sort((a,b) => wordFreq[b] - wordFreq[a]).slice(0, 8);
    topWords.forEach(w => jdKeywords.add(w));
  }

  const matched = [];
  const missing = [];

  jdKeywords.forEach(kw => {
    if (resumeKeywords.has(kw) || cleanResume.toLowerCase().includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const matchedCount = matched.length;
  const totalCount = jdKeywords.size || 1;
  const matchPct = Math.min(100, Math.round((matchedCount / totalCount) * 100));

  return {
    score: matchPct,
    matchedKeywords: matched,
    missingKeywords: missing,
    recommendations: missing.length > 0 ? [
      `Critical Skill Gap: The uploaded resume lacks required core technical competencies for this role (missing: ${missing.slice(0, 4).join(', ')}).`,
      'Incorporate target technical keywords directly into your experience section headings for ATS compliance.',
      'Maintain standard single-column structure for maximum parser readability.'
    ] : [
      'Excellent alignment! Your resume matches all core technical requirements.',
      'Quantify experience bullets using metric-driven outcome formulas ([Action Verb] + [Metric] + [Outcome]).',
      'Maintain standard single-column structure for maximum parser readability.'
    ],
    sectionScores: {
      keywordMatch: matchPct,
      skillsAlignment: Math.min(100, Math.round(matchPct * 0.95)),
      formattingATS: 95,
      experienceImpact: matchPct < 20 ? 30 : 88
    }
  };
}

function makeGeminiRequest(model, promptText, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const rawContent = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysisObj = JSON.parse(jsonMatch[0]);
              resolve(analysisObj);
            } else {
              reject(new Error("Failed to parse JSON response from Gemini API"));
            }
          } catch (e) {
            reject(new Error("Gemini response JSON parse error: " + e.message));
          }
        } else {
          reject(new Error(`Gemini API returned status HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const { resumeText = '', jobDescription = '', preferredModel = '' } = body;
    const cleanResume = sanitizeInputText(resumeText);
    const cleanJd = sanitizeInputText(jobDescription);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = runServerFallbackAnalysis(cleanResume, cleanJd);
      return res.status(200).json(fallback);
    }

    const prompt = `You are an expert Senior Technical Recruiter and Applicant Tracking System (ATS) Parser.
Analyze the following Candidate Resume against the Target Job Description for ATS compatibility.

JOB DESCRIPTION:
${cleanJd}

CANDIDATE RESUME & SKILLS TEXT:
${cleanResume}

Evaluate keyword overlap, hard technical requirements, and section formatting.
Respond STRICTLY with a valid JSON object following this exact JSON schema:
{
  "score": <number between 0 and 100 representing ATS match percentage>,
  "matchedKeywords": [<array of technical skills, frameworks, and requirements matched in both>],
  "missingKeywords": [<array of critical technical skills & qualifications present in JD but missing in Resume>],
  "recommendations": [<array of formatting or ATS parsing recommendations>],
  "sectionScores": {
    "keywordMatch": <0-100>,
    "skillsAlignment": <0-100>,
    "formattingATS": <0-100>,
    "experienceImpact": <0-100>
  }
}`;

    let result = null;
    let modelsToTry = [preferredModel, ...GEMINI_MODELS].filter(Boolean);
    modelsToTry = [...new Set(modelsToTry)];

    for (const model of modelsToTry) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result) break;
      } catch (err) {
        console.warn(`Model ${model} failed, trying next...`, err.message);
      }
    }

    if (!result) {
      result = runServerFallbackAnalysis(cleanResume, cleanJd);
    }

    return res.status(200).json(result);
  } catch (err) {
    const fallback = runServerFallbackAnalysis('', '');
    return res.status(200).json(fallback);
  }
};
