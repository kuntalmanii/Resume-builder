/**
 * ResuAI // Secure Backend Server & Gemini 2.5 Flash Proxy (Latest)
 * Pure Node.js — Zero External Dependencies Required!
 *
 * Keeps GEMINI_API_KEY completely secure on the backend server.
 * Never exposes API keys to client-side code or browser inspector.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Server-side HTTPS call to Google Gemini 2.5 Flash REST API
 * @param {string} jdText 
 * @param {string} resumeText 
 * @returns {Promise<Object>}
 */
function callGeminiApi(jdText, resumeText) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error("GEMINI_API_KEY environment variable is not set on the server."));
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const url = new URL(endpoint);

    const prompt = `You are an expert Senior Technical Recruiter and Applicant Tracking System (ATS) Parser.
Analyze the following Candidate Resume against the Target Job Description for ATS compatibility.

JOB DESCRIPTION:
${jdText}

CANDIDATE RESUME & SKILLS TEXT:
${resumeText}

Evaluate keyword overlap, hard technical requirements, and section formatting.
Respond STRICTLY with a valid JSON object following this exact JSON schema:
{
  "score": <number between 0 and 100 representing ATS match percentage>,
  "matchedKeywords": [<array of technical skills, frameworks, and requirements matched in both>],
  "missingKeywords": [<array of required skills, frameworks, or qualifications missing in resume>],
  "recommendations": [
    "<actionable recommendation 1 for 95%+ match>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ]
}`;

    const payload = JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
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
            return reject(new Error(`Gemini API returned status ${res.statusCode}: ${data}`));
          }
          const parsedRes = JSON.parse(data);
          const rawText = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error("Empty content in Gemini API response"));
          resolve(JSON.parse(rawText));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

/**
 * Server-side heuristic fallback for local matching when no API key is provided
 */
function runServerFallbackAnalysis(jdText, resumeText) {
  const KNOWN_KEYWORDS = [
    'TypeScript', 'React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Vanilla CSS',
    'Design Systems', 'GraphQL', 'REST APIs', 'Web Vitals', 'Performance',
    'Node', 'Kubernetes', 'Docker', 'Redis', 'CI/CD', 'Communication',
    'Project Management', 'System Architecture', 'Python', 'Git', 'Agile'
  ];

  const jdLower = (jdText || "").toLowerCase();
  const candidateLower = (resumeText || "").toLowerCase();

  const jdKeywordsPresent = KNOWN_KEYWORDS.filter(kw => jdLower.includes(kw.toLowerCase()));
  const activeJdKeywords = jdKeywordsPresent.length >= 3 ? jdKeywordsPresent : 
    ['TypeScript', 'React', 'Design Systems', 'Vanilla CSS', 'Web Vitals', 'GraphQL', 'Kubernetes', 'Redis', 'CI/CD'];

  const matched = [];
  const missing = [];

  activeJdKeywords.forEach(kw => {
    if (candidateLower.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const total = activeJdKeywords.length || 1;
  const matchRatio = matched.length / total;
  const dynamicScore = Math.min(94, Math.max(70, Math.round(70 + (matchRatio * 24))));

  const topMissing = missing.slice(0, 2).join(', ') || 'Kubernetes / Redis';

  return {
    score: dynamicScore,
    matchedKeywords: matched,
    missingKeywords: missing,
    recommendations: [
      `Incorporate 1-2 instances of missing keywords (${topMissing}) under your experience bullet points.`,
      `Quantify Web Vitals or performance metrics with explicit percentage improvements (e.g. Reduced LCP by 42%).`,
      `Maintain standard section headings like TECHNICAL EXPERTISE for 100% parsing accuracy in Lever & Greenhouse.`
    ]
  };
}

/**
 * Server-side HTTPS call to Google Gemini 2.5 Flash for Resume Optimization
 * @param {string} jobTitle 
 * @param {string} experienceText 
 * @param {Array<string>} skills 
 */
function callGeminiOptimize(jobTitle, experienceText, skills) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error("GEMINI_API_KEY is not set on server."));
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const url = new URL(endpoint);

    const prompt = `You are a Senior Technical Resume Writer and Google Staff Engineer.
Optimize the candidate's work experience bullet points for maximum ATS impact and recruiter engagement.

TARGET JOB TITLE: ${jobTitle || 'Senior Software Engineer'}
SKILLS: ${Array.isArray(skills) ? skills.join(', ') : (skills || 'TypeScript, React')}
CURRENT EXPERIENCE BULLET POINTS:
${experienceText || 'Built frontend UI components.'}

Instructions:
1. Rewrite the experience text into 3-5 punchy, high-impact bullet points starting with strong action verbs (e.g. Architected, Engineered, Spearheaded, Decreased, Optimized).
2. Include realistic performance metrics (e.g., "Reduced LCP by 42%", "Built design system serving 2M+ active users").
3. Respond STRICTLY in JSON format with schema:
{
  "optimizedBulletPoints": "Architected high-throughput UI component system serving 2M+ active monthly users.\\nEngineered automated Web Vitals optimization pipeline, reducing LCP by 42% and CLS to <0.05.\\nSpearheaded migration to TypeScript and Next.js, accelerating release velocity by 35% across 4 cross-functional teams.",
  "suggestedSkills": ["TypeScript", "React", "Next.js", "Design Systems", "Web Vitals", "GraphQL", "Performance"]
}`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
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
            return reject(new Error(`Gemini API returned status ${res.statusCode}: ${data}`));
          }
          const parsedRes = JSON.parse(data);
          const rawText = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error("Empty response from Gemini API"));
          resolve(JSON.parse(rawText));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
}

function runServerFallbackOptimization(jobTitle, experienceText) {
  return {
    optimizedBulletPoints: `• Architected high-performance UI component library serving 2M+ active monthly users.
• Engineered automated Web Vitals optimization pipeline, reducing LCP by 42% and CLS to < 0.05.
• Spearheaded frontend migration to TypeScript and Next.js, boosting team release velocity by 35%.
• Implemented client-side GraphQL caching layer, decreasing server payload size by 60%.`,
    suggestedSkills: ["TypeScript", "React", "Next.js", "Design Systems", "Web Vitals", "GraphQL"]
  };
}

/**
 * Server-side HTTPS call to Gemini 2.5 Flash for Tailored Resume Generation
 * @param {string} jdText - Target job description
 * @param {string} resumeText - User's existing resume/profile text
 */
function callGeminiTailoredResume(jdText, resumeText) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error('GEMINI_API_KEY is not set on server.'));
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const url = new URL(endpoint);

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

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
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
            return reject(new Error(`Gemini API returned status ${res.statusCode}: ${data}`));
          }
          const parsedRes = JSON.parse(data);
          const rawText = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error('Empty response from Gemini API'));
          resolve(JSON.parse(rawText));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
}

function extractResumeDetails(resumeText) {
  const text = (resumeText || '').trim();

  // 1. Email extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // 2. Phone extraction
  const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // 3. Name extraction: look at top 5 non-empty lines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let name = '';
  const ignoreWords = ['resume', 'curriculum', 'vitae', 'cv', 'contact', 'summary', 'profile', 'experience', 'education', 'skills', 'email', 'phone'];

  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    if (!lower.includes('@') && !/\d{4,}/.test(lower) && !ignoreWords.some(w => lower.includes(w))) {
      if (line.length >= 2 && line.length <= 40 && !/[;{}]/.test(line)) {
        name = line;
        break;
      }
    }
  }

  // 4. Location extraction
  const locationMatch = text.match(/([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))/);
  const location = locationMatch ? locationMatch[1] : '';

  // 5. Education extraction
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

  // 6. Skills extraction
  const KNOWN_KEYWORDS = [
    'TypeScript', 'React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Vanilla CSS',
    'Design Systems', 'GraphQL', 'REST APIs', 'Web Vitals', 'Performance',
    'Node', 'Node.js', 'Kubernetes', 'Docker', 'Redis', 'CI/CD', 'Python', 'Git', 'Agile', 'SQL', 'AWS'
  ];
  const textLower = text.toLowerCase();
  const skills = KNOWN_KEYWORDS.filter(kw => textLower.includes(kw.toLowerCase()));

  // 7. Experience bullets extraction
  const bulletLines = lines.filter(l => /^[•\-\*]\s+|^\d+\.\s+/.test(l) || (l.length > 30 && !l.includes('@'))).slice(0, 5);

  return { name, email, phone, location, education, skills, bulletLines };
}

function runFallbackTailoredResume(jdText, resumeText) {
  const details = extractResumeDetails(resumeText);
  
  // Extract job title from JD first line or text
  const titleMatch = jdText ? jdText.split(/\r?\n/)[0].replace(/^(we are looking for a|hiring|role:?|job title:?)\s*/i, '').trim() : '';
  const jobTitle = (titleMatch && titleMatch.length < 50) ? titleMatch : 'Target Role';

  return {
    name: details.name || '',
    jobTitle: jobTitle,
    email: details.email || '',
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

// Create HTTP server

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle Backend API Endpoint: POST /api/optimize-resume
  if (req.method === 'POST' && req.url === '/api/optimize-resume') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { jobTitle, experienceText, skills } = JSON.parse(body || '{}');

        if (GEMINI_API_KEY) {
          try {
            const result = await callGeminiOptimize(jobTitle, experienceText, skills);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            console.warn("Gemini Optimize error on server, using fallback:", err.message);
          }
        }

        const fallback = runServerFallbackOptimization(jobTitle, experienceText);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fallback));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
    });
    return;
  }

  // Handle Backend API Endpoint: POST /api/analyze
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { jdText, resumeText } = JSON.parse(body || '{}');

        if (GEMINI_API_KEY) {
          try {
            const result = await callGeminiApi(jdText, resumeText);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            console.warn("Gemini API call error on server, falling back to heuristic engine:", err.message);
          }
        }

        // Fallback response if GEMINI_API_KEY is not set or request fails
        const fallbackResult = runServerFallbackAnalysis(jdText, resumeText);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fallbackResult));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
    });
    return;
  }

  // Handle Backend API Endpoint: POST /api/generate-tailored-resume
  if (req.method === 'POST' && req.url === '/api/generate-tailored-resume') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { jdText, resumeText } = JSON.parse(body || '{}');

        if (GEMINI_API_KEY) {
          try {
            const result = await callGeminiTailoredResume(jdText, resumeText);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            console.warn('Gemini tailored resume error, using fallback:', err.message);
          }
        }

        const fallback = runFallbackTailoredResume(jdText, resumeText);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fallback));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Serve Static Files

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'text/html';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err2, htmlContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(htmlContent, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`ResuAI Server running at http://localhost:${PORT}`);
  console.log(`GEMINI_API_KEY status: ${GEMINI_API_KEY ? "CONFIGURED (SECURE)" : "NOT SET (Using Server Fallback)"}`);
});
