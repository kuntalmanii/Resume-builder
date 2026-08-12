const https = require('https');
const { GEMINI_MODELS, sanitizeInputText, setCorsHeaders } = require('./_shared');

function sendResponse(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function callGeminiChat(apiKey, prompt, modelIndex = 0) {
  return new Promise((resolve, reject) => {
    if (modelIndex >= GEMINI_MODELS.length) {
      return reject(new Error('All Gemini AI models failed'));
    }

    const model = GEMINI_MODELS[modelIndex];
    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
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

    const req = https.request(options, (geminiRes) => {
      let data = '';
      geminiRes.on('data', chunk => { data += chunk; });
      geminiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resolve(text);
          } else {
            console.warn(`Model ${model} returned empty response for ats-chat, trying next model...`);
            callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
          }
        } catch (e) {
          callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`Model ${model} network error for ats-chat:`, err.message);
      callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
    });

    req.write(postData);
    req.end();
  });
}

function runFallbackChatResponse(userMessage, jobTitle, jobDescription, resumeText, missingKeywords = [], matchedKeywords = [], currentScore = '') {
  const query = userMessage.toLowerCase();

  if (query.includes('lose points') || query.includes('why') || query.includes('gap') || query.includes('score') || query.includes('missing')) {
    const missingStr = (Array.isArray(missingKeywords) && missingKeywords.length > 0)
      ? missingKeywords.join(', ')
      : 'Key skills mentioned in the job description';

    return `<b>Simple Resume Score Breakdown:</b><br>
    Your current match score is <b>${currentScore ? currentScore + '%' : 'Pending'}</b>.<br><br>
    <b>Main Missing Keywords:</b><br>
    Your resume currently does not mention these key terms from the job posting: <b>${missingStr}</b>.<br><br>
    <b>How to Improve:</b><br>
    1. Add 1 or 2 of these skills (such as <b>${missingKeywords.slice(0, 3).join(', ') || 'the missing skills'}</b>) directly into your past job descriptions.<br>
    2. Add clear results or numbers (for example: <i>"Improved project speed by 30% using ${missingKeywords[0] || 'the target skill'}"</i>).`;
  }

  if (query.includes('workday') || query.includes('greenhouse') || query.includes('lever') || query.includes('taleo')) {
    return `<b>Easy Tips to Pass Resume Scanners:</b><br>
    • <b>Use Exact Words</b>: Match the exact job titles and skills listed in the job description.<br>
    • <b>Clear Headings</b>: Use simple, standard headings like <i>Work Experience</i>, <i>Skills</i>, and <i>Education</i>.<br>
    • <b>Keep Format Simple</b>: Avoid tables, columns, text boxes, or graphics so automated scanners can read your text easily.`;
  }

  if (query.includes('add') || query.includes('how to') || query.includes('bullet')) {
    const targetSkill = (Array.isArray(missingKeywords) && missingKeywords.length > 0) ? missingKeywords[0] : 'Required Skill';
    const topic = userMessage.replace(/how to add|how do i add|add|to my resume/gi, '').trim() || targetSkill;
    return `<b>Simple Example Bullet Point for "${topic}":</b><br>
    <i>"Used <b>${topic}</b> to design and deliver core projects, improving team productivity and product quality."</i>`;
  }

  const missingInfo = (Array.isArray(missingKeywords) && missingKeywords.length > 0)
    ? `<br><br><b>Key Skills to Add:</b> <i>${missingKeywords.join(', ')}</i>`
    : '';

  return `<b>Easy Career Coach Tip:</b><br>
  For the <b>${jobTitle || 'Target Position'}</b> role (Current Match: <b>${currentScore ? currentScore + '%' : 'Pending'}</b>), write your experience bullets using this simple structure: <b>Action Word + What You Built/Did + Measurable Result</b>.${missingInfo}`;
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { status: 'OK' });
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      if (req.readableEnded || req.complete) {
        body = {};
      } else {
        try {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
            });
            req.on('error', () => resolve({}));
          });
        } catch (e) { body = {}; }
      }
    }

    const { userMessage, jobTitle, jobDescription, resumeText, currentScore, missingKeywords, matchedKeywords } = body || {};
    const cleanMsg = sanitizeInputText(userMessage);

    if (!cleanMsg) {
      return sendResponse(res, 400, { error: 'Message content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText, missingKeywords, matchedKeywords, currentScore);
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

    const missingStr = Array.isArray(missingKeywords) && missingKeywords.length ? missingKeywords.join(', ') : 'None detected';
    const matchedStr = Array.isArray(matchedKeywords) && matchedKeywords.length ? matchedKeywords.join(', ') : 'None detected';

    const prompt = `You are a supportive, friendly ATS Career Coach helping job applicants improve their resumes.

CRITICAL TONE REQUIREMENT:
- Write in simple, clear, everyday PLAIN ENGLISH that anyone can easily understand.
- DO NOT use complex technical jargon, overly dense engineering terms, or complicated corporate buzzwords.
- Explain all advice plainly, like a supportive and clear mentor.

Context from the candidate's ATS scan:
Target Job Title: "${jobTitle || 'Not specified'}"
Current Match Score: "${currentScore ? currentScore + '%' : 'Pending'}"
Matched Keywords: "${matchedStr}"
Missing Keywords: "${missingStr}"
Job Description context: "${(jobDescription || '').slice(0, 1000)}"
Candidate Resume context: "${(resumeText || '').slice(0, 1000)}"

User Question: "${cleanMsg}"

Instructions:
- Answer directly in simple, clear language based on the scan results above.
- Specifically list their missing keywords (${missingStr}) in plain terms when discussing improvements.
- Provide simple, easy-to-understand bullet point examples showing how to include missing skills.
- Use clean HTML formatting (<b>, <i>, <br>, <ul>, <li>).`;

    try {
      const geminiReply = await callGeminiChat(apiKey, prompt);
      const cleanReply = geminiReply.replace(/```html|```/g, '').trim();
      return sendResponse(res, 200, { reply: cleanReply, source: 'gemini' });
    } catch (aiErr) {
      console.warn('Gemini chat API call failed, using fallback:', aiErr.message);
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText, missingKeywords, matchedKeywords, currentScore);
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

  } catch (error) {
    console.error('ATS Chat error:', error.message);
    return sendResponse(res, 500, { error: 'Failed to process chat request' });
  }
};
