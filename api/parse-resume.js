/**
 * api/parse-resume.js
 * Gemini-powered Resume Parser — extracts structured fields from raw resume text
 * so users can import their existing resume and edit from there.
 */

'use strict';

const https = require('https');
const { GEMINI_MODELS } = require('./_shared');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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
 * Extracts the most common resume patterns via regex.
 */
function heuristicParse(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // --- Email ---
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // --- Phone ---
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // --- LinkedIn ---
  const linkedinMatch = text.match(/linkedin\.com\/in\/([^\s,/<>"]+)/i);
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '';

  // --- GitHub ---
  const githubMatch = text.match(/github\.com\/([^\s,/<>"]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : '';

  // --- Portfolio / website ---
  const portfolioMatch = text.match(/https?:\/\/(?!linkedin|github)([^\s,<>"]+)/i);
  const portfolio = portfolioMatch ? portfolioMatch[0] : '';

  // --- Location ---
  const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*(?:[A-Z]{2}|[A-Za-z]+))\b/);
  const location = locationMatch ? locationMatch[0] : '';

  // --- Name: first non-empty line that looks like a name (no @ or digits) ---
  let fullName = '';
  for (const line of lines.slice(0, 6)) {
    if (!line.includes('@') && !/\d{3,}/.test(line) && line.length >= 4 && line.length <= 50
        && !/^(summary|profile|objective|resume|curriculum|experience|education|skills)/i.test(line)) {
      fullName = line;
      break;
    }
  }

  // --- Summary: paragraph after "Summary" / "Profile" / "Objective" ---
  const summaryMatch = text.match(/(?:summary|profile|objective|about me)[:\s]*\n+([\s\S]{40,400}?)(?:\n{2,}|\n[A-Z])/i);
  const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ') : '';

  // --- Education ---
  const educationMatch = text.match(/(?:education|academic)[:\s]*\n+([\s\S]{20,600}?)(?:\n{2,}(?:[A-Z])|\n(?:experience|skills|certifications|projects|achievements|work))/i);
  const education = educationMatch ? educationMatch[1].trim() : '';


  // --- Skills ---
  const skillsMatch = text.match(/(?:skills|technologies|tech stack|technical skills)[:\s]*\n*([\s\S]{10,500}?)(?:\n{2,}|\n[A-Z](?:[a-z]+\s){0,2}[A-Z])/i);
  const rawSkills = skillsMatch ? skillsMatch[1] : '';
  const skills = rawSkills
    .split(/[,|•\n\/]/)
    .map(s => s.replace(/[^\w\s.#+]/g, '').trim())
    .filter(s => s.length >= 2 && s.length <= 35);

  // --- Experience ---
  const expMatch = text.match(/(?:experience|work history|employment)[:\s]*\n+([\s\S]{50,2000}?)(?:\n{2,}(?:education|skills|certifications|projects|achievements)\b)/i);
  const experience = expMatch ? expMatch[1].trim() : '';

  // --- Certifications ---
  const certMatch = text.match(/(?:certifications?|certificates?|licenses?)[:\s]*\n*([\s\S]{10,600}?)(?:\n{2,}|\n[A-Z])/i);
  const certifications = certMatch ? certMatch[1].trim() : '';

  // --- Projects ---
  const projectsMatch = text.match(/(?:projects?|portfolio)[:\s]*\n+([\s\S]{20,1000}?)(?:\n{2,}(?:education|skills|certifications|achievements|experience)\b)/i);
  const projects = projectsMatch ? projectsMatch[1].trim() : '';

  // --- Achievements / Awards ---
  const achievementsMatch = text.match(/(?:achievements?|awards?|honors?|accomplishments?)[:\s]*\n*([\s\S]{10,600}?)(?:\n{2,}|\n[A-Z])/i);
  const achievements = achievementsMatch ? achievementsMatch[1].trim() : '';

  // --- Job title: line right after name ---
  let jobTitle = '';
  let foundName = false;
  for (const line of lines.slice(0, 10)) {
    if (foundName) {
      if (!line.includes('@') && !/^\+/.test(line) && line.length >= 4 && line.length <= 80) {
        jobTitle = line;
        break;
      }
    }
    if (line === fullName) foundName = true;
  }

  return {
    fullName, jobTitle, email, phone, location,
    github, linkedin, portfolio,
    summary, experience, skills,
    education, certifications, projects, achievements
  };
}

module.exports = async function parseResumeHandler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const b = req.body || {};
    const rawText = (b.resumeText || '').trim();

    if (!rawText || rawText.length < 30) {
      return res.status(400).json({ error: 'Resume text is required (minimum 30 characters).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // No API key — use heuristic parser
      return res.status(200).json({ ...heuristicParse(rawText), _source: 'heuristic' });
    }

    const prompt = `You are an expert resume parser. Extract all structured data from the resume text below.

RESUME TEXT:
${rawText.slice(0, 5000)}

Respond STRICTLY with a single valid JSON object — no markdown fences, no extra prose:
{
  "fullName": "<candidate full name>",
  "jobTitle": "<current or target job title from resume header>",
  "email": "<email address>",
  "phone": "<phone number>",
  "location": "<city, state or country>",
  "linkedin": "<full LinkedIn URL if present, else empty string>",
  "github": "<full GitHub URL if present, else empty string>",
  "portfolio": "<personal website/portfolio URL if present, else empty string>",
  "summary": "<professional summary or objective paragraph>",
  "experience": "<all work experience bullet points, preserve formatting, use \\n between roles>",
  "skills": ["<skill1>", "<skill2>", "<skill3>"],
  "education": "<education section text>",
  "certifications": "<certifications or licenses text>",
  "projects": "<projects section text>",
  "achievements": "<achievements, awards, or honors text>"
}

Rules:
- If a field is not present in the resume, use an empty string "" or empty array []
- For skills, return individual technology names as an array, not a long sentence
- Preserve line breaks in experience/education/projects using \\n
- Do NOT invent or hallucinate any data not present in the resume`;

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
