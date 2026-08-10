/**
 * ResuAI — /api/generate-tailored-resume handler
 * Vercel Serverless Function & local Node.js compatible.
 *
 * Accepts: POST { jdText, resumeText, geminiModel }
 * Returns: JSON resume object tailored to the job description.
 */

const https = require('https');
const { GEMINI_MODELS, SHARED_TAXONOMY_KEYWORDS, sanitizeInputText, setCorsHeaders } = require('./_shared');

// ── Gemini API call ──────────────────────────────────────────────────────────

function makeGeminiRequest(modelName, promptText, apiKey) {
  return new Promise((resolve, reject) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const url = new URL(endpoint);
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Gemini HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
          const parsed = JSON.parse(data);
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error('Empty Gemini response'));
          let clean = rawText.trim();
          if (clean.startsWith('```')) {
            clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          }
          resolve(JSON.parse(clean));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function callGeminiWithFallback(prompt, preferredModel, apiKey) {
  const models = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : [...GEMINI_MODELS];

  let lastErr;
  for (const model of models) {
    try {
      return await makeGeminiRequest(model, prompt, apiKey);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('All Gemini models failed');
}

// ── Offline heuristic fallback ───────────────────────────────────────────────

function extractResumeDetails(resumeText) {
  const text = (resumeText || '').trim();
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const ignoreWords = ['resume', 'curriculum', 'vitae', 'cv', 'contact', 'summary', 'profile', 'experience', 'education', 'skills', 'email', 'phone'];
  let name = '';
  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    if (!lower.includes('@') && !/\d{4,}/.test(lower) && !ignoreWords.some(w => lower.includes(w))) {
      if (line.length >= 2 && line.length <= 40 && !/[;{}]/.test(line)) {
        name = line;
        break;
      }
    }
  }
  const locationMatch = text.match(/([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))/);
  const eduKeywords = ['university', 'college', 'institute', 'bachelor', 'master', 'ph.d', 'degree', 'diploma', 'iit', 'certif'];
  const eduList = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (eduKeywords.some(kw => lower.includes(kw))) {
      const clean = line.replace(/^[•\-\*\s]+/, '').trim();
      if (!eduList.includes(clean)) eduList.push(clean);
    }
  }
  const textLower = text.toLowerCase();
  const skills = SHARED_TAXONOMY_KEYWORDS.filter(kw => textLower.includes(kw.toLowerCase()));
  const bulletLines = lines.filter(l => {
    const low = l.toLowerCase();
    if (low.includes('@') || low.startsWith('skills:') || eduKeywords.some(kw => low.includes(kw))) return false;
    return /^[•\-\*]\s+|^\d+\.\s+/.test(l) || l.length > 25;
  }).slice(0, 5);

  return {
    name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: locationMatch ? locationMatch[1] : '',
    education: eduList,
    skills,
    bulletLines
  };
}

function runFallback(jdText, resumeText) {
  const details = extractResumeDetails(resumeText);
  const titleMatch = jdText ? jdText.split(/\r?\n/)[0].replace(/^(we are looking for a|hiring|role:?|job title:?)\s*/i, '').trim() : '';
  const jobTitle = (titleMatch && titleMatch.length < 50) ? titleMatch : 'Target Role';

  return {
    name: details.name || '',
    jobTitle,
    email: details.email || '',
    phone: details.phone || '',
    location: details.location || '',
    summary: `Results-driven software engineer with background in ${details.skills.slice(0, 3).join(', ') || 'technical system development'}. Tailored for ${jobTitle} role with focus on performance and architectural excellence.`,
    skills: details.skills.length > 0 ? details.skills : ['TypeScript', 'React', 'Next.js', 'Node.js', 'System Architecture'],
    experience: [{
      title: jobTitle,
      company: 'Key Experience (from Uploaded Resume)',
      period: 'Recent',
      bullets: details.bulletLines.length > 0
        ? details.bulletLines.map(b => b.replace(/^[•\-\*]\s*/, ''))
        : ['Engineered scalable software modules aligned with modern engineering practices.', 'Optimized core features improving stability, scalability, and user engagement.']
    }],
    education: details.education || []
  };
}

// ── Gemini prompt ────────────────────────────────────────────────────────────

function buildPrompt(jdText, resumeText) {
  return `You are an elite Senior Technical Resume Writer and ATS Specialist.

IMPORTANT RULES — READ CAREFULLY:
- You MUST extract ALL personal details (name, email, phone, location, education, job history, skills) EXCLUSIVELY from the CANDIDATE'S UPLOADED RESUME TEXT provided below.
- Do NOT invent, hallucinate, or assume any detail that is not explicitly present in the resume text.
- If a field (e.g. phone, location) is genuinely absent from the resume, use a neutral placeholder like "Not provided".
- The candidate's experience bullets must be based on their ACTUAL job history from the resume — do not fabricate roles, companies, or achievements.

Your task: Rewrite and tailor the candidate's resume so it maximises ATS keyword match for the target job description.

TARGET JOB DESCRIPTION:
${jdText}

CANDIDATE'S UPLOADED RESUME TEXT (source of truth — use only this):
${resumeText}

Instructions:
1. Extract the candidate's full name, email, phone, and location EXACTLY as they appear in the resume text above.
2. Extract ALL work experience entries (company names, job titles, dates, responsibilities) from the resume.
3. Extract education details exactly as stated in the resume.
4. Extract the candidate's real skills, reordered to prioritise those matching the job description.
5. Rewrite experience bullets using strong action verbs and quantified metrics grounded in the resume.
6. Write a 2-3 sentence professional summary tailored to the job description.
7. Respond STRICTLY with valid JSON following this exact schema:
{
  "name": "<full name extracted from resume, or 'Not provided'>",
  "jobTitle": "<target job title from JD>",
  "email": "<email extracted from resume, or 'Not provided'>",
  "phone": "<phone extracted from resume, or 'Not provided'>",
  "location": "<location extracted from resume, or 'Not provided'>",
  "summary": "<2-3 sentence tailored professional summary>",
  "skills": ["<real skill from resume, prioritised by JD relevance>"],
  "experience": [
    {
      "title": "<real job title from resume>",
      "company": "<real company name from resume>",
      "period": "<dates from resume, e.g. 2022 - Present>",
      "bullets": ["<rewritten bullet based on real resume content>"]
    }
  ],
  "education": [
    {
      "degree": "<degree or credential title>",
      "institution": "<university or issuing organization>",
      "year": "<year or date range>"
    }
  ]
}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const jdText      = sanitizeInputText(body.jdText || body.jobDescription || '');
    const resumeText  = sanitizeInputText(body.resumeText || body.resume_text || '');
    const preferredModel = (body.geminiModel || '').trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!jdText || !resumeText) {
      return res.status(400).json({ error: 'Both jdText and resumeText are required.' });
    }

    if (!apiKey) {
      return res.status(200).json(runFallback(jdText, resumeText));
    }

    try {
      const result = await callGeminiWithFallback(buildPrompt(jdText, resumeText), preferredModel, apiKey);
      return res.status(200).json(result);
    } catch (geminiErr) {
      return res.status(200).json(runFallback(jdText, resumeText));
    }
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
