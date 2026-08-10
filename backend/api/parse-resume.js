/**
 * api/parse-resume.js
 * Gemini-powered Resume Parser — extracts structured fields from raw resume text
 * so users can import their existing resume and edit from there.
 */

'use strict';

const https = require('https');
const { GEMINI_MODELS, setCorsHeaders } = require('./_shared');


function makeGeminiRequest(model, prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    });
    const opts = {
      hostname: 'generativelanguage.googleapis.com', port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const raw = JSON.parse(body).candidates?.[0]?.content?.parts?.[0]?.text || '';
            const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
            const brace = raw.match(/(\{[\s\S]*\})/);
            const str = fence ? fence[1] : (brace ? brace[1] : null);
            if (!str) throw new Error('No JSON in Gemini response');
            resolve(JSON.parse(str));
          } catch (e) { reject(new Error('Gemini parse error: ' + e.message)); }
        } else {
          reject(new Error(`Gemini HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', e => reject(e));
    req.write(postData); req.end();
  });
}

/**
 * Heuristic fallback parser — runs entirely in Node.js without Gemini.
 * Extracts the most common resume patterns cleanly via regex.
 */
function heuristicParse(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Phone
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([^\s,/<>"]+)/i);
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '';

  // GitHub
  const githubMatch = text.match(/github\.com\/([^\s,/<>"]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : '';

  // Portfolio
  const portfolioMatch = text.match(/https?:\/\/(?!linkedin|github)([^\s,<>"]+)/i);
  const portfolio = portfolioMatch ? portfolioMatch[0] : '';

  // Helper check for location or header text
  const isLocationStr = (str) => /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(str.trim()) || /\b(bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|seattle|san francisco|new york|london|india|usa|uk|canada)\b/i.test(str);
  const isHeaderOrSocial = (str) => /^(linkedin|github|portfolio|website|contact|email|phone|address|education|bachelor|master|degree|school|university|coursework|technical expertise|competencies)/i.test(str.trim());

  // Location clean extraction
  const locMatch = text.match(/\b([A-Z][a-zA-Z\s]{2,20},\s*(?:[A-Z]{2}|[A-Za-z]{2,20}))\b/);
  let location = locMatch ? locMatch[1].trim() : '';
  if (location) {
    // Only strip a leading word if it looks like a noise word (e.g. "Located in San Francisco")
    // Do NOT strip the first word of legitimate two-word city names like "San Francisco" or "New York"
    location = location.replace(/^(?:located\s+in|city\s*[:=]|location\s*[:=])\s*/i, '').trim();
  }

  // Name: first non-empty line that isn't contact/location/section heading
  let fullName = '';
  for (const line of lines.slice(0, 6)) {
    if (!line.includes('@') && !/\d{5,}/.test(line) && line.length >= 2 && line.length <= 50
        && !/^(summary|profile|objective|resume|cv|experience|education|skills|certifications|projects)/i.test(line)
        && !isLocationStr(line) && !isHeaderOrSocial(line)) {
      fullName = line;
      break;
    }
  }

  // Job title: line after name IF it's not location / social header / section heading
  let jobTitle = '';
  let foundName = false;
  for (const line of lines.slice(0, 10)) {
    if (foundName && line !== fullName) {
      if (!line.includes('@') && !/^\+?\d/.test(line) && !isLocationStr(line) && !isHeaderOrSocial(line)
          && line.length >= 3 && line.length <= 60
          && !/^(summary|profile|objective|experience|education|skills)/i.test(line)) {
        jobTitle = line;
        break;
      }
    }
    if (line === fullName) foundName = true;
  }

  // Summary
  const summaryMatch = text.match(/(?:summary|profile|objective|about me)[:\s]*\n+([\s\S]{20,400}?)(?:\n{2,}|\n[A-Z])/i);
  const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n+/g, ' ') : '';

  // Skills
  const skillsMatch = text.match(/(?:skills|technologies|tech stack|competencies)[:\s]*\n*([\s\S]{10,500}?)(?:\n{2,}|\n[A-Z])/i);
  const rawSkills = skillsMatch ? skillsMatch[1] : '';
  const skills = rawSkills
    .split(/[,|•\n\/]/)
    .map(s => s.replace(/[^\w\s.#+]/g, '').trim())
    .filter(s => s.length >= 2 && s.length <= 35 && !/^(skills|competencies|tools|technical)$/i.test(s));

  // Education
  const eduMatch = text.match(/(?:education|academic|credentials)[:\s]*\n+([\s\S]{15,600}?)(?:\n{2,}(?:certifications|projects|skills|experience|interests)\b)/i);
  let education = eduMatch ? eduMatch[1].trim() : '';

  // Collect education lines from main text if missing
  if (!education) {
    education = lines.filter(l => /\b(bachelor|master|b\.tech|b\.s\.|m\.s\.|phd|university|institute|college|degree)\b/i.test(l)).join('\n');
  }

  // Experience: block under EXPERIENCE header (excluding education lines)
  const expMatch = text.match(/(?:professional experience|experience|work history|employment)[:\s]*\n+([\s\S]{30,2000}?)(?:\n{2,}(?:education|skills|certifications|projects|achievements|credentials)\b)/i);
  let experience = expMatch ? expMatch[1].trim() : '';
  if (!experience) {
    experience = lines.filter(l => /^[•\-\*]|\b(20\d\d|19\d\d)\b/.test(l) && l.length > 15 && !/\b(bachelor|master|b\.tech|b\.s\.|m\.s\.|coursework)\b/i.test(l)).join('\n');
  } else {
    // Filter out any education lines that spilled into experience
    experience = experience.split(/\n/).filter(l => !/\b(bachelor|master|b\.tech|b\.s\.|m\.s\.|coursework:)\b/i.test(l)).join('\n');
  }

  // Certifications
  const certMatch = text.match(/(?:certifications?|certificates?|licenses?)[:\s]*\n*([\s\S]{10,500}?)(?:\n{2,}(?:projects|skills|education|experience|interests)\b)/i);
  const certifications = certMatch ? certMatch[1].trim() : '';

  // Projects
  const projMatch = text.match(/(?:technical projects|projects?|portfolio)[:\s]*\n+([\s\S]{15,800}?)(?:\n{2,}(?:education|skills|certifications|achievements|experience)\b)/i);
  const projects = projMatch ? projMatch[1].trim() : '';

  // Achievements
  const achMatch = text.match(/(?:achievements?|awards?|honors?)[:\s]*\n*([\s\S]{10,500}?)(?:\n{2,}|\n[A-Z])/i);
  const achievements = achMatch ? achMatch[1].trim() : '';

  return {
    fullName, jobTitle, email, phone, location,
    github, linkedin, portfolio,
    summary, experience, skills,
    education, certifications, projects, achievements
  };
}

module.exports = async function parseResumeHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const b = req.body || {};
    const rawText = (b.resumeText || '').trim();

    if (!rawText || rawText.length < 10) {
      return res.status(400).json({ error: 'Resume text is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ ...heuristicParse(rawText), _source: 'heuristic' });
    }

    const prompt = `You are an expert resume parser. Extract all structured data from the resume text below.

RESUME TEXT:
${rawText.slice(0, 5000)}

Respond STRICTLY with a single valid JSON object — no markdown fences, no extra prose:
{
  "fullName": "<candidate full name>",
  "jobTitle": "<target job title e.g. Senior Software Engineer. MUST be empty string if line is a location or header>",
  "email": "<email address>",
  "phone": "<phone number>",
  "location": "<city, state or country strictly e.g. Bengaluru, India>",
  "linkedin": "<full LinkedIn URL if present, else empty string>",
  "github": "<full GitHub URL if present, else empty string>",
  "portfolio": "<personal website/portfolio URL if present, else empty string>",
  "summary": "<professional summary or objective paragraph>",
  "experience": "<work experience bullet points only. MUST NOT contain education degree or university info>",
  "skills": ["<skill1>", "<skill2>", "<skill3>"],
  "education": "<education degree and university text only>",
  "certifications": "<certifications or licenses text>",
  "projects": "<projects section text>",
  "achievements": "<achievements, awards, or honors text>"
}

Rules:
- Do NOT set jobTitle to "LINKEDIN | GITHUB" or location strings
- Do NOT include candidate name in location string
- Do NOT duplicate degree/university lines in experience section
- If a field is not present, use empty string "" or empty array []`;

    const models = [...new Set(GEMINI_MODELS.filter(Boolean))];
    let result = null;

    for (const model of models) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result) break;
      } catch (e) {
        console.warn(`[parse-resume] ${model} failed:`, e.message);
      }
    }

    if (!result) {
      result = heuristicParse(rawText);
      result._source = 'heuristic';
    } else {
      result._source = 'gemini';
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[parse-resume] Error:', err);
    const b = req.body || {};
    const fallback = heuristicParse(b.resumeText || '');
    return res.status(200).json({ ...fallback, _source: 'heuristic' });
  }
};
