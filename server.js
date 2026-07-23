/**
 * ResuAI // Secure Backend Server & Gemini 2.5 Flash Proxy
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
