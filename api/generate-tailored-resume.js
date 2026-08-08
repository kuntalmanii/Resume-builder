const https = require('https');
const { GEMINI_MODELS, SHARED_TAXONOMY_KEYWORDS } = require('./_shared');

function extractResumeDetails(resumeText) {
  const text = (resumeText || '').trim();

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let name = '';
  const ignoreWords = ['resume', 'curriculum', 'vitae', 'cv', 'contact', 'summary', 'profile', 'experience', 'education', 'skills', 'email', 'phone', 'experiencia', 'resumen', 'perfil', 'formación', 'educación', 'ausbildung', 'berufserfahrung', 'compétences', 'expérience'];

  for (let line of lines.slice(0, 5)) {
    let candidatePart = line;
    if (line.includes('//') || line.includes('|')) {
      candidatePart = line.split(/\/\/|\|/)[0].trim();
    }
    candidatePart = candidatePart.replace(/^(name|candidate name|full name|nombre|nome)\s*:\s*/i, '').trim();
    const lower = candidatePart.toLowerCase();
    if (!lower.includes('@') && !/\d{4,}/.test(lower) && !ignoreWords.some(w => lower.includes(w))) {
      if (candidatePart.length >= 2 && candidatePart.length <= 40 && !/[;{}]/.test(candidatePart)) {
        name = candidatePart;
        break;
      }
    }
  }

  const locationMatch = text.match(/([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))/);
  const location = locationMatch ? locationMatch[1] : '';

  const eduList = [];
  const eduKeywords = ['university', 'college', 'institute', 'bachelor', 'b.s.', 'b.tech', 'b.e.', 'master', 'm.s.', 'm.tech', 'ph.d', 'degree', 'diploma', 'stanford', 'mit', 'harvard', 'iit', 'certif'];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (eduKeywords.some(kw => lower.includes(kw))) {
      const cleanLine = line.replace(/^[•\-\*\s]+/, '').trim();
      if (!eduList.includes(cleanLine)) eduList.push(cleanLine);
    }
  }
  const education = eduList.length > 0 ? eduList : '';

  const textLower = text.toLowerCase();
  const skills = SHARED_TAXONOMY_KEYWORDS.filter(kw => textLower.includes(kw.toLowerCase()));

  const bulletLines = lines.filter(l => {
    const low = l.toLowerCase();
    if (low.includes('@') || low.startsWith('skills:') || low.startsWith('skills ') || eduKeywords.some(kw => low.includes(kw))) return false;
    return /^[•\-\*]\s+|^\d+\.\s+/.test(l) || l.length > 25;
  }).slice(0, 5);

  return { name, email, phone, location, education, skills, bulletLines };
}

function runFallbackTailoredResume(jdText, resumeText) {
  const details = extractResumeDetails(resumeText);
  const titleMatch = jdText ? jdText.split(/\r?\n/)[0].replace(/^(we are looking for a|hiring|role:?|job title:?)\s*/i, '').trim() : '';
  const jobTitle = (titleMatch && titleMatch.length < 50) ? titleMatch : 'Target Role';

  return {
    name: details.name || 'Candidate',
    jobTitle: jobTitle,
    email: details.email || 'developer@resuai.dev',
    phone: details.phone || '',
    location: details.location || '',
    summary: `Results-driven software engineer with background in ${details.skills.slice(0, 3).join(', ') || 'technical system development'}. Tailored for ${jobTitle} role with focus on performance and architectural excellence.`,
    skills: details.skills.length > 0 ? details.skills : ['TypeScript', 'React', 'Next.js', 'Node.js', 'System Architecture'],
    experience: [
      {
        title: jobTitle,
        company: 'Key Experience (from Uploaded Resume)',
        period: 'Recent',
        bullets: details.bulletLines.length > 0 ? details.bulletLines.map(b => b.replace(/^[•\-\*]\s*/, '')) : [
          'Engineered scalable software modules aligned with modern software engineering practices.',
          'Optimized core application features improving stability, scalability, and user engagement.'
        ]
      }
    ],
    education: details.education || ''
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
              const contact = analysisObj.contact_info || {};
              const normalized = {
                name: analysisObj.name || contact.full_name || analysisObj.full_name || 'Not provided',
                jobTitle: analysisObj.jobTitle || analysisObj.job_title || 'Target Role',
                email: analysisObj.email || contact.email || 'Not provided',
                phone: analysisObj.phone || contact.phone || 'Not provided',
                location: analysisObj.location || contact.location || 'Not provided',
                summary: analysisObj.summary || analysisObj.professional_summary || '',
                skills: Array.isArray(analysisObj.skills) ? analysisObj.skills : (analysisObj.skills ? [...(analysisObj.skills.technical || []), ...(analysisObj.skills.soft || []), ...(analysisObj.skills.tools || [])] : []),
                experience: (analysisObj.experience || analysisObj.work_experience || []).map(exp => ({
                  title: exp.title || exp.job_title || 'Role',
                  company: exp.company || 'Organization',
                  period: exp.period || exp.dates || 'Dates',
                  bullets: exp.bullets || exp.bullet_points || []
                })),
                education: (analysisObj.education || []).map(edu => ({
                  degree: edu.degree || 'Degree',
                  institution: edu.institution || edu.school || 'University',
                  year: edu.year || edu.graduation_year || 'Dates'
                }))
              };
              resolve(normalized);
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
    const { jdText = '', resumeText = '', geminiModel = '' } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = runFallbackTailoredResume(jdText, resumeText);
      return res.status(200).json(fallback);
    }

    const prompt = `You are an elite Senior Technical Resume Writer and ATS Specialist.

IMPORTANT RULES — READ CAREFULLY:
- You MUST extract ALL personal details (name, email, phone, location, education, job history, skills) EXCLUSIVELY from the CANDIDATE'S UPLOADED RESUME TEXT provided below.
- Do NOT invent, hallucinate, or assume any detail that is not explicitly present in the resume text.
- If a field (e.g. phone, location) is genuinely absent from the resume, use a neutral placeholder like "Not provided".
- The candidate's experience bullets must be based on their ACTUAL job history from the resume — do not fabricate roles, companies, or achievements.

Your task: Rewrite and tailor the candidate's resume so it maximises ATS keyword match for the target job description. Keep all real facts; only enhance language, structure, and keyword alignment.

TARGET JOB DESCRIPTION:
${jdText}

CANDIDATE'S UPLOADED RESUME TEXT (source of truth — use only this):
${resumeText}

Instructions:
1. Extract the candidate's full name, email, phone, and location EXACTLY as they appear in the resume text above.
2. Extract ALL work experience entries (company names, job titles, dates, responsibilities) from the resume. Do not invent new roles.
3. Extract education details exactly as stated in the resume.
4. Extract the candidate's real skills from the resume, then reorder/filter to prioritise those matching the job description.
5. Rewrite experience bullets using strong action verbs and add quantified metrics where the resume already implies scale — do not fabricate numbers that have no basis in the resume.
6. Write a 2-3 sentence professional summary tailored to the job description, using only information grounded in the resume.
7. Respond STRICTLY with valid JSON following this exact schema:
{
  "name": "<full name extracted from resume, or 'Not provided'>",
  "jobTitle": "<target job title from JD>",
  "email": "<email extracted from resume, or 'Not provided'>",
  "phone": "<phone extracted from resume, or 'Not provided'>",
  "location": "<location extracted from resume, or 'Not provided'>",
  "summary": "<2-3 sentence tailored professional summary based on resume content>",
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
      "degree": "<degree or credential title extracted from resume>",
      "institution": "<university or issuing organization>",
      "year": "<year or date range>"
    }
  ]
}`;

    let result = null;
    let modelsToTry = [geminiModel, ...GEMINI_MODELS].filter(Boolean);
    modelsToTry = [...new Set(modelsToTry)];

    for (const model of modelsToTry) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result) break;
      } catch (err) {
        console.warn(`Model ${model} failed for tailored resume, trying next...`, err.message);
      }
    }

    if (!result) {
      result = runFallbackTailoredResume(jdText, resumeText);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Tailored Resume API catch error:', err);
    const body = req.body || {};
    const fallback = runFallbackTailoredResume(body.jdText || '', body.resumeText || '');
    return res.status(200).json(fallback);
  }
};
